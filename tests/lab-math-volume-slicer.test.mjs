import assert from "node:assert/strict";
import test from "node:test";
import * as s from "../lib/labs/volume-slicer.ts";
import { createScanClock } from "../lib/labs/volume-slicer/scan-clock.ts";
import {
  defaultSliceCamera,
  sliceCameraBasis,
  projectSlicePoint,
} from "../lib/labs/volume-slicer/camera.ts";
import { keepOutsideCorner } from "../lib/labs/volume-slicer/cutaway-clip.ts";
import { extractSurface, maxSurfaceTriangles } from "../lib/labs/volume-slicer/surface.ts";
import { renderCutaway } from "../lib/labs/volume-slicer/cutaway-render.ts";
const near = (a, b, t = 1e-12) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= t, `${a} != ${b}`);
const grid = { count: [4, 3, 5], spacing: [0.2, 0.3, 0.4] };

test("Presentation camera is orthonormal, z-up and independent of the measured world point", () => {
  const point = [0.23, -0.41, 0.67];
  const saved = [...point];
  for (const yaw of [-2, 0, 0.72, 2]) {
    const camera = { ...defaultSliceCamera, yaw };
    const b = sliceCameraBasis(camera);
    for (const v of [b.forward, b.right, b.up]) near(Math.hypot(...v), 1);
    near(
      b.forward.reduce((sum, v, i) => sum + v * b.up[i], 0),
      0,
    );
    near(
      b.right.reduce((sum, v, i) => sum + v * b.up[i], 0),
      0,
    );
    const origin = projectSlicePoint(camera, [0, 0, 0], { x: 10, y: 20, width: 600, height: 500 });
    near(origin.x, 310);
    near(origin.y, 270);
    const up = projectSlicePoint(camera, [0, 0, 1], { x: 10, y: 20, width: 600, height: 500 });
    assert.ok(up.y < origin.y);
    projectSlicePoint(camera, point, { x: 10, y: 20, width: 600, height: 500 });
  }
  assert.deepEqual(point, saved);
});

test("Cutaway clipping removes the known corner area without changing source vertices", () => {
  const triangle = [
    [-1, -1, 1],
    [1, -1, 1],
    [-1, 1, 1],
  ].map((p) => ({ p, n: [0, 0, 1] }));
  const saved = structuredClone(triangle);
  const pieces = keepOutsideCorner(triangle, [0, 0, 0]);
  const area = pieces.reduce(
    (sum, [a, b, c]) =>
      sum +
      Math.abs((b.p[0] - a.p[0]) * (c.p[1] - a.p[1]) - (b.p[1] - a.p[1]) * (c.p[0] - a.p[0])) / 2,
    0,
  );
  near(area, 1.5);
  for (const piece of pieces)
    for (const { p } of piece) assert.ok(!(p[0] > 1e-10 && p[1] < -1e-10 && p[2] > 1e-10));
  assert.deepEqual(triangle, saved);
  const removed = [
    [0.2, -0.2, 0.5],
    [0.8, -0.2, 0.5],
    [0.2, -0.8, 0.5],
  ].map((p) => ({ p, n: [0, 0, 1] }));
  assert.equal(keepOutsideCorner(removed, [0, 0, 0]).length, 0);
});

