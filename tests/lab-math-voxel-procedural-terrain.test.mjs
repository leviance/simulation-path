import test from "node:test";
import assert from "node:assert/strict";
import {
  latticeHash,
  latticeValue,
  smooth,
  blend,
  valueNoise,
  terrainSignal,
  heightAt,
  materialAt,
  generateTerrain,
  defaultConfig as config,
  validateConfig,
  createTerrain,
  applyConfig,
  verifyColumns,
} from "../lib/labs/voxel-procedural-terrain.ts";
import {
  hashChunk,
  pump,
  drain,
  movePlayer,
  verifySurface,
  verifySchedule,
  worldBlock,
} from "../lib/labs/voxel-chunk-streaming.ts";
const near = (a, b, epsilon = 1e-12) => assert.ok(Math.abs(a - b) <= epsilon, `${a} != ${b}`);
test("terrain63 unsigned hash matches native fixtures including signed coordinates", () => {
  assert.equal(latticeHash(0, 0, 42), 388445122);
  assert.equal(latticeHash(-1, 0, 42), 4012630698);
  assert.equal(latticeHash(17, -23, 65535), 823775260);
  for (const p of [
    [NaN, 0, 42],
    [0.5, 0, 42],
    [0, 0, -1],
    [0, 0, 65536],
  ])
    assert.throws(() => latticeHash(...p));
});
test("terrain63 smoothstep and bilinear value interpolation preserve lattice corners and C1 joins", () => {
  assert.equal(smooth(0), 0);
  assert.equal(smooth(1), 1);
  assert.equal(smooth(0.5), 0.5);
  assert.equal(blend(-1, 1, 0.25), -0.5);
  for (let z = -3; z <= 3; z++)
    for (let x = -3; x <= 3; x++) near(valueNoise(x, z, 42), latticeValue(x, z, 42));
  near(valueNoise(-0.25, 0.5, 42), -0.27946993972686357);
  const e = 1e-5;
  for (const boundary of [-2, -1, 0, 1, 2]) {
    const a = valueNoise(boundary - e, 0.37, 42),
      b = valueNoise(boundary, 0.37, 42),
      c = valueNoise(boundary + e, 0.37, 42);
    near((b - a) / e, (c - b) / e, 0.0002);
  }
  for (const x of [NaN, Infinity, 2049]) assert.throws(() => valueNoise(x, 0, 42));
});
test("terrain63 octave normalization stays bounded for every supported scale/octave", () => {
  for (const scale of [16, 32, 64])
    for (const octaves of [1, 2, 3, 4]) {
      const c = { ...config, scale, octaves };
      for (let z = -128; z <= 128; z += 17)
        for (let x = -128; x <= 128; x += 13) {
          const n = terrainSignal(x, z, c),
            h = heightAt(x, z, c);
          assert.ok(n >= -1 && n <= 1);
          assert.ok(Number.isInteger(h) && h >= 2 && h <= 14);
        }
      if (octaves === 1) near(terrainSignal(11, -7, c), valueNoise(11 / scale, -7 / scale, c.seed));
    }
});
test("terrain63 progressive stages start flat, then analytic, hash, smooth, octave and material", () => {
  assert.equal(heightAt(20, -17, { ...config, stage: 1 }), 4);
  near(terrainSignal(20, -17, { ...config, stage: 2 }), Math.sin(20 / 16) * Math.cos(-17 / 16));
  near(terrainSignal(-1, 0, { ...config, stage: 3 }), latticeValue(-1, 0, 42));
  near(terrainSignal(20, -17, { ...config, stage: 4 }), valueNoise(20 / 32, -17 / 32, 42));
  assert.equal(materialAt(3, 4, { ...config, stage: 5 }), 3);
  assert.equal(materialAt(3, 4, config), 1);
});
test("terrain63 chunk checksums match native fixtures and generation has no shared buffer or call-order state", () => {
  for (const [key, hash] of [
    [{ x: 0, z: 0 }, 4263195062],
    [{ x: -1, z: 0 }, 2291264103],
    [{ x: 1, z: -1 }, 2892146174],
    [{ x: -64, z: 64 }, 3054277751],
  ]) {
    const a = generateTerrain(key, config);
    generateTerrain({ x: 11, z: -7 }, { ...config, seed: 43 });
    const b = generateTerrain(key, config);
    assert.notEqual(a, b);
    assert.deepEqual(a, b);
    assert.equal(hashChunk(a), hash);
    assert.equal(verifyColumns(key, a, config), 0);
  }
});
test("terrain63 monolithic world fill equals independently generated neighboring chunks at positive and negative seams", () => {
  // A world-space loop derives the address independently of generateTerrain's local loop.
  const chunks = new Map();
  for (let z = -1; z <= 1; z++)
    for (let x = -1; x <= 1; x++) chunks.set(`${x},${z}`, generateTerrain({ x, z }, config));
  for (let wz = -16; wz < 32; wz++)
    for (let wx = -16; wx < 32; wx++) {
      const cx = Math.floor(wx / 16),
        cz = Math.floor(wz / 16),
        h = heightAt(wx, wz, config);
      const data = chunks.get(`${cx},${cz}`);
      for (let y = 0; y < 16; y++)
        assert.equal(data[wx - cx * 16 + 16 * (wz - cz * 16 + 16 * y)], materialAt(y, h, config));
    }
});
test("terrain63 same world sample through two chunk halos agrees, adjacent columns need not have equal heights", () => {
  const from = (cx, localX, z) => terrainSignal(cx * 16 + localX, z, config);
  for (const boundary of [-32, -16, 0, 16, 32])
    for (const z of [-17, 0, 13]) {
      near(from(boundary / 16 - 1, 16, z), from(boundary / 16, 0, z));
      near(
        terrainSignal(boundary - 1e-6, z, config),
        terrainSignal(boundary + 1e-6, z, config),
        1e-5,
      );
    }
  let differences = 0;
  for (let z = -32; z < 32; z++)
    if (heightAt(15, z, config) !== heightAt(16, z, config)) differences++;
  assert.ok(differences > 0);
});
test("terrain63 column oracle detects local-coordinate seams, changed seed and missing top cells", () => {
  const key = { x: -1, z: 1 },
    good = generateTerrain(key, config);
  assert.equal(verifyColumns(key, good, config), 0);
  assert.ok(verifyColumns(key, generateTerrain({ x: 0, z: 0 }, config), config) > 0);
  assert.ok(verifyColumns(key, generateTerrain(key, { ...config, seed: 43 }), config) > 0);
  const bad = good.slice();
  bad[16 * (16 * (heightAt(-16, 16, config) - 1))] = 0;
  assert.ok(verifyColumns(key, bad, config) > 0);
});
test("terrain63 layers have no holes, top uses H-1 and tall columns remain stone", () => {
  for (const height of [2, 4, 10, 11, 14]) {
    assert.equal(materialAt(-1, height, config), 0);
    assert.equal(materialAt(height, height, config), 0);
    assert.equal(materialAt(0, height, config), 3);
    for (let y = 0; y < height; y++) assert.ok(materialAt(y, height, config) > 0);
    assert.equal(materialAt(height - 1, height, config), height < 11 ? 1 : 3);
  }
});
test("terrain63 streaming retains work bounds, culls shared faces and restores frontier", () => {
  const { world } = createTerrain();
  assert.equal(world.chunks.size, 1);
  assert.equal(world.pending.length, 8);
  verifySurface(world);
  for (let i = 0; world.pending.length && i < 8; i++) {
    pump(world);
    verifySchedule(world);
    verifySurface(world);
  }
  assert.equal(world.chunks.size, 9);
  assert.equal(world.pending.length, 0);
  assert.equal(worldBlock(world, -1, 0, 0), 3);
  const before = world.rebuilds;
  pump(world);
  movePlayer(world, 9, 9);
  assert.equal(world.rebuilds, before);
});
test("terrain63 changing configuration replaces cache and old queue atomically; next jobs share the new snapshot", () => {
  const state = createTerrain();
  drain(state.world);
  movePlayer(state.world, -20, 40);
  const next = { ...config, seed: 43, octaves: 4 };
  applyConfig(state, next);
  next.seed = 900;
  assert.equal(state.generation, 2);
  assert.equal(state.world.chunks.size, 1);
  assert.equal(state.world.lastJobs, 0);
  assert.equal(state.world.rebuilds, 1);
  assert.ok(state.world.chunks.has("-2,2"));
  assert.equal(state.world.pending.length, 8);
  drain(state.world);
  for (const entry of state.world.chunks.values())
    assert.deepEqual(entry.blocks, generateTerrain(entry.key, { ...config, seed: 43, octaves: 4 }));
  verifySurface(state.world);
});
test("terrain63 unload and return regenerates byte-identical columns without keeping edits", () => {
  const { world } = createTerrain();
  drain(world);
  const original = world.chunks.get("0,0").blocks.slice();
  movePlayer(world, 200, -200);
  drain(world);
  assert.ok(!world.chunks.has("0,0"));
  movePlayer(world, 8, 8);
  drain(world);
  assert.deepEqual(world.chunks.get("0,0").blocks, original);
  verifySurface(world);
});
test("terrain63 invalid parameters are rejected before any resident state changes", () => {
  const state = createTerrain(),
    chunks = state.world.chunks,
    queue = state.world.pending,
    generation = state.generation;
  for (const bad of [
    { seed: -1 },
    { seed: NaN },
    { seed: 65536 },
    { scale: 8 },
    { scale: 16.5 },
    { octaves: 0 },
    { octaves: 5 },
    { stage: 10 },
  ]) {
    const next = { ...config, ...bad };
    assert.throws(() => validateConfig(next));
    assert.throws(() => applyConfig(state, next));
    assert.equal(state.world.chunks, chunks);
    assert.equal(state.world.pending, queue);
    assert.equal(state.generation, generation);
  }
  assert.throws(() => generateTerrain({ x: 65, z: 0 }, config));
  assert.throws(() => heightAt(NaN, 0, config));
});
test("terrain63 surface oracle detects duplicate and missing terrain quads", () => {
  const { world } = createTerrain();
  const entry = world.chunks.get("0,0");
  const quad = entry.quads[0];
  entry.quads.push(quad);
  assert.throws(() => verifySurface(world), /surface mismatch/);
  entry.quads.pop();
  entry.quads.shift();
  assert.throws(() => verifySurface(world), /surface mismatch/);
  entry.quads.unshift(quad);
  verifySurface(world);
});
