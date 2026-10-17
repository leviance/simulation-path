import test from "node:test";
import assert from "node:assert/strict";
import {
  makeChunk,
  index,
  makeMask,
  rectangles,
  buildMesh,
  verify,
  defaultCamera,
  raster,
} from "../lib/labs/voxel-greedy-meshing.ts";
test("greedy61 full chunk: 1536 unit faces become six correctly wound quads", () => {
  const chunk = makeChunk(2),
    result = buildMesh(chunk);
  assert.equal(result.unitFaces, 1536);
  assert.equal(result.quads.length, 6);
  assert.equal(result.mesh.length, 12);
  assert.equal(result.work.samples, 26112);
  assert.equal(buildMesh(chunk, 15, false).work.samples, 24576);
  assert.equal(verify(chunk, result.quads), 1536);
  const topOnly = buildMesh(chunk, 15, true, 2);
  assert.equal(topOnly.quads.length, 1281);
  assert.equal(topOnly.mesh.length, 2562);
  verify(chunk, topOnly.quads);
  result.mesh.forEach((t, i) => {
    const [a, b, c] = t.points,
      ab = b.map((v, j) => v - a[j]),
      ac = c.map((v, j) => v - a[j]);
    const n = [
      ab[1] * ac[2] - ab[2] * ac[1],
      ab[2] * ac[0] - ab[0] * ac[2],
      ab[0] * ac[1] - ab[1] * ac[0],
    ];
    const face = result.quads[Math.floor(i / 2)].face;
    assert.equal(Math.sign(n[Math.floor(face / 2)]), face % 2 === 0 ? 1 : -1);
    assert.ok(t.points.flat().every((v) => v >= 0 && v <= 16));
  });
});
test("greedy61 oracle checks all fixtures, six orientations, cuts, materials and no mutation", () => {
  for (let p = 0; p < 8; p++)
    for (const slice of [0, 7, 15]) {
      const chunk = makeChunk(p),
        copy = chunk.slice(),
        a = buildMesh(chunk, slice),
        b = buildMesh(chunk, slice, false);
      assert.equal(verify(chunk, a.quads, slice), a.unitFaces);
      assert.equal(verify(chunk, b.quads, slice), b.quads.length);
      assert.ok(a.quads.length <= b.quads.length);
      assert.deepEqual(chunk, copy);
      assert.deepEqual(buildMesh(chunk, slice).quads, a.quads);
    }
  assert.equal(buildMesh(makeChunk(3)).quads.length, 12);
  assert.equal(buildMesh(makeChunk(4)).quads.length, 12288);
  assert.equal(buildMesh(makeChunk(5)).quads.length, 0);
  assert.equal(buildMesh(makeChunk(2), 0).quads.length, 6);
});
test("greedy61 width-first rectangles never bridge holes or different materials", () => {
  const m = new Uint8Array(256);
  m.set([1, 1, 2]);
  m[16] = 1;
  m[17] = 1;
  m[32] = 1;
  const copy = m.slice(),
    r = rectangles(m, 4, 9);
  assert.deepEqual(
    r.map((q) => [q.u, q.v, q.width, q.height, q.material]),
    [
      [0, 0, 2, 2, 1],
      [2, 0, 1, 1, 2],
      [0, 2, 1, 1, 1],
    ],
  );
  assert.deepEqual(m, copy);
  const chunk = makeChunk(1);
  assert.equal(buildMesh(chunk).unitFaces, 10);
  const mask = makeMask(chunk, 0, 8);
  assert.equal(
    mask.reduce((a, b) => a + Number(b !== 0), 0),
    0,
  );
});
test("greedy61 oracle rejects duplicates, missing faces and changed material", () => {
  const chunk = makeChunk(2),
    { quads } = buildMesh(chunk);
  assert.throws(() => verify(chunk, [...quads, quads[0]]));
  assert.throws(() => verify(chunk, quads.slice(1)));
  assert.throws(() =>
    verify(
      chunk,
      quads.map((r, i) => (i === 0 ? { ...r, material: 1 } : r)),
    ),
  );
});
test("greedy61 deterministic sparse data and raster depth match unmerged mesh", () => {
  let seed = 61;
  const chunk = new Uint8Array(4096);
  for (let i = 0; i < chunk.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    chunk[i] = seed % 7 < 3 ? (seed % 3) + 1 : 0;
  }
  verify(chunk, buildMesh(chunk).quads);
  for (const p of [2, 3, 6, 7])
    for (const yaw of [-1.1, 0.7]) {
      const c = makeChunk(p),
        camera = { ...defaultCamera, yaw };
      const a = raster(buildMesh(c).mesh, camera),
        b = raster(buildMesh(c, 15, false).mesh, camera);
      a.depth.forEach((d, i) => {
        assert.equal(Number.isFinite(d), Number.isFinite(b.depth[i]));
        if (Number.isFinite(d)) assert.ok(Math.abs(d - b.depth[i]) < 1e-8);
      });
    }
});
test("greedy61 invalid inputs rejected before iteration", () => {
  assert.throws(() => makeMask(new Uint8Array(1), 0, 0));
  for (const bad of [-1, NaN, Infinity, 1.5, 17])
    assert.throws(() => makeMask(makeChunk(2), 0, bad));
  assert.throws(() => buildMesh(makeChunk(2), 16));
  assert.throws(() => rectangles(new Uint8Array(255), 0, 0));
  const c = makeChunk(0);
  c[index(7, 7, 7)] = 9;
  assert.throws(() => buildMesh(c));
});
