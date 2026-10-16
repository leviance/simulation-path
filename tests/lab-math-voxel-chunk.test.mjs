import assert from "node:assert/strict";
import test from "node:test";
import { inspectQuad } from "../lib/labs/voxel-face-inspector.ts";
import {
  index,
  makeChunk,
  solidCount,
  buildMesh,
  faces,
  appendCube,
  defaultCamera,
  project,
  orbit,
  zoom,
  pickCell,
  raster,
  audit,
  scene,
} from "../lib/labs/voxel-chunk.ts";
test("Voxel isolated face experiments expose vertex order without mutating geometry", () => {
  const before = structuredClone(faces);
  for (let face = 0; face < 6; face++) {
    const good = inspectQuad(face),
      bad = inspectQuad(face, true);
    assert.deepEqual(good.triangles[0].normal, good.expected);
    assert.deepEqual(good.triangles[1].normal, good.expected);
    assert.deepEqual(bad.triangles[0].normal, good.expected);
    assert.deepEqual(
      bad.triangles[1].normal.map((v) => (v === 0 ? 0 : -v)),
      good.expected,
    );
    assert.deepEqual(bad.triangles[1].indices, [0, 3, 2]);
  }
  assert.deepEqual(faces, before);
  assert.throws(() => inspectQuad(6), RangeError);
});

test("Voxel storage maps all 4096 coordinates once and rejects each boundary", () => {
  const ids = new Set();
  for (let y = 0; y < 16; y++)
    for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) ids.add(index(x, y, z));
  assert.equal(ids.size, 4096);
  assert.equal(index(15, 15, 15), 4095);
  for (const p of [
    [-1, 0, 0],
    [16, 0, 0],
    [0, -1, 0],
    [0, 16, 0],
    [0, 0, -1],
    [0, 0, 16],
    [NaN, 0, 0],
    [0.5, 0, 0],
  ])
    assert.throws(() => index(...p), RangeError);
  assert.equal(index(1, 0, 0), 1);
  assert.equal(index(0, 0, 1), 16);
  assert.equal(index(0, 1, 0), 256);
});
test("Voxel presets and naive mesh retain every internal face", () => {
  const expected = [1, 4096, 1408, 0];
  for (let p = 0; p < 4; p++) {
    const c = makeChunk(p),
      before = c.slice(),
      mesh = buildMesh(c);
    assert.equal(solidCount(c), expected[p]);
    assert.equal(mesh.length, 12 * expected[p]);
    assert.deepEqual(c, before);
    for (const t of mesh) for (const v of t.points) assert.ok(v.every((x) => x >= 0 && x <= 16));
  }
  const pair = new Uint8Array(4096);
  pair[0] = 3;
  pair[1] = 1;
  assert.equal(buildMesh(pair).length, 24);
  assert.throws(() => buildMesh(new Uint8Array(4)), RangeError);
  assert.throws(() => buildMesh(makeChunk(0), 16), RangeError);
});
test("Voxel cube winding points outward on all six faces", () => {
  const normals = [
    [1, 0, 0],
    [-1, 0, 0],
    [0, 1, 0],
    [0, -1, 0],
    [0, 0, 1],
    [0, 0, -1],
  ];
  faces.forEach((q, i) => {
    const a = q[1].map((v, j) => v - q[0][j]),
      b = q[2].map((v, j) => v - q[0][j]);
    const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]].map(
      (v) => (v === 0 ? 0 : v),
    );
    assert.deepEqual(n, normals[i]);
  });
});
test("Voxel material layers and slice clipping do not mutate storage", () => {
  const c = makeChunk(2);
  assert.equal(c[index(0, 3, 0)], 1);
  assert.equal(c[index(0, 2, 0)], 2);
  assert.equal(c[index(0, 0, 0)], 3);
  assert.equal(c[index(0, 4, 0)], 0);
  const full = makeChunk(1),
    before = full.slice();
  assert.equal(buildMesh(full, 0).length, 3072);
  assert.equal(buildMesh(full, 7).length, 24576);
  assert.deepEqual(full, before);
  assert.equal(scene(1, 0, 7).mesh.length, 12);
  assert.equal(scene(3, 1, 0).mesh.length, 49152);
});
test("Voxel orthographic camera has a center fixture and bounded motion", () => {
  assert.deepEqual(project([8, 8, 8], defaultCamera), { x: 160, y: 120, depth: 0 });
  const p = project([9, 8, 8], { ...defaultCamera, yaw: 0, pitch: 0 });
  assert.deepEqual(p, { x: 166, y: 120, depth: 0 });
  assert.equal(orbit(defaultCamera, 1e5, 1e5).pitch, 1.2);
  assert.equal(zoom(defaultCamera, 100).zoom, 1.5);
  assert.equal(zoom(defaultCamera, -100).zoom, 0.5);
});
test("Voxel grid uses half-open coordinates and is not ray picking", () => {
  assert.deepEqual(pickCell(0, 0, 7), [0, 7, 0]);
  assert.deepEqual(pickCell(255.999, 255.999, 15), [15, 15, 15]);
  for (const p of [
    [256, 0, 0],
    [0, 256, 0],
    [-0.1, 0, 0],
    [0, 0, 16],
    [NaN, 0, 0],
  ])
    assert.equal(pickCell(...p), null);
});
test("Voxel Z-buffer is draw-order independent and rejects hidden fragments", () => {
  const mesh = [];
  appendCube(mesh, [7, 7, 7], 3);
  const c = { ...defaultCamera, center: 7.5, scale: 60 },
    a = raster(mesh, c),
    b = raster([...mesh].reverse(), c);
  let coverage = 0;
  for (let i = 0; i < a.depth.length; i++)
    if (Number.isFinite(a.depth[i])) {
      coverage++;
      assert.ok(Math.abs(a.depth[i] - b.depth[i]) < 1e-9);
    }
  assert.ok(coverage > 3000);
  assert.notDeepEqual(raster(mesh, c, false).pixels, raster([...mesh].reverse(), c, false).pixels);
  const far = {
      points: [
        [7, 7, 6],
        [9, 7, 6],
        [8, 9, 6],
      ],
      color: [255, 0, 0, 255],
    },
    near = {
      points: [
        [7, 7, 9],
        [9, 7, 9],
        [8, 9, 9],
      ],
      color: [0, 255, 0, 255],
    };
  const f = raster([near, far], { ...defaultCamera, yaw: 0, pitch: 0, scale: 30 });
  assert.deepEqual(
    [...f.pixels.slice((120 * 320 + 160) * 4, (120 * 320 + 160) * 4 + 4)],
    [0, 255, 0, 255],
  );
  assert.match(audit(), /PASS/);
});