test("All five context meshes are bounded; cut caps reuse scalar images and never mutate the volume", () => {
  for (const preset of s.presets) {
    const volume = new s.Volume(s.makeGrid(64));
    s.fillVolume(volume, preset);
    const saved = new Float64Array(volume.values);
    const mesh = extractSurface(volume);
    assert.ok(mesh.length > 0 && mesh.length < maxSurfaceTriangles, preset);
    for (const tri of mesh)
      for (const { p, n } of tri) {
        assert.ok(
          p.every(
            (v, a) =>
              Number.isFinite(v) &&
              v >= s.lower(volume.grid, a) - 1e-10 &&
              v <= -s.lower(volume.grid, a) + 1e-10,
          ),
        );
        near(Math.hypot(...n), 1, 1e-10);
      }
    const raw = [0, 1, 2].map((v) => s.sampleImage(volume, v, [0, 0, 0], true, 7, 32));
    const images = raw.map((values) => s.colorImage(values, { level: 0.5, width: 1 }, 7, true));
    const whole = renderCutaway(
      volume,
      mesh,
      [0, 0, 0],
      defaultSliceCamera,
      false,
      180,
      170,
      raw,
      images,
      false,
    );
    const cut = renderCutaway(
      volume,
      mesh,
      [0, 0, 0],
      defaultSliceCamera,
      true,
      180,
      170,
      raw,
      images,
      false,
    );
    assert.equal(cut.length, 180 * 170 * 4);
    assert.notDeepEqual(whole, cut, preset + " really changes visible geometry");
    assert.deepEqual(volume.values, saved);
    for (let i = 3; i < cut.length; i += 4) assert.equal(cut[i], 255);
    assert.throws(
      () =>
        renderCutaway(
          volume,
          mesh,
          [0, 0, 0],
          defaultSliceCamera,
          true,
          1001,
          170,
          raw,
          images,
          false,
        ),
      RangeError,
    );
  }
});

test("Known 3x2x4 fixture checks eight corners, nearest tie and all six outside faces", () => {
  const volume = new s.Volume({ count: [3, 2, 4], spacing: [1, 2, 3] });
  for (let z = 0; z < 4; z++)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 3; x++) volume.values[volume.index(x, y, z)] = 100 * z + 10 * y + x;
  assert.equal(volume.index(2, 1, 3), 23);
  assert.equal(volume.voxel(2, 1, 3), 312);
  const centre = [0, 1, 2].map((a) => s.worldCoordinate(volume.grid, a, 0.5));
  near(s.sampleLinear(volume, centre), 55.5);
  near(s.sampleNearest(volume, centre), 111);
  const offCentre = [0.25, 0.5, 0.75].map((fraction, a) =>
    s.worldCoordinate(volume.grid, a, fraction),
  );
  near(s.sampleLinear(volume, offCentre), 80.25);
  const low = [0, 1, 2].map((a) => s.lower(volume.grid, a));
  const high = low.map((v) => -v);
  near(s.sampleNearest(volume, low), 0);
  near(s.sampleLinear(volume, high), 312);
  for (let axis = 0; axis < 3; axis++) {
    for (const side of [-1, 1]) {
      const p = side === -1 ? [...low] : [...high];
      p[axis] += side * 1e-6;
      assert.equal(s.sampleNearest(volume, p), null);
      assert.equal(s.sampleLinear(volume, p), null);
    }
  }
});

test("64^3 and 128^3 are real allocations; sphere reflection, histogram and fixed extent agree", () => {
  for (const side of [64, 128]) {
    const volume = new s.Volume(s.makeGrid(side));
    assert.equal(volume.values.length, side ** 3);
    near(-2 * s.lower(volume.grid, 0), 3.2);
    near(-2 * s.lower(volume.grid, 1), 3.84);
    near(-2 * s.lower(volume.grid, 2), 4.8);
    s.fillVolume(volume, "sphere");
    let symmetric = true;
    for (let z = 0; z < side; z++)
      for (let y = 0; y < side; y++)
        for (let x = 0; x < side; x++) {
          const value = volume.voxel(x, y, z);
          symmetric &&=
            value === volume.voxel(side - 1 - x, y, z) &&
            value === volume.voxel(x, side - 1 - y, z) &&
            value === volume.voxel(x, y, side - 1 - z);
        }
    assert.equal(symmetric, true);
    const stats = s.histogram(volume);
    assert.equal(
      stats.bins.reduce((a, b) => a + b, 0),
      side ** 3,
    );
    assert.equal(stats.minimum, 0);
    assert.equal(stats.maximum, 1);
  }
});

