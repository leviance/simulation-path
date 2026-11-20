import assert from "node:assert/strict";
import test from "node:test";
import * as s from "../lib/labs/volume-slicer.ts";
import * as c from "../lib/labs/volume-slicer/camera.ts";
import {
  meshSlabs,
  clipPolygon,
  maxContextTriangles,
} from "../lib/labs/volume-slicer/context-mesh.ts";
import { renderContext } from "../lib/labs/volume-slicer/context-render.ts";
import { createDataset } from "../lib/labs/volume-slicer/dataset.ts";
const near = (a, b, epsilon = 1e-10) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= epsilon, `${a} != ${b}`);
function fixture() {
  const grid = { size: [3, 2, 4], origin: [-1, -2, -3], spacing: [2, 4, 6] };
  const volume = new s.Volume(grid);
  for (let z = 0; z < 4; z++)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 3; x++) volume.set(x, y, z, x + 10 * y + 100 * z);
  return volume;
}
test("P53 stores x-fastest 3D samples with anisotropic centre-to-world mapping", () => {
  const volume = fixture();
  assert.equal(volume.values.length, 24);
  for (let z = 0; z < 4; z++)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 3; x++) {
        assert.equal(volume.index(x, y, z), x + 3 * y + 6 * z);
        const point = s.centre(volume.grid, x, y, z);
        assert.deepEqual(point, [2 * x, 4 * y, 6 * z]);
        assert.equal(s.sampleNearest(volume, point), x + 10 * y + 100 * z);
        assert.equal(s.sampleLinear(volume, point), x + 10 * y + 100 * z);
      }
  assert.throws(() => volume.at(3, 0, 0));
  assert.throws(() => volume.at(0, -1, 0));
  assert.throws(() => volume.at(0, 0, 4));
  assert.throws(() => volume.at(0.5, 0, 0));
});
test("P53 independent half-cell and affine oracles agree with all eight inspector contributions", () => {
  const volume = fixture();
  near(s.sampleLinear(volume, [1, 0, 3]), 50.5);
  assert.equal(s.sampleNearest(volume, [1, 0, 3]), 101); // ties go to higher indices
  for (let trial = 0; trial < 80; trial++) {
    const x = (trial % 13) / 7,
      y = (trial % 9) / 9,
      z = (trial % 17) / 6;
    const p = s.centre(volume.grid, x, y, z);
    const stencil = s.linearStencil(volume, p);
    assert.equal(stencil.length, 8);
    near(
      stencil.reduce((sum, c) => sum + c.weight, 0),
      1,
      1e-14,
    );
    assert.ok(stencil.every((c) => c.weight >= 0 && c.weight <= 1));
    const expected = x + 10 * y + 100 * z;
    near(s.sampleLinear(volume, p), expected);
    near(
      stencil.reduce((sum, c) => sum + c.weight * c.value, 0),
      expected,
    );
  }
});
test("P53 includes all physical faces, clamps half-voxels and rejects outside/nonfinite queries", () => {
  const volume = fixture();
  for (let axis = 0; axis < 3; axis++) {
    const point = [0, 0, 0];
    point[axis] = volume.grid.origin[axis];
    assert.notEqual(s.sampleLinear(volume, point), undefined);
    point[axis] -= 1e-8;
    assert.equal(s.sampleLinear(volume, point), undefined);
    point[axis] = volume.grid.origin[axis] + s.extent(volume.grid)[axis];
    assert.notEqual(s.sampleNearest(volume, point), undefined);
    point[axis] += 1e-8;
    assert.equal(s.sampleNearest(volume, point), undefined);
  }
  assert.equal(s.sampleLinear(volume, [NaN, 0, 0]), undefined);
  assert.equal(s.sampleNearest(volume, [0, Infinity, 0]), undefined);
  const singleton = new s.Volume({ size: [1, 1, 1], origin: [0, 0, 0], spacing: [2, 3, 4] });
  singleton.set(0, 0, 0, 0.375);
  near(s.sampleLinear(singleton, [0, 0, 0]), 0.375, 0);
  near(s.sampleLinear(singleton, [2, 3, 4]), 0.375, 0);
});
test("P53 guards real allocation, finite geometry and mutable-data audits", () => {
  for (const side of [0, -1, 129, 1.5, Infinity]) assert.throws(() => s.makeGrid(side));
  assert.throws(() => new s.Volume({ size: [3, 2, 4], origin: [0, 0, 0], spacing: [1, 0, 1] }));
  assert.throws(() => new s.Volume({ size: [3, 2, 4], origin: [0, 0, 0], spacing: [1e308, 1, 1] }));
  const volume = fixture();
  assert.throws(() => volume.set(0, 0, 0, Infinity));
  assert.throws(() => {
    volume.grid.spacing[0] = 0;
  });
  volume.values[0] = NaN;
  assert.throws(() => s.audit(volume));
});
test("P53 XY/XZ/YZ orientation preserves the fixed axis and upward world direction", () => {
  const volume = fixture(),
    probe = [1, 2, 3];
  for (let view = 0; view < 3; view++) {
    const a = s.axesFor(view),
      p = s.slicePoint(volume, view, 0.25, 0.75, probe);
    near(p[a.fixed], probe[a.fixed], 0);
    near(
      p[a.horizontal],
      volume.grid.origin[a.horizontal] + 0.25 * s.extent(volume.grid)[a.horizontal],
      0,
    );
    near(
      p[a.vertical],
      volume.grid.origin[a.vertical] + 0.75 * s.extent(volume.grid)[a.vertical],
      0,
    );
  }
});
test("P53 actual 64^3 and 128^3 allocations preserve physical extent, histogram counts and sphere symmetry", () => {
  for (const side of [64, 128]) {
    const volume = s.buildVolume("sphere", side),
      stats = s.measure(volume);
    assert.equal(volume.values.length, side ** 3);
    assert.equal(volume.values.byteLength, side ** 3 * 4);
    assert.deepEqual(s.extent(volume.grid), [160, 192, 224]);
    assert.equal(
      stats.bins.reduce((a, b) => a + b, 0),
      side ** 3,
    );
    for (let z = 0; z < side; z += 7)
      for (let y = 0; y < side; y += 7)
        for (let x = 0; x < side; x += 7) {
          const value = volume.at(x, y, z);
          assert.equal(value, volume.at(side - 1 - x, y, z));
          assert.equal(value, volume.at(x, side - 1 - y, z));
          assert.equal(value, volume.at(x, y, side - 1 - z));
        }
    const image = s.sampleSlice(volume, 0, [0, 0, 0], true, 64);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 32; x++) near(image[x + y * 64], image[63 - x + y * 64], 1e-6);
    assert.deepEqual(s.audit(volume).failures, 0);
  }
});
test("P53 window and palette transform display only; malformed data cannot become an image", () => {
  const volume = fixture(),
    before = volume.values.slice();
  const image = s.sampleSlice(volume, 0, [0, 0, 0], false, 16);
  near(s.windowValue(0.5, { level: 0.5, width: 0.5 }), 0.5, 0);
  const colors = s.colorImage(image, { level: 0.4, width: 0.7 }, true);
  assert.equal(colors.length, 16 * 16 * 4);
  assert.deepEqual(before, volume.values);
  assert.throws(() => s.windowValue(0.5, { level: 0.5, width: 0 }));
  assert.throws(() => s.colorImage(Float32Array.of(NaN), { level: 0.5, width: 1 }, true));
  assert.throws(() => s.sampleSlice(volume, 0, [0, 0, 0], true, 1e7));
  for (const preset of s.presets) assert.ok(Number.isFinite(s.fieldValue(preset, [0, 0, 0])));
});

