import test from "node:test";
import assert from "node:assert/strict";
import {
  splitAxis,
  square,
  keyOf,
  centerOf,
  distance,
  generateChunk,
  hashChunk,
  createWorld,
  movePlayer,
  settings,
  drain,
  pump,
  plan,
  verifySurface,
  verifySchedule,
  worldBlock,
} from "../lib/labs/voxel-chunk-streaming.ts";
test("stream62 signed world coordinates split with floor and reconstruct", () => {
  for (const [x, chunk, local] of [
    [-16.5, -2, 15.5],
    [-16, -1, 0],
    [-0.5, -1, 15.5],
    [0, 0, 0],
    [15.5, 0, 15.5],
    [16, 1, 0],
    [512, 32, 0],
  ]) {
    assert.deepEqual(splitAxis(x), { chunk, local, block: Math.floor(local) });
  }
  for (let i = -1024; i <= 1024; i++) {
    const x = i / 2,
      s = splitAxis(x);
    assert.equal(s.chunk * 16 + s.local, x);
    assert.ok(s.local >= 0 && s.local < 16);
  }
  assert.equal(square({ x: -1, z: 0 }, 2).length, 25);
  for (const x of [NaN, Infinity, -513, 513]) assert.throws(() => splitAxis(x));
});
test("stream62 regeneration matches native fixture and never reuses a discarded buffer", () => {
  const a = generateChunk({ x: -1, z: 0 }),
    b = generateChunk({ x: -1, z: 0 });
  assert.deepEqual(a, b);
  assert.notEqual(a, b);
  assert.equal(a.filter((v) => v !== 0).length, 1024);
  assert.equal(hashChunk(a), 3845785541);
  assert.equal(hashChunk(a), hashChunk(b));
  a.fill(0);
  assert.notEqual(hashChunk(a), hashChunk(b));
});
test("stream62 queue priority, hard budgets, resident cap and idle work", () => {
  const w = createWorld();
  assert.equal(w.chunks.size, 1);
  assert.equal(w.pending.length, 8);
  pump(w);
  assert.equal(w.lastJobs, 2);
  assert.ok(w.lastMeshes <= 10);
  verifySchedule(w);
  settings(w, 1, 1);
  verifySchedule(w);
  settings(w, 1, 2);
  drain(w);
  assert.equal(w.chunks.size, 9);
  assert.equal(w.pending.length, 0);
  assert.equal(verifySurface(w), 5376);
  const before = w.rebuilds;
  pump(w);
  assert.equal(w.rebuilds, before);
  assert.equal(w.lastJobs, 0);
  movePlayer(w, 200, -200);
  assert.equal(w.pending[0].kind, "unload");
  const sorted = plan(w);
  assert.deepEqual(w.pending, sorted);
  drain(w);
  assert.equal(w.chunks.size, 9);
  assert.ok([...w.chunks.values()].every((e) => distance(e.key, centerOf(w.player)) <= 1));
  verifySurface(w);
});
test("stream62 hysteresis avoids regenerating on border reversal and cancels stale teleport jobs", () => {
  const w = createWorld();
  drain(w);
  const loads = w.loads,
    origin = w.chunks.get("0,0").blocks;
  movePlayer(w, 16.5, 8);
  drain(w);
  const after = w.loads;
  assert.equal(after, loads + 3);
  movePlayer(w, 15.5, 8);
  drain(w);
  assert.equal(w.loads, after);
  assert.equal(w.chunks.get("0,0").blocks, origin);
  movePlayer(w, 200, -200);
  assert.ok(w.pending.some((j) => j.key.x > 10));
  movePlayer(w, -0.5, -0.5);
  assert.ok(w.cancelled > 0);
  assert.ok(
    w.pending
      .filter((j) => j.kind === "load")
      .every((j) => distance(j.key, centerOf(w.player)) <= 1),
  );
  drain(w);
  verifySchedule(w);
  verifySurface(w);
});
test("stream62 loaded neighbor hides shared opaque faces; unload restores frontier atomically", () => {
  const w = createWorld();
  drain(w);
  assert.equal(worldBlock(w, -1, 3, 0), generateChunk({ x: -1, z: 0 })[15 + 16 * 16 * 3]);
  assert.equal(worldBlock(w, 999, 3, 0), 0);
  assert.equal(worldBlock(w, 0, -1, 0), 0);
  verifySurface(w);
  movePlayer(w, 48, 8);
  for (let i = 0; i < 30 && w.pending.length; i++) {
    pump(w);
    verifySchedule(w);
    verifySurface(w);
  }
  assert.equal(w.pending.length, 0);
});
test("stream62 only topology neighbors remesh; camera/player within one chunk does not", () => {
  const w = createWorld();
  drain(w);
  const builds = w.rebuilds,
    rev = new Map([...w.chunks].map(([k, e]) => [k, e.revision]));
  movePlayer(w, 9, 9);
  assert.equal(w.rebuilds, builds);
  pump(w);
  assert.equal(w.lastMeshes, 0);
  movePlayer(w, 16.5, 9);
  pump(w);
  assert.ok(w.lastMeshes <= 10);
  assert.equal(w.chunks.get("-1,-1").revision, rev.get("-1,-1"));
});
test("stream62 long bounded journey stays under 49 resident and settles after shrink", () => {
  const w = createWorld();
  settings(w, 2, 1);
  for (const p of [
    [8, 8],
    [40, 8],
    [-20, -8],
    [180, -180],
    [-200, 200],
    [512, 512],
    [-512, -512],
    [8, 8],
  ]) {
    movePlayer(w, ...p);
    drain(w);
    verifySchedule(w);
    assert.ok(w.chunks.size <= 49);
    assert.equal(w.pending.length, 0);
  }
  settings(w, 1, 2);
  drain(w);
  assert.ok(w.chunks.size <= 25);
  verifySurface(w);
});
test("stream62 teaching stages stay progressive and invalid requests preserve state", () => {
  const one = createWorld(1);
  movePlayer(one, -4, 20);
  assert.ok(one.player.x >= 0 && one.player.z < 16);
  assert.equal(one.chunks.size, 1);
  const negative = createWorld(2);
  movePlayer(negative, -0.5, -0.5);
  assert.equal(negative.chunks.size, 1);
  assert.equal(createWorld(3).chunks.size, 9);
  assert.equal(createWorld(4).chunks.size, 9);
  const w = createWorld(),
    copy = JSON.stringify(w.player);
  assert.throws(() => movePlayer(w, NaN, 0));
  assert.equal(JSON.stringify(w.player), copy);
  assert.throws(() => settings(w, 3, 2));
  assert.throws(() => settings(w, 1, 0));
  assert.throws(() => drain(w, 1000));
  assert.throws(() => createWorld(11));
});
