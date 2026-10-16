import assert from "node:assert/strict";
import test from "node:test";
import {
  makeChunk,
  index,
  buildMesh,
  appendFace,
  faces,
  offsets,
  keepFace,
  inspectFace,
  oracleFaces,
  audit,
  createCache,
  update,
  defaultCamera,
  orbit,
  raster,
} from "../lib/labs/voxel-hidden-faces.ts";
function planeOracle(chunk, top) {
  const keys = [];
  const solid = (p) => p.every((v) => v >= 0 && v < 16) && p[1] <= top && chunk[index(...p)] !== 0;
  for (let axis = 0; axis < 3; axis++)
    for (let plane = 0; plane <= 16; plane++)
      for (let u = 0; u < 16; u++)
        for (let v = 0; v < 16; v++) {
          const b = [0, 0, 0];
          b[axis] = plane;
          b[(axis + 1) % 3] = u;
          b[(axis + 2) % 3] = v;
          const a = [...b];
          a[axis]--;
          if (solid(a) === solid(b)) continue;
          const source = solid(a) ? a : b,
            face = axis * 2 + (solid(a) ? 0 : 1);
          keys.push([...source, face].join(","));
        }
  return keys.sort();
}
test("Hidden faces baseline and exact preset fixtures mirror native C++", () => {
  const counts = [1, 2, 4096, 4095, 2048, 0, 1408],
    quads = [6, 10, 1536, 1542, 12288, 0, 912];
  for (let p = 0; p < 7; p++) {
    const chunk = makeChunk(p),
      base = buildMesh(chunk, false),
      r = buildMesh(chunk, true);
    assert.equal(r.solid, counts[p]);
    assert.equal(r.keys.length, quads[p]);
    assert.equal(r.mesh.length, 2 * quads[p]);
    assert.equal(base.mesh.length, 12 * counts[p]);
    assert.equal(r.neighborChecks, 6 * counts[p]);
    assert.equal(base.neighborChecks, 0);
  }
  assert.equal(1 - 3072 / 49152, 0.9375);
  assert.match(audit(), /PASS/);
});
test("Hidden faces refactor keeps baseline triangles and keys unchanged through stages one to three", () => {
  for (const preset of [0, 1, 2]) {
    const chunk = makeChunk(preset);
    const before = buildMesh(chunk, false, 15, 1);
    const refactored = buildMesh(chunk, false, 15, 2);
    const perFace = buildMesh(chunk, false, 15, 3);
    assert.deepEqual(refactored.mesh, before.mesh);
    assert.deepEqual(refactored.keys, before.keys);
    assert.deepEqual(perFace.mesh, refactored.mesh);
    assert.deepEqual(perFace.keys, refactored.keys);
    assert.equal(refactored.neighborChecks, 0);
  }
});

