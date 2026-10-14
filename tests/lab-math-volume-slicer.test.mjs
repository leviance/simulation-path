import assert from "node:assert/strict";
import test from "node:test";
import * as s from "../lib/labs/volume-slicer.ts";
const near = (a, b, t = 1e-12) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= t, `${a} != ${b}`);
const grid = { count: [4, 3, 5], spacing: [0.2, 0.3, 0.4] };
test("Volume shape, row-major address and allocation bounds are explicit", () => {
  const v = new s.Volume(grid);
  assert.equal(v.values.length, 60);
  assert.equal(v.index(3, 2, 4), 59);
  assert.equal(v.index(0, 1, 0), 4);
  assert.equal(v.index(0, 0, 1), 12);
  for (const bad of [
    [-1, 0, 0],
    [4, 0, 0],
    [0, 3, 0],
    [0, 0, 5],
    [0.5, 0, 0],
  ])
    assert.throws(() => v.voxel(...bad), RangeError);
  for (const count of [
    [0, 2, 2],
    [129, 2, 2],
    [NaN, 2, 2],
    [1.5, 2, 2],
  ])
    assert.throws(() => new s.Volume({ count, spacing: [1, 1, 1] }), RangeError);
  for (const spacing of [
    [0, 1, 1],
    [-1, 1, 1],
    [NaN, 1, 1],
    [Infinity, 1, 1],
  ])
    assert.throws(() => new s.Volume({ count: [2, 2, 2], spacing }), RangeError);
  assert.equal(new s.Volume().values.byteLength, 960 * 1024);
});
test("Volume world/grid centre round trips include anisotropic spacing", () => {
  for (let a = 0; a < 3; a++)
    for (const i of [0, 0.5, 1, 2])
      near(s.gridCoordinate(grid, a, s.worldCoordinate(grid, a, i)), i);
  assert.deepEqual(s.axesFor(0), { horizontal: 0, vertical: 1, cut: 2 });
  assert.deepEqual(s.axesFor(1), { horizontal: 0, vertical: 2, cut: 1 });
  assert.deepEqual(s.axesFor(2), { horizontal: 1, vertical: 2, cut: 0 });
});
test("Volume nearest and trilinear reproduce centre and affine oracle independently", () => {
  const v = new s.Volume(grid);
  for (let z = 0; z < 5; z++)
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 4; x++) {
        const p = [
          s.worldCoordinate(grid, 0, x),
          s.worldCoordinate(grid, 1, y),
          s.worldCoordinate(grid, 2, z),
        ];
        v.values[v.index(x, y, z)] = s.affine(p);
        near(s.sampleNearest(v, p), s.affine(p));
        near(s.sampleLinear(v, p), s.affine(p));
      }
  for (let i = 0; i < 20; i++) {
    const p = [
      s.worldCoordinate(grid, 0, 0.1 + i * 0.14),
      s.worldCoordinate(grid, 1, 0.1 + i * 0.09),
      s.worldCoordinate(grid, 2, 0.1 + i * 0.19),
    ];
    near(s.sampleLinear(v, p), s.affine(p));
  }
});
test("Volume boundary replication, outside rejection and singleton policy stay distinct", () => {
  const v = new s.Volume(grid);
  s.fillOrientation(v);
  const low = [0, 1, 2].map((a) => s.lower(grid, a));
  near(s.sampleNearest(v, low), v.voxel(0, 0, 0));
  near(s.sampleLinear(v, low), v.voxel(0, 0, 0));
  for (const p of [
    [low[0] - 0.001, 0, 0],
    [0, 0, 2],
    [NaN, 0, 0],
  ]) {
    assert.equal(s.sampleNearest(v, p), null);
    assert.equal(s.sampleLinear(v, p), null);
  }
  const one = new s.Volume({ count: [1, 1, 1], spacing: [0.1, 0.2, 0.3] });
  one.values[0] = 0.7;
  near(s.sampleLinear(one, [0, 0, 0]), 0.7);
  s.fillOrientation(one);
  assert.equal(one.values[0], 0);
  v.values.fill(0.37);
  near(s.sampleLinear(v, [0.1, 0.2, 0.3]), 0.37);
});
test("Volume planes, physical aspect and pixel/world selection agree", () => {
  const cursor = s.initialPoint(grid);
  for (let view = 0; view < 3; view++) {
    const a = s.axesFor(view),
      p = s.slicePoint(grid, view, cursor, 0.25, 0.75);
    near(p[a.cut], cursor[a.cut]);
    near(p[a.horizontal], s.lower(grid, a.horizontal) / 2);
    near(p[a.vertical], s.lower(grid, a.vertical) / 2);
    const rect = s.fitSlice(grid, view, { x: 20, y: 30, width: 300, height: 220 });
    near(
      rect.width / rect.height,
      (grid.count[a.horizontal] * grid.spacing[a.horizontal]) /
        (grid.count[a.vertical] * grid.spacing[a.vertical]),
    );
    const selected = s.pickSlice(
      grid,
      view,
      cursor,
      rect,
      rect.x + 0.25 * rect.width,
      rect.y + 0.75 * rect.height,
    );
    for (let axis = 0; axis < 3; axis++) near(selected[axis], p[axis]);
    assert.equal(s.pickSlice(grid, view, cursor, rect, rect.x - 1, rect.y), null);
  }
});
test("Volume window/level maps brightness without changing scalar or RGBA layout", () => {
  assert.equal(s.windowValue(0.1, { level: 0.5, width: 0.4 }), 0);
  near(s.windowValue(0.5, { level: 0.5, width: 0.4 }), 0.5);
  assert.equal(s.windowValue(0.9, { level: 0.5, width: 0.4 }), 1);
  for (const width of [0, -1, NaN, Infinity])
    assert.throws(() => s.windowValue(0.5, { level: 0.5, width }), RangeError);
  const v = new s.Volume(grid);
  s.fillPhantom(v);
  const original = new Float64Array(v.values),
    image = s.makeImage(v, 0, s.initialPoint(grid), { level: 0.4, width: 0.3 }, true, 7, 16);
  assert.deepEqual(v.values, original);
  for (let i = 0; i < image.length; i += 4) {
    assert.equal(image[i], image[i + 1]);
    assert.equal(image[i], image[i + 2]);
    assert.equal(image[i + 3], 255);
  }
  assert.throws(
    () => s.makeImage(v, 0, [0, 0, 0], { level: 0.5, width: 1 }, false, 7, 1024),
    RangeError,
  );
});
test("Volume phantom sampling is deterministic and audit detects corrupted values", () => {
  const a = new s.Volume(grid),
    b = new s.Volume(grid);
  s.fillPhantom(a);
  s.fillPhantom(b);
  assert.deepEqual(a.values, b.values);
  const report = s.auditVolume(a);
  assert.equal(report.failures, 0);
  assert.ok(report.residual < 1e-12);
  assert.equal(report.checks, a.values.length + 32);
  assert.ok(report.minimum >= 0 && report.maximum <= 1);
  a.values[0] = -0.1;
  assert.ok(s.auditVolume(a).failures > 0);
  a.values[0] = NaN;
  assert.ok(s.auditVolume(a).failures > 0);
});
