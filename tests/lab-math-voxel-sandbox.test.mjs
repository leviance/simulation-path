import test from "node:test";
import assert from "node:assert/strict";
import {
  createSandbox,
  makeRay,
  cameraRay,
  clipBox,
  traceWorld,
  residentBlock,
  editRay,
  writeCell,
  flushEdits,
  history,
  baseBlock,
  effectiveBlock,
  serialize,
  importSnapshot,
  parseSnapshot,
} from "../lib/labs/voxel-sandbox.ts";
import {
  drain,
  pump,
  movePlayer,
  verifySurface,
  verifySchedule,
  sceneMesh,
  streamingCamera,
  project,
  hashChunk,
} from "../lib/labs/voxel-chunk-streaming.ts";
const topRay = (x = 0.5, z = 0.5) => makeRay([x, 20, z], [0, -1, 0]);
const settle = (state) => {
  drain(state.world);
  flushEdits(state);
};
function oracle(world, ray) {
  let best = Infinity,
    hit = null,
    blocked = false;
  for (const e of world.chunks.values())
    for (let y = 0; y < 16; y++)
      for (let z = 0; z < 16; z++)
        for (let x = 0; x < 16; x++) {
          if (!e.blocks[x + 16 * (z + 16 * y)]) continue;
          const cell = [e.key.x * 16 + x, y, e.key.z * 16 + z],
            span = clipBox(
              ray,
              cell,
              cell.map((v) => v + 1),
            );
          if (span && span.enter < best) {
            best = span.enter;
            hit = { cell, normal: span.normal, distance: best };
          }
        }
  const cx = Math.floor(ray.origin[0] / 16),
    cz = Math.floor(ray.origin[2] / 16);
  for (let z = cz - 7; z <= cz + 7; z++)
    for (let x = cx - 7; x <= cx + 7; x++)
      if (!world.chunks.has(`${x},${z}`)) {
        const span = clipBox(ray, [x * 16, 0, z * 16], [x * 16 + 16, 16, z * 16 + 16]);
        if (span && span.enter <= best + 1e-9) blocked = true;
      }
  return { hit: blocked ? null : hit, blocked };
}
test("sandbox64 retains unedited terrain fixtures and starts from a visible bounded world", () => {
  const state = createSandbox();
  assert.equal(state.world.chunks.size, 1);
  assert.equal(state.world.pending.length, 8);
  assert.equal(hashChunk(state.world.chunks.get("0,0").blocks), 4263195062);
  assert.ok(sceneMesh(state.world).length > 0);
  assert.equal(state.edits.size, 0);
});
test("sandbox64 camera inverse accounts for player offset, zoom and pixel centers", () => {
  for (const player of [
    { x: 8, z: 8 },
    { x: -20.5, z: 33 },
    { x: 512, z: -512 },
  ])
    for (const zoom of [0.5, 1, 1.5])
      for (const yaw of [-1, 0.7, 2]) {
        const camera = { ...streamingCamera, scale: 2, yaw, zoom };
        for (const [x, y] of [
          [0, 0],
          [160, 120],
          [319, 239],
        ]) {
          const ray = cameraRay(camera, player, x, y),
            p = ray.origin.map((v, i) => v + ray.direction[i] * 20);
          const screen = project([p[0] - player.x + 8, p[1], p[2] - player.z + 8], camera);
          assert.ok(Math.abs(screen.x - x - 0.5) < 1e-9);
          assert.ok(Math.abs(screen.y - y - 0.5) < 1e-9);
        }
      }
});
test("sandbox64 world DDA agrees with cell AABB oracle at signed seams and varied camera rays", () => {
  const state = createSandbox();
  settle(state);
  const rays = [
    topRay(-15.5, -0.5),
    topRay(-0.5, -0.5),
    topRay(0.5, 0.5),
    topRay(15.5, 8.5),
    topRay(16.5, 8.5),
    makeRay([-15, 14, -15], [1, -0.4, 1]),
    makeRay([8, 8, 8], [1, 0, 0]),
  ];
  for (const [x, y] of [
    [160, 120],
    [170, 112],
    [159, 136],
    [100, 70],
  ])
    rays.push(cameraRay({ ...streamingCamera, scale: 2 }, state.world.player, x, y));
  for (const ray of rays) {
    const actual = traceWorld(state.world, ray),
      expected = oracle(state.world, ray);
    assert.equal(actual.blocked, expected.blocked);
    assert.deepEqual(actual.hit?.cell, expected.hit?.cell);
    if (actual.hit) {
      assert.deepEqual(actual.hit.normal, expected.hit.normal);
      assert.ok(Math.abs(actual.hit.distance - expected.hit.distance) < 1e-9);
    }
    assert.ok(actual.path.length <= 256);
  }
});
test("sandbox64 Unknown blocks picking instead of becoming Air or loading itself", () => {
  const state = createSandbox(),
    size = state.world.chunks.size;
  const trace = traceWorld(state.world, topRay(-0.5, 0.5));
  assert.equal(trace.blocked, true);
  assert.equal(trace.hit, null);
  assert.equal(state.world.chunks.size, size);
  assert.equal(residentBlock(state.world, [-1, 1, 0]), -1);
  assert.equal(editRay(state, topRay(-0.5, 0.5), false), false);
});
test("sandbox64 axis, signed zero, inside, tie and reach cases terminate without grazing selection", () => {
  const state = createSandbox();
  settle(state);
  for (const entry of state.world.chunks.values()) entry.blocks.fill(0);
  writeCell(state, [0, 2, 0], 3);
  writeCell(state, [1, 2, 1], 3);
  const hit = traceWorld(state.world, makeRay([-1, 2.5, -1], [1, 0, 1]));
  assert.deepEqual(hit.hit.cell, [0, 2, 0]);
  assert.deepEqual(hit.hit.normal, [-1, 0, 0]);
  const inside = traceWorld(state.world, makeRay([0.5, 2.5, 0.5], [0, -0, 1]));
  assert.equal(inside.hit.distance, 0);
  assert.deepEqual(inside.hit.normal, [0, 0, 0]);
  assert.equal(editRay(state, makeRay([0.5, 2.5, 0.5], [0, 0, 1]), true), false);
  assert.equal(traceWorld(state.world, makeRay([0.5, 2.5, -1], [0, 0, 1]), 0.5).hit, null);
  assert.equal(clipBox(makeRay([-1, 16, 0], [1, 0, 0]), [0, 0, 0], [1, 16, 1]), null);
});
test("sandbox64 each edit re-queries, mutates one cell and refuses stale/invalid placement", () => {
  const state = createSandbox();
  settle(state);
  const ray = topRay(0.5, 0.5),
    first = traceWorld(state.world, ray).hit.cell;
  assert.equal(editRay(state, ray, false), true);
  const second = traceWorld(state.world, ray).hit.cell;
  assert.equal(second[1], first[1] - 1);
  assert.equal(state.edits.size, 1);
  assert.equal(editRay(state, ray, true, 3), true);
  assert.equal(residentBlock(state.world, first), 3);
  assert.equal(state.edits.size, 1);
  assert.equal(editRay(state, ray, true, 1), true);
  assert.equal(state.edits.size, 2);
  assert.throws(() => editRay(state, ray, true, 0));
  flushEdits(state);
  verifySurface(state.world);
});
test("sandbox64 Air tombstones survive unload/return and restoring base removes the delta", () => {
  const state = createSandbox();
  settle(state);
  const cell = traceWorld(state.world, topRay()).hit.cell,
    base = baseBlock(state.config, cell);
  writeCell(state, cell, 0);
  flushEdits(state);
  movePlayer(state.world, 200, -200);
  settle(state);
  assert.ok(!state.world.chunks.has("0,0"));
  movePlayer(state.world, 8, 8);
  settle(state);
  assert.equal(residentBlock(state.world, cell), 0);
  writeCell(state, cell, base);
  assert.equal(state.edits.size, 0);
  flushEdits(state);
  verifySurface(state.world);
});
test("sandbox64 local remeshing coalesces cells and preserves historical streaming counters", () => {
  const state = createSandbox();
  settle(state);
  const historical = state.world.lastMeshes;
  writeCell(state, [8, 15, 8], 3);
  writeCell(state, [9, 15, 8], 3);
  assert.equal(flushEdits(state), 1);
  assert.equal(flushEdits(state), 0);
  writeCell(state, [0, 15, 0], 3);
  assert.equal(flushEdits(state), 3);
  assert.equal(state.world.lastMeshes, historical);
  verifySchedule(state.world);
  verifySurface(state.world);
});
test("sandbox64 undo can modify an unloaded cell without loading it; redo branch is cleared", () => {
  const state = createSandbox();
  settle(state);
  writeCell(state, [0, 0, 0], 0);
  flushEdits(state);
  movePlayer(state.world, 200, -200);
  settle(state);
  const count = state.world.chunks.size;
  assert.equal(history(state), true);
  assert.equal(state.edits.size, 0);
  assert.equal(state.world.chunks.size, count);
  assert.equal(history(state, true), true);
  assert.equal(effectiveBlock(state, [0, 0, 0]), 0);
  history(state);
  writeCell(state, [1, 0, 0], 0);
  assert.equal(state.redo.length, 0);
  for (let x = 2; x < 42; x++) writeCell(state, [x, 15, 0], 3);
  assert.equal(state.undo.length, 32);
});
test("sandbox64 delta cap is atomic and restoring terrain frees a slot", () => {
  const state = createSandbox();
  for (let x = 0; x < 512; x++) assert.equal(writeCell(state, [x, 15, 0], 3), true);
  const before = serialize(state);
  assert.equal(writeCell(state, [512, 15, 0], 3), false);
  assert.equal(serialize(state), before);
  assert.equal(writeCell(state, [0, 15, 0], 0), true);
  assert.equal(state.edits.size, 511);
  assert.equal(writeCell(state, [512, 15, 0], 3), true);
  assert.equal(state.edits.size, 512);
});
const fixture = "VXL1 42 32 3\n3\n-1 0 -1 0\n0 0 0 0\n16 14 0 3\n";
test("sandbox64 places across a chunk boundary and rejects the top-of-tier target", () => {
  const state = createSandbox();
  settle(state);
  writeCell(state, [15, 14, 8], 3);
  flushEdits(state);
  assert.equal(editRay(state, makeRay([20.5, 14.5, 8.5], [-1, 0, 0]), true, 2), true);
  assert.equal(residentBlock(state.world, [16, 14, 8]), 2);
  assert.equal(flushEdits(state), 2);
  verifySurface(state.world);
  writeCell(state, [8, 15, 8], 3);
  const before = serialize(state);
  assert.equal(editRay(state, topRay(8.5, 8.5), true, 1), false);
  assert.equal(serialize(state), before);
});
test("sandbox64 canonical VXL1 matches native byte fixture and rehydrates overlays before meshing", () => {
  const state = createSandbox();
  settle(state);
  writeCell(state, [16, 14, 0], 3);
  writeCell(state, [0, 0, 0], 0);
  writeCell(state, [-1, 0, -1], 0);
  assert.equal(serialize(state), fixture);
  const imported = importSnapshot(state, fixture);
  assert.equal(imported.world.chunks.size, 1);
  assert.equal(imported.undo.length, 0);
  assert.equal(imported.redo.length, 0);
  assert.equal(serialize(imported), fixture);
  settle(imported);
  verifySurface(imported.world);
  for (const cell of [
    [-1, 0, -1],
    [0, 0, 0],
    [16, 14, 0],
  ])
    assert.equal(residentBlock(imported.world, cell), effectiveBlock(imported, cell));
});
test("sandbox64 malformed snapshots never mutate the active world", () => {
  const state = createSandbox(),
    entry = state.world.chunks.get("0,0"),
    before = hashChunk(entry.blocks);
  for (const text of [
    "",
    "VXL2 42 32 3\n0",
    "VXL1 42 8 3\n0",
    "VXL1 42 32 3\n513",
    "VXL1 42 32 3\n1\n0 16 0 0",
    "VXL1 42 32 3\n1\n0 0 0 3",
    "VXL1 42 32 3\n2\n0 0 0 0\n0 0 0 0",
    fixture + "extra",
    fixture.replace("42", "NaN"),
    fixture.replace("42", "1e2"),
    fixture.replace("42", "+42"),
    fixture.replace("42", "99999999999999999999"),
    "a".repeat(32769),
    fixture + "é",
  ]) {
    assert.throws(() => importSnapshot(state, text));
    assert.equal(state.world.chunks.get("0,0"), entry);
    assert.equal(hashChunk(entry.blocks), before);
  }
  assert.equal(parseSnapshot(fixture.replaceAll("\n", "\r\n")).deltas.length, 3);
});
test("sandbox64 checkpoints retain deliberate before/after behavior and idle does not remesh", () => {
  const state = createSandbox(4);
  settle(state);
  writeCell(state, [0, 0, 0], 0);
  assert.equal(state.edits.size, 0);
  movePlayer(state.world, 200, -200);
  settle(state);
  movePlayer(state.world, 8, 8);
  settle(state);
  assert.equal(residentBlock(state.world, [0, 0, 0]), 3);
  const before = state.world.rebuilds;
  pump(state.world);
  flushEdits(state);
  assert.equal(state.world.rebuilds, before);
  assert.equal(editRay(createSandbox(3), topRay(), false), false);
});
test("sandbox64 bad rays, coordinates, material and imported player are rejected within finite bounds", () => {
  const state = createSandbox();
  for (const ray of [
    { origin: [NaN, 0, 0], direction: [1, 0, 0] },
    { origin: [0, 0, 0], direction: [0, 0, 0] },
    { origin: [0, 0, 0], direction: [2, 0, 0] },
  ])
    assert.throws(() => traceWorld(state.world, ray));
  assert.throws(() => writeCell(state, [0, 16, 0], 3));
  assert.throws(() => writeCell(state, [0.5, 1, 0], 3));
  assert.throws(() => writeCell(state, [0, 0, 0], 4));
  assert.throws(() => createSandbox(10, undefined, [], { x: NaN, z: 0 }));
  assert.throws(() => traceWorld(state.world, topRay(), 97));
});