test("Hidden faces remove both shared opaque materials but not diagonal contacts", () => {
  const r = buildMesh(makeChunk(1), true),
    keys = new Set(r.keys.map((k) => k.join(",")));
  assert.ok(!keys.has("7,7,7,0") && !keys.has("8,7,7,1"));
  const c = new Uint8Array(4096);
  c[index(0, 0, 0)] = 3;
  c[index(1, 1, 0)] = 1;
  assert.equal(buildMesh(c, true).keys.length, 12);
});
test("Hidden faces quads retain correct winding and two triangles", () => {
  faces.forEach((q, face) => {
    const a = q[1].map((v, i) => v - q[0][i]),
      b = q[2].map((v, i) => v - q[0][i]);
    const n = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]].map(
      (v) => (v === 0 ? 0 : v),
    );
    assert.deepEqual(n, offsets[face]);
    const mesh = [];
    appendFace(mesh, [7, 7, 7], 3, face);
    assert.equal(mesh.length, 2);
  });
});
test("Hidden faces match a plane-sweep oracle, not only a total count", () => {
  for (const p of [1, 2, 3, 4, 6])
    for (const top of [0, 7, 15]) {
      const c = makeChunk(p),
        before = c.slice(),
        r = buildMesh(c, true, top),
        keys = r.keys.map((k) => k.join(",")).sort();
      assert.equal(new Set(keys).size, keys.length);
      assert.deepEqual(keys, planeOracle(c, top));
      assert.deepEqual(c, before);
      assert.equal(keys.length, oracleFaces(c, top));
    }
  for (let seed = 0; seed < 5; seed++) {
    const c = new Uint8Array(4096);
    for (let y = 0; y < 16; y++)
      for (let z = 0; z < 16; z++)
        for (let x = 0; x < 16; x++)
          if ((x * 73 + y * 151 + z * 199 + seed * 101) % 17 < 5) c[index(x, y, z)] = 2;
    assert.deepEqual(
      buildMesh(c, true, 9)
        .keys.map((k) => k.join(","))
        .sort(),
      planeOracle(c, 9),
    );
  }
});
test("Hidden faces cut uses the same active domain for source and neighbor", () => {
  const c = makeChunk(2),
    before = c.slice(),
    r = buildMesh(c, true, 0);
  assert.equal(r.solid, 256);
  assert.equal(r.keys.length, 576);
  assert.equal(r.mesh.length, 1152);
  assert.deepEqual(c, before);
  assert.ok(keepFace(c, 8, 0, 8, 2, 0));
  assert.ok(!keepFace(c, 8, 0, 8, 2, 15));
  assert.equal(buildMesh(c, true, 0, 4).keys.length, 1536); // Before Lesson05, cut disabled.
});
test("Hidden faces inspector separates Air, boundary, cut, opaque and missing source", () => {
  const c = makeChunk(3);
  assert.match(inspectFace(c, [7, 8, 8], 0, 15).reason, /Air/);
  assert.match(inspectFace(c, [15, 7, 7], 0, 15).reason, /ngoài chunk/);
  assert.match(inspectFace(c, [7, 7, 7], 2, 7).reason, /mặt cắt/);
  assert.match(inspectFace(c, [7, 7, 7], 0, 15).reason, /opaque/);
  assert.equal(inspectFace(c, [8, 8, 8], 0, 15).sourceSolid, false);
  assert.throws(() => inspectFace(c, [16, 0, 0], 0, 15), RangeError);
});
test("Hidden faces cache rebuilds only geometry and never reruns idle work", () => {
  const c = makeChunk(2),
    cache = createCache();
  assert.ok(update(cache, c, true, 15, defaultCamera));
  assert.equal(cache.rebuilds, 1);
  assert.equal(cache.rasterizations, 1);
  assert.equal(update(cache, c, true, 15, defaultCamera), false);
  cache.frameDirty = true;
  update(cache, c, true, 15, orbit(defaultCamera, 8, 0));
  assert.equal(cache.rebuilds, 1);
  assert.equal(cache.rasterizations, 2);
  cache.meshDirty = true;
  update(cache, c, true, 0, defaultCamera);
  assert.equal(cache.rebuilds, 2);
  assert.equal(cache.rasterizations, 3);
  assert.equal(cache.built.mesh.length, 1152);
});
test("Hidden faces preserve surface depth from multiple cameras with clipping", () => {
  for (const p of [2, 3, 6])
    for (const yaw of [-0.8, 0.7]) {
      const c = makeChunk(p),
        camera = { ...defaultCamera, yaw },
        a = raster(buildMesh(c, false, 7).mesh, camera),
        b = raster(buildMesh(c, true, 7).mesh, camera);
      let coverage = 0;
      for (let i = 0; i < a.depth.length; i++) {
        assert.equal(Number.isFinite(a.depth[i]), Number.isFinite(b.depth[i]));
        if (Number.isFinite(a.depth[i])) {
          coverage++;
          assert.ok(Math.abs(a.depth[i] - b.depth[i]) < 1e-8);
        }
      }
      assert.ok(coverage > 1000);
    }
});
test("Hidden faces reject malformed chunk and invalid slice/direction", () => {
  assert.throws(() => buildMesh(new Uint8Array(2), true), RangeError);
  assert.throws(() => buildMesh(makeChunk(2), true, 16), RangeError);
  assert.throws(() => keepFace(makeChunk(2), 0, 0, 0, 6, 15), RangeError);
  assert.throws(() => makeChunk(7), RangeError);
});