test("Analytic fields have independent expected values and display stages preserve cached scalars", () => {
  near(s.fieldValue([0.85, 0, 0], "gaussian"), Math.exp(-1));
  assert.equal(s.fieldValue([0, 0, -1], "layers"), 0.15);
  assert.equal(s.fieldValue([0, 0, 0], "layers"), 0.5);
  assert.equal(s.fieldValue([0, 0, 1], "layers"), 0.85);
  const volume = new s.Volume(grid);
  s.fillVolume(volume, "layers");
  const raw = s.sampleImage(volume, 1, [0, 0, 0], true, 7, 16);
  const copy = new Float64Array(raw),
    values = new Float64Array(volume.values);
  const gray = s.colorImage(raw, { level: 0.5, width: 1 }, 7);
  const color = s.colorImage(raw, { level: 0.7, width: 0.4 }, 7, true);
  assert.notDeepEqual(gray, color);
  assert.deepEqual(raw, copy);
  assert.deepEqual(volume.values, values);
  assert.throws(() => s.makeGrid(32), RangeError);
  volume.values[0] = NaN;
  assert.throws(() => s.histogram(volume), RangeError);
});

test("Trilinear inspector has eight independent contributions and reproduces 0.525", () => {
  const volume = new s.Volume({ count: [2, 2, 2], spacing: [1, 1, 1] });
  volume.values.set([0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8]);
  const point = [-0.25, 0, 0.25];
  const trace = s.linearStencil(volume, point);
  assert.equal(trace.corners.length, 8);
  near(
    trace.corners.reduce((sum, c) => sum + c.weight, 0),
    1,
  );
  near(trace.value, 0.525);
  near(trace.value, s.sampleLinear(volume, point));
  near(trace.corners[0].weight, 0.09375);
  near(trace.corners[6].contribution, 0.196875);
  assert.equal(s.linearStencil(volume, [-2, 0, 0]), null);
});

test("Slice refresh throttling preserves elapsed time at different frame rates", () => {
  for (const fps of [30, 59, 60, 61, 144]) {
    const update = createScanClock(0);
    let distance = 0;
    for (let frame = 1; frame <= fps * 10; frame++) distance += 4 * update((frame * 1000) / fps);
    // At most one normal refresh interval is pending at the measurement endpoint.
    assert.ok(Math.abs(distance - 40) <= 4 * (0.1 + 1 / fps) + 1e-10, `${fps}: ${distance}`);
  }
  const update = createScanClock(0);
  near(update(10000), 0.1);
  near(createScanClock(10000)(10000), 0);
});
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
  assert.equal(new s.Volume().values.byteLength, 2 * 1024 * 1024);
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
  const area = { x: 20, y: 40, width: 300, height: 120 };
  for (let bits = 0; bits < 8; bits++) {
    const corner = [0, 1, 2].map((a) => (bits & (1 << a) ? -1 : 1) * s.lower(grid, a));
    const p = s.locatorPoint(grid, corner, area);
    assert.ok(
      p.x >= area.x && p.x <= area.x + area.width && p.y >= area.y && p.y <= area.y + area.height,
    );
  }
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
  assert.equal(report.checks, a.values.length + 33);
  assert.ok(report.minimum >= 0 && report.maximum <= 1);
  a.values[0] = -0.1;
  assert.ok(s.auditVolume(a).failures > 0);
  a.values[0] = NaN;
  assert.ok(s.auditVolume(a).failures > 0);
});

test("Volume audit rejects inconsistent storage and a mutated invalid grid", () => {
  const volume = new s.Volume(grid);
  volume.values = new Float64Array(0);
  assert.ok(
    s.auditVolume(volume).failures > 0,
    "empty storage must not pass an affine-only oracle",
  );
  volume.values = new Float64Array(59);
  assert.ok(s.auditVolume(volume).failures > 0, "truncated storage");
  volume.values = new Float64Array(61);
  assert.ok(s.auditVolume(volume).failures > 0, "oversized storage");
  volume.values = new Float64Array(60);
  volume.grid.spacing[1] = NaN;
  assert.ok(s.auditVolume(volume).failures > 0, "invalid grid after construction");
});

test("Volume bounded color mapping rejects invalid scalars and oversized images", () => {
  for (const value of [NaN, Infinity, -Infinity])
    assert.throws(() => s.colorValue(value, true), RangeError);
  for (const count of [0, 256 * 256 + 1])
    assert.throws(
      () => s.colorImage(new Float64Array(count), { level: 0.5, width: 1 }, 7),
      RangeError,
    );
  assert.throws(
    () => s.colorImage(new Float64Array([NaN]), { level: 0.5, width: 1 }, 1),
    RangeError,
  );
});
