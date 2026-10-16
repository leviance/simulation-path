import assert from "node:assert/strict";
import test from "node:test";
import {
  makeRay,
  cameraRay,
  clipBox,
  pointAt,
  project,
  defaultCamera,
  makeChunk,
  index,
  traverse,
  breakBlock,
  placeBlock,
  placementCell,
  createEditor,
  refreshEditor,
  changeCamera,
  edit,
  setAim,
  orbit,
} from "../lib/labs/voxel-ray-editor.ts";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} vs ${b}`);
function brute(chunk, ray, reach = 64) {
  let best = null;
  for (let y = 0; y < 16; y++)
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        if (!chunk[index(x, y, z)]) continue;
        const span = clipBox(ray, [x, y, z], [x + 1, y + 1, z + 1], reach);
        if (span && (!best || span.enter < best.distance))
          best = { cell: [x, y, z], distance: span.enter };
      }
  return best;
}
test("Voxel editor orthographic rays project back to the aimed pixel at every depth", () => {
  for (const yaw of [-1, 0.7, 2])
    for (const zoom of [0.5, 1, 1.5])
      for (const [x, y] of [
        [0.5, 0.5],
        [160.5, 120.5],
        [319.5, 239.5],
      ]) {
        const c = { ...defaultCamera, yaw, zoom },
          r = cameraRay(c, x, y);
        close(Math.hypot(...r.direction), 1);
        for (const t of [0, 16, 32, 50]) {
          const p = project(pointAt(r, t), c);
          close(p.x, x);
          close(p.y, y);
        }
      }
  const a = cameraRay(defaultCamera, 80.5, 100.5),
    b = cameraRay(defaultCamera, 200.5, 150.5);
  assert.deepEqual(a.direction, b.direction);
  assert.notDeepEqual(a.origin, b.origin);
});
test("Voxel camera canonical bases reconstruct the lesson pixel at zero and quarter-turn yaw", () => {
  for (const [yaw, origin, direction] of [
    [0, [8 + 1 / 12, 8 - 1 / 12, 40], [0, 0, -1]],
    [Math.PI / 2, [40, 8 - 1 / 12, 8 - 1 / 12], [-1, 0, 0]],
  ]) {
    const camera = { ...defaultCamera, yaw, pitch: 0 };
    const ray = cameraRay(camera, 160.5, 120.5);
    for (let axis = 0; axis < 3; axis++) {
      close(ray.origin[axis], origin[axis]);
      close(ray.direction[axis], direction[axis]);
    }
    const pixel = project(pointAt(ray, 32), camera);
    close(pixel.x, 160.5);
    close(pixel.y, 120.5);
  }
});

test("Voxel editor slab intervals handle parallel, signed zero, outside, tangent and reach", () => {
  const r = makeRay([-1, 8, 8], [1, 0, 0]),
    s = clipBox(r, [0, 0, 0], [16, 16, 16], 64);
  close(s.enter, 1);
  close(s.exit, 17);
  assert.deepEqual(s.normal, [-1, 0, 0]);
  assert.equal(clipBox(makeRay([-1, 16, 8], [1, -0, 0]), [0, 0, 0], [16, 16, 16], 64), null);
  assert.equal(clipBox(makeRay([16, 8, 8], [1, 0, 0]), [0, 0, 0], [16, 16, 16], 64), null);
  assert.equal(clipBox(r, [0, 0, 0], [16, 16, 16], 1), null);
  assert.deepEqual(
    clipBox(makeRay([16, 8, 8], [-1, 0, 0]), [0, 0, 0], [16, 16, 16], 64).normal,
    [1, 0, 0],
  );
  assert.equal(clipBox(makeRay([-1, 1, 8], [1, -1, 0]), [0, 0, 0], [16, 16, 16], 64), null);
  const chained = makeRay([-1, -1 - 0.4e-9, -1 - 0.8e-9], [1, 1, 1]);
  assert.deepEqual(clipBox(chained, [0, 0, 0], [16, 16, 16], 64).normal, [0, -1, 0]);
});
test("Voxel editor DDA starts in the forward cell and skips contact-only cells at ties", () => {
  const empty = new Uint8Array(4096),
    r = makeRay([16, 8, 8], [-1, 0, 0]),
    trace = traverse(empty, r, 64, false);
  assert.equal(trace.visits.length, 16);
  assert.deepEqual(trace.visits[0].cell, [15, 8, 8]);
  assert.deepEqual(trace.visits.at(-1).cell, [0, 8, 8]);
  const diagonal = traverse(empty, makeRay([-1, -1, -1], [1, 1, 1]), 64, false);
  assert.equal(diagonal.visits.length, 16);
  assert.deepEqual(
    diagonal.visits.slice(0, 3).map((v) => v.cell),
    [
      [0, 0, 0],
      [1, 1, 1],
      [2, 2, 2],
    ],
  );
  assert.deepEqual(diagonal.visits[1].normal, [-1, 0, 0]);
  for (const v of diagonal.visits) assert.ok(v.exit - v.enter > 1e-9);
  assert.deepEqual(
    traverse(empty, makeRay([8, 8, 8], [-1, 0, 0]), 64, false).visits[0].cell,
    [7, 8, 8],
  );
});
test("Voxel editor first hit, entry normals and inside behavior match documented fixtures", () => {
  const c = new Uint8Array(4096);
  c[index(2, 8, 8)] = 3;
  c[index(4, 8, 8)] = 1;
  const r = makeRay([-1, 8.5, 8.5], [1, 0, 0]),
    trace = traverse(c, r);
  assert.deepEqual(trace.hit.cell, [2, 8, 8]);
  assert.deepEqual(trace.hit.normal, [-1, 0, 0]);
  close(trace.hit.distance, 3);
  const inner = traverse(c, makeRay([2.5, 8.5, 8.5], [1, 0, 0]));
  close(inner.hit.distance, 0);
  assert.deepEqual(inner.hit.normal, [0, 0, 0]);
  assert.equal(placementCell(c, inner.hit), null);
  const edge = new Uint8Array(4096);
  edge[index(1, 0, 0)] = 3;
  edge[index(1, 1, 1)] = 2;
  assert.deepEqual(traverse(edge, makeRay([-1, -1, -1], [1, 1, 1])).hit.cell, [1, 1, 1]);
  const single = new Uint8Array(4096);
  single[index(8, 8, 8)] = 3;
  for (let axis = 0; axis < 3; axis++)
    for (const sign of [-1, 1]) {
      const o = [8.5, 8.5, 8.5],
        d = [0, 0, 0],
        n = [0, 0, 0];
      o[axis] += sign * 4;
      d[axis] = -sign;
      n[axis] = sign;
      const hit = traverse(single, makeRay(o, d)).hit;
      assert.deepEqual(hit.cell, [8, 8, 8]);
      assert.deepEqual(hit.normal, n);
      close(hit.distance, 3.5);
    }
});
test("Voxel editor DDA matches independent per-block AABB oracle across bounded scenes/rays", () => {
  for (const preset of [0, 1, 2, 3, 4, 5, 6])
    for (let k = 0; k < 12; k++) {
      const c = makeChunk(preset),
        before = c.slice(),
        camera = { ...defaultCamera, yaw: -1 + k * 0.19, pitch: 0.15 + (k % 4) * 0.2 },
        r = cameraRay(camera, 70.5 + ((k * 37) % 180), 40.5 + ((k * 23) % 160)),
        d = traverse(c, r),
        b = brute(c, r);
      assert.equal(Boolean(d.hit), Boolean(b));
      if (b) {
        assert.deepEqual(d.hit.cell, b.cell);
        close(d.hit.distance, b.distance);
      }
      assert.ok(d.visits.length <= 64);
      assert.deepEqual(c, before);
    }
});
test("Voxel editor break changes exactly one cell, re-queries and preserves failed edits", () => {
  const c = new Uint8Array(4096);
  c[index(2, 8, 8)] = 3;
  c[index(4, 8, 8)] = 1;
  const r = makeRay([-1, 8.5, 8.5], [1, 0, 0]),
    before = c.slice();
  assert.equal(breakBlock(c, r, 64).changed, true);
  assert.equal(
    c.reduce((n, v, i) => n + Number(v !== before[i]), 0),
    1,
  );
  assert.deepEqual(traverse(c, r).hit.cell, [4, 8, 8]);
  assert.equal(breakBlock(c, r, 64).changed, true);
  const empty = c.slice();
  assert.equal(breakBlock(c, r, 64).changed, false);
  assert.deepEqual(c, empty);
});
test("Voxel editor placement uses hit+normal, never overwrites or escapes the chunk", () => {
  const c = new Uint8Array(4096);
  c[index(2, 8, 8)] = 3;
  const r = makeRay([-1, 8.5, 8.5], [1, 0, 0]);
  assert.deepEqual(placementCell(c, traverse(c, r).hit), [1, 8, 8]);
  assert.equal(placeBlock(c, r, 64, 2).changed, true);
  assert.equal(c[index(1, 8, 8)], 2);
  placeBlock(c, r, 64, 1);
  const before = c.slice();
  assert.equal(placeBlock(c, r, 64, 3).changed, false);
  assert.deepEqual(c, before);
  assert.equal(placeBlock(c, makeRay([2.5, 8.5, 8.5], [1, 0, 0]), 64, 3).changed, false);
  assert.throws(() => placeBlock(c, r, 64, 0), RangeError);
  const occupied = new Uint8Array(4096);
  occupied[index(1, 1, 1)] = 3;
  occupied[index(0, 1, 1)] = 2;
  const snapshot = occupied.slice();
  assert.equal(placeBlock(occupied, makeRay([-1, -1, -1], [1, 1, 1]), 64, 1).changed, false);
  assert.deepEqual(occupied, snapshot);
});
test("Voxel editor query/mutation invalidation does not reraster for aim or idle", () => {
  const e = createEditor();
  assert.ok(e.trace.hit);
  assert.equal(e.rebuilds, 1);
  assert.equal(e.rasterizations, 1);
  assert.equal(e.queries, 1);
  refreshEditor(e);
  assert.equal(e.queries, 1);
  setAim(e, 161, 120);
  refreshEditor(e);
  assert.equal(e.rebuilds, 1);
  assert.equal(e.rasterizations, 1);
  assert.equal(e.queries, 2);
  changeCamera(e, orbit(e.camera, 8, 0));
  refreshEditor(e);
  assert.equal(e.rebuilds, 1);
  assert.equal(e.rasterizations, 2);
  const old = e.trace.hit;
  assert.ok(old);
  assert.equal(edit(e, false).changed, true);
  assert.ok(e.meshDirty && e.pickDirty);
  refreshEditor(e);
  assert.equal(e.rebuilds, 2);
  assert.notDeepEqual(e.trace.hit?.cell, old.cell);
});
test("Voxel editor internal voxel faces retain entry normals and permit adjacent placement", () => {
  for (let axis = 0; axis < 3; axis++)
    for (const sign of [-1, 1]) {
      const chunk = new Uint8Array(4096),
        origin = [8.5, 8.5, 8.5],
        direction = [0, 0, 0];
      const cell = [8, 8, 8],
        normal = [0, 0, 0];
      origin[axis] = 8;
      direction[axis] = -sign;
      normal[axis] = sign;
      if (sign > 0) cell[axis] = 7;
      chunk[index(...cell)] = 3;
      const ray = makeRay(origin, direction),
        hit = traverse(chunk, ray).hit;
      assert.deepEqual(hit.cell, cell);
      assert.deepEqual(hit.normal, normal);
      close(hit.distance, 0);
      const target = cell.map((v, i) => v + normal[i]);
      assert.deepEqual(placementCell(chunk, hit), target);
      assert.equal(placeBlock(chunk, ray, 64, 2).changed, true);
      assert.equal(chunk[index(...target)], 2);
    }
});

test("Voxel editor DDA snapshots explain each crossing without sharing mutable arrays", () => {
  const trace = traverse(new Uint8Array(4096), makeRay([-1, 8.5, 8.5], [1, 0, 0]), 64, false);
  assert.deepEqual(trace.visits[0].step, [1, 0, 0]);
  assert.deepEqual(trace.visits[0].tMax, [2, Infinity, Infinity]);
  assert.deepEqual(trace.visits[0].tDelta, [1, Infinity, Infinity]);
  assert.deepEqual(trace.visits[1].tMax, [3, Infinity, Infinity]);
  assert.notEqual(trace.visits[0].tMax, trace.visits[1].tMax);
});

test("Voxel editor rejects invalid numeric inputs instead of unbounded traversal", () => {
  for (const [o, d] of [
    [
      [NaN, 0, 0],
      [1, 0, 0],
    ],
    [
      [129, 0, 0],
      [1, 0, 0],
    ],
    [
      [0, 0, 0],
      [0, 0, 0],
    ],
  ])
    assert.throws(() => makeRay(o, d), RangeError);
  assert.throws(() => cameraRay(defaultCamera, 320, 0), RangeError);
  assert.throws(() => traverse(makeChunk(2), makeRay([-1, 0, 0], [1, 0, 0]), 65), RangeError);
  assert.throws(
    () => traverse(makeChunk(2), { origin: [-1, 0, 0], direction: [2, 0, 0] }),
    RangeError,
  );
});