test("P53 camera ray/projection round trip is independent of the measured world point", () => {
  const point = [5, 12, -7];
  for (const yaw of [-0.8, 0.4, 1.7]) {
    const camera = { ...c.defaultCamera, yaw },
      frame = c.cameraFrame(camera, 640, 480),
      pixel = c.project(frame, point);
    const restored = c.add(frame.eye, c.mul(c.cameraRay(frame, pixel.x, pixel.y), pixel.depth));
    for (let axis = 0; axis < 3; axis++) near(restored[axis], point[axis]);
    assert.deepEqual(point, [5, 12, -7]);
  }
  assert.throws(() => c.cameraFrame({ ...c.defaultCamera, yaw: NaN }, 640, 480));
  assert.throws(() => c.cameraFrame(c.defaultCamera, 0, 480));
  assert.equal(c.project(c.cameraFrame(c.defaultCamera, 640, 480), [NaN, 0, 0]), undefined);
});
test("P53 clipping preserves the selected half-space and known half-triangle area", () => {
  const triangle = [
    { point: [-1, 0, 0], normal: [0, 0, 1] },
    { point: [1, 0, 0], normal: [0, 0, 1] },
    { point: [0, 2, 0], normal: [0, 0, 1] },
  ];
  const polygon = clipPolygon(triangle, 0, 0, true);
  assert.ok(polygon.length >= 3);
  let area = 0;
  for (const vertex of polygon) {
    assert.ok(vertex.point[0] <= 1e-12);
    near(Math.hypot(...vertex.normal), 1);
  }
  for (let i = 1; i + 1 < polygon.length; i++)
    area +=
      Math.hypot(
        ...c.cross(
          c.sub(polygon[i].point, polygon[0].point),
          c.sub(polygon[i + 1].point, polygon[0].point),
        ),
      ) * 0.5;
  near(area, 1);
});
test("P53 context uses measured volume without mutating it and produces a nonempty depth-tested specimen", () => {
  const volume = s.buildVolume("gaussian", 16),
    original = volume.values.slice();
  const generator = meshSlabs(volume);
  let step = generator.next();
  while (!step.done) step = generator.next();
  const mesh = step.value;
  assert.ok(mesh.triangles > 0 && mesh.triangles < maxContextTriangles);
  assert.equal(mesh.vertices.length, mesh.triangles * 18);
  assert.ok(mesh.vertices.every(Number.isFinite));
  for (let offset = 0; offset < mesh.vertices.length; offset += 6)
    near(Math.hypot(...mesh.vertices.subarray(offset + 3, offset + 6)), 1, 2e-6);
  const slices = [0, 1, 2].map((view) => s.sampleSlice(volume, view, [0, 0, 0], true));
  const image = renderContext(
    mesh,
    volume,
    [0, 0, 0],
    slices,
    s.defaultWindow,
    true,
    c.defaultCamera,
    true,
    96,
    96,
  );
  const empty = renderContext(
    { vertices: new Float32Array(), triangles: 0 },
    volume,
    [0, 0, 0],
    slices,
    s.defaultWindow,
    true,
    c.defaultCamera,
    false,
    96,
    96,
  );
  let different = 0;
  for (let i = 0; i < image.length; i++) if (image[i] !== empty[i]) different++;
  assert.ok(different > 500);
  assert.deepEqual(volume.values, original);
  assert.throws(() =>
    renderContext(
      { vertices: new Float32Array(9), triangles: 0.5 },
      volume,
      [0, 0, 0],
      slices,
      s.defaultWindow,
      true,
      c.defaultCamera,
      true,
      96,
      96,
    ),
  );
});
test("P53 async dataset jobs support cancellation and cannot return a partial result", async () => {
  const cancelled = new AbortController();
  await assert.rejects(
    createDataset("specimen", 128, true, cancelled.signal, () => cancelled.abort()),
    { name: "AbortError" },
  );
  const completed = await createDataset(
    "gaussian",
    16,
    true,
    new AbortController().signal,
    () => {},
  );
  assert.equal(completed.volume.values.length, 16 ** 3);
  assert.equal(completed.statistics.count, 16 ** 3);
  assert.ok(completed.mesh.triangles > 0);
  assert.equal(completed.preset, "gaussian");
});
