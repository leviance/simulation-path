import assert from "node:assert/strict";
import test from "node:test";
import { cross3, dot3, magnitude3, scale3, subtract3 } from "../lib/labs/normal.ts";
import {
  defaultCamera,
  makeProjector,
  orbit,
  pan,
  zoom,
} from "../lib/labs/geometry-workshop/camera.ts";
import {
  inspectCell,
  inspectSeam,
  objFaceRecord,
  readObjFaceRecord,
} from "../lib/labs/geometry-workshop/inspection.ts";
import { buildMesh, MeshBuild } from "../lib/labs/geometry-workshop/mesh.ts";
import { createRasterBuffer, rasterize } from "../lib/labs/geometry-workshop/raster.ts";
import { MeshSession } from "../lib/labs/geometry-workshop/session.ts";
import {
  maxUSegments,
  maxVSegments,
  presetSettings,
} from "../lib/labs/geometry-workshop/settings.ts";
import {
  sampleMobius,
  samplePatch,
  sampleTorus,
  surfaceNormal,
} from "../lib/labs/geometry-workshop/surfaces.ts";
import {
  buildSweepFrames,
  sampleKnotCurve,
  sampleShellCurve,
  transportNormal,
} from "../lib/labs/geometry-workshop/sweep.ts";

function close(actual, expected, tolerance = 1e-10) {
  assert.ok(Math.abs(actual - expected) <= tolerance, actual + " != " + expected);
}

function closeVec(actual, expected, tolerance) {
  close(magnitude3(subtract3(actual, expected)), 0, tolerance);
}

function curveDerivative(evaluate, t, step = 1e-6) {
  return scale3(subtract3(evaluate(t + step).position, evaluate(t - step).position), 0.5 / step);
}

test("patch position, analytic tangents and normal agree with independent landmarks and differences", () => {
  const sample = samplePatch(0.5, 0.5, 0.8);
  closeVec(sample.position, { x: 0, y: 0, z: 0 });
  closeVec(sample.tangentU, { x: 3.1, y: 0, z: 0 });
  closeVec(sample.tangentV, { x: 0, y: -0.8 * Math.PI, z: 2.5 });
  closeVec(surfaceNormal(samplePatch(0.5, 0.5, 0)), { x: 0, y: 1, z: 0 });
  assert.ok(surfaceNormal(sample).z > 0.5);
  const u = 0.24;
  const v = 0.35;
  const point = samplePatch(u, v, 0.9);
  closeVec(
    point.tangentU,
    curveDerivative((s) => samplePatch(s, v, 0.9), u),
    1e-7,
  );
  closeVec(
    point.tangentV,
    curveDerivative((s) => samplePatch(u, s, 0.9), v),
    1e-7,
  );
  close(dot3(surfaceNormal(point), point.tangentU), 0);
  close(dot3(surfaceNormal(point), point.tangentV), 0);
});

test("the patch emits two triangles per cell and the winding experiment reverses only the first", () => {
  const settings = presetSettings("patch");
  const mesh = buildMesh(settings);
  assert.equal(mesh.vertices.length, 63);
  assert.equal(mesh.indices.length / 3, 96);
  assert.deepEqual(inspectCell(mesh, 0, 0).corners, { a: 0, b: 1, c: 7, d: 8 });
  assert.deepEqual(mesh.indices.slice(0, 6), [0, 1, 7, 1, 8, 7]);
  const altered = buildMesh({ ...settings, reverseWinding: true });
  assert.deepEqual(altered.indices.slice(0, 6), [0, 7, 1, 1, 8, 7]);
  assert.deepEqual(altered.vertices, mesh.vertices);
  const [a, b, c] = mesh.indices.slice(0, 3).map((index) => mesh.vertices[index]);
  const ab = subtract3(b.position, a.position);
  const ac = subtract3(c.position, a.position);
  assert.ok(dot3(cross3(ab, ac), a.normal) > 0);
});

test("torus cardinal landmarks and bounds match while both seams retain separate UVs", () => {
  const outer = sampleTorus(0, 0, 2, 0.5);
  closeVec(outer.position, { x: 2.5, y: 0, z: 0 });
  closeVec(surfaceNormal(outer), { x: 1, y: 0, z: 0 });
  const inner = sampleTorus(0, Math.PI, 2, 0.5);
  closeVec(inner.position, { x: 1.5, y: 0, z: 0 });
  closeVec(surfaceNormal(inner), { x: -1, y: 0, z: 0 });
  const mesh = buildMesh({ ...presetSettings("torus"), radius: 2, thickness: 0.5 });
  for (const [axis, extent] of [
    ["x", 2.5],
    ["y", 0.5],
    ["z", 2.5],
  ]) {
    const coordinates = mesh.vertices.map(({ position }) => position[axis]);
    close(Math.min(...coordinates), -extent);
    close(Math.max(...coordinates), extent);
  }
  const seam = inspectSeam(mesh, 0.25);
  assert.equal(seam.gap, 0);
  close(seam.normalDot, 1);
  assert.deepEqual(
    [seam.start.uv, seam.end.uv],
    [
      [0, 0.25],
      [1, 0.25],
    ],
  );
  for (let row = 0; row <= mesh.settings.uSegments; ++row) {
    const start = mesh.vertices[row * (mesh.settings.vSegments + 1)];
    const end = mesh.vertices[row * (mesh.settings.vSegments + 1) + mesh.settings.vSegments];
    assert.deepEqual(start.position, end.position);
    assert.deepEqual(start.normal, end.normal);
    assert.deepEqual([start.uv[1], end.uv[1]], [0, 1]);
  }
});

test("odd Möbius twists reverse the seam column and its transverse tangent", () => {
  for (const halfTwists of [1, 3, 5]) {
    const u = 0.73;
    const v = 0.24;
    const left = sampleMobius(u + 2 * Math.PI, v, 1.65, halfTwists);
    const right = sampleMobius(u, -v, 1.65, halfTwists);
    closeVec(left.position, right.position);
    closeVec(left.tangentV, scale3(right.tangentV, -1));
    const mesh = buildMesh({ ...presetSettings("mobius"), halfTwists });
    const seam = inspectSeam(mesh, 0.25);
    assert.deepEqual([seam.startColumn, seam.endColumn], [9, 3]);
    assert.equal(seam.gap, 0);
    close(seam.normalDot, -1);
    close(dot3(seam.start.tangentV, seam.end.tangentV), -1);
  }
});

test("frame transport follows a right-angle turn and shell frames keep a continuous oriented section", () => {
  const x = { x: 1, y: 0, z: 0 };
  const y = { x: 0, y: 1, z: 0 };
  closeVec(transportNormal(y, x, y), scale3(x, -1));
  closeVec(transportNormal(y, x, x), y);
  assert.throws(() => transportNormal(y, x, scale3(x, -1)), /đối hướng/);
  const settings = presetSettings("shell");
  const evaluate = (s) => sampleShellCurve(s, settings);
  const t = 0.42;
  closeVec(evaluate(t).derivative, curveDerivative(evaluate, t), 1e-6);
  close(evaluate(1).sectionRadius, settings.thickness);
  const narrower = sampleShellCurve(0, { ...settings, shellGrowth: 2.4 });
  assert.ok(narrower.sectionRadius < evaluate(0).sectionRadius);
  const sweep = buildSweepFrames(settings);
  assert.equal(sweep.closedSeam, false);
  for (const [index, frame] of sweep.frames.entries()) {
    close(magnitude3(frame.normal), 1);
    close(dot3(frame.normal, frame.tangent), 0);
    closeVec(cross3(frame.tangent, frame.normal), frame.binormal);
    const previous = sweep.frames[index - 1];
    if (previous) {
      assert.ok(frame.lengthFromStart > previous.lengthFromStart);
      assert.ok(dot3(previous.normal, frame.normal) > 0.65);
    }
  }
});

test("knot frames close at their original coordinates only after distributing the residual rotation", () => {
  const settings = presetSettings("knot");
  const evaluate = (s) => sampleKnotCurve(s, settings);
  closeVec(evaluate(0).position, { x: 1.37 * settings.radius, y: 0, z: 0 });
  closeVec(evaluate(1).position, evaluate(0).position);
  closeVec(evaluate(0.24).derivative, curveDerivative(evaluate, 0.24), 1e-6);
  const corrected = buildMesh({ ...settings, sectionTurns: 1 });
  const raw = buildMesh({ ...settings, correctKnotSeam: false });
  assert.ok(Math.abs(raw.sweep.correction) > 0.2);
  assert.ok(inspectSeam(raw, 0.25).gap > 0.05);
  assert.equal(inspectSeam(corrected, 0.25).gap, 0);
  close(inspectSeam(corrected, 0.25).normalDot, 1);
  closeVec(corrected.sweep.frames[0].normal, corrected.sweep.frames.at(-1).normal);
  const five = buildMesh({ ...settings, knotLobes: 5 });
  assert.ok(
    magnitude3(subtract3(five.sweep.frames[8].center, corrected.sweep.frames[8].center)) > 0.1,
  );
});

test("mesh construction is bounded per batch and rejects counts above the web budget", () => {
  const settings = { ...presetSettings("knot"), uSegments: maxUSegments, vSegments: maxVSegments };
  const build = new MeshBuild(settings);
  assert.throws(() => build.takeMesh(), /chưa đủ hàng/);
  let rows = 0;
  for (let batch = 0; batch < 13; ++batch) {
    build.advance();
    assert.ok(build.completedRows - rows <= 8);
    rows = build.completedRows;
  }
  const mesh = build.takeMesh();
  assert.equal(rows, 97);
  assert.equal(mesh.vertices.length, 3977);
  assert.equal(mesh.indices.length / 3, 7680);
  assert.ok(
    mesh.indices.every((id) => Number.isInteger(id) && id >= 0 && id < mesh.vertices.length),
  );
  assert.throws(() => new MeshBuild({ ...settings, uSegments: 97 }), /miền hợp lệ/);
});

test("preview coalesces input, waits for release, advances in bounded rows and preserves last-good", () => {
  const settings = presetSettings("shell");
  const session = new MeshSession(settings);
  const original = session.read().lastGood;
  session.request({ ...settings, shellGrowth: 1.9 }, true);
  session.request({ ...settings, shellGrowth: 2.3, uSegments: 96, vSegments: 40 }, true);
  assert.equal(session.read().builds, 1);
  session.advance();
  let state = session.read();
  assert.equal(state.displayed.settings.shellGrowth, 2.3);
  assert.equal(state.displayed.vertices.length, 1105);
  assert.equal(state.waitingForRelease, true);
  assert.equal(session.advance(), false);
  assert.equal(state.lastGood, original);
  session.finishInteraction();
  session.advance();
  assert.equal(session.read().completedRows, 8);
  session.cancel();
  state = session.read();
  assert.equal(state.displayed, original);
  assert.equal(state.requested, null);

  session.request({ ...settings, shellGrowth: 2.3, uSegments: 96, vSegments: 40 });
  session.advance();
  for (let batch = 0; batch < 13; ++batch) session.advance();
  state = session.read();
  assert.equal(state.isPreview, false);
  assert.equal(state.displayed.vertices.length, 3977);
  assert.equal(state.publications, 2);
  assert.equal(session.request({ ...settings, thickness: 5 }), false);
  assert.equal(session.read().lastGood, state.lastGood);
  assert.equal(session.advance(), false);
});

test("the OBJ face inspector reads one-based corners and rejects invalid workshop records", () => {
  const mesh = buildMesh(presetSettings("torus"));
  assert.equal(objFaceRecord(mesh, 0), "f 1/1/1 2/2/2 26/26/26");
  assert.deepEqual(readObjFaceRecord(objFaceRecord(mesh, 0), mesh.vertices.length), [0, 1, 25]);
  assert.equal(readObjFaceRecord(objFaceRecord(mesh, 0, false), mesh.vertices.length), null);
  assert.equal(readObjFaceRecord("f 1/1/1 2/2/2 3/3/3", 2), null);
  assert.equal(readObjFaceRecord("f 1/1/1 2/1/2 3/3/3", 3), null);
  assert.equal(readObjFaceRecord("f 1/1/1 2/2/2 2/2/2", 3), null);
  assert.throws(() => objFaceRecord(mesh, -1), /Không có mặt/);
});

const viewOptions = {
  wireframe: false,
  uv: false,
  cullBack: false,
  highlightFace: null,
  highlightCell: false,
};

test("orthographic camera changes the view without changing mesh settings or indices", () => {
  const camera = defaultCamera();
  const world = { x: 1, y: 0.3, z: 0 };
  const position = makeProjector(camera, 440, 320)(world);
  const panned = makeProjector(pan(camera, 20, -14, 440, 320), 440, 320)(world);
  close(panned.x - position.x, 20);
  close(panned.y - position.y, -14);
  assert.notDeepEqual(makeProjector(orbit(camera, 120, 80), 440, 320)(world), position);
  assert.notDeepEqual(makeProjector(zoom(camera, 2), 440, 320)(world), position);
  const session = new MeshSession(presetSettings("torus"));
  rasterize(createRasterBuffer(200, 160), session.read().displayed, camera, viewOptions);
  assert.equal(session.read().builds, 1);
});

test("Canvas depth keeps the near triangle when a farther triangle is submitted last", () => {
  const flat = (z) =>
    [
      { x: -1, y: -0.8, z },
      { x: 1, y: -0.8, z },
      { x: 0, y: 0.8, z },
    ].map((position) => ({
      position,
      normal: { x: 0, y: 0, z: 1 },
      tangentU: { x: 1, y: 0, z: 0 },
      tangentV: { x: 0, y: 1, z: 0 },
      uv: [0.3, 0.25],
    }));
  const mesh = {
    settings: presetSettings("patch"),
    vertices: [...flat(1), ...flat(0)],
    indices: [0, 1, 2, 3, 4, 5],
    sweep: null,
    minimumY: -0.8,
  };
  const camera = { target: { x: 0, y: 0, z: 0 }, yaw: Math.PI / 2, pitch: 0, zoom: 1 };
  const target = createRasterBuffer(160, 140);
  rasterize(target, mesh, camera, { ...viewOptions, cullBack: true });
  assert.equal(target.faces[64 * 160 + 80], 0);
  close(target.depth[64 * 160 + 80], -1);
  assert.equal(target.pixels[(64 * 160 + 80) * 4 + 3], 255);
});

test("all presets paint lit surface pixels and the UV view changes colors at the same depth", () => {
  const camera = defaultCamera();
  const target = createRasterBuffer(280, 240);
  for (const kind of ["patch", "torus", "mobius", "shell", "knot"]) {
    const mesh = buildMesh(presetSettings(kind));
    rasterize(target, mesh, camera, viewOptions);
    assert.ok(target.faces.filter((face) => face >= 0).length > 1500, kind);
    const oldFaces = target.faces.slice();
    const oldColors = target.pixels.slice();
    rasterize(target, mesh, camera, { ...viewOptions, uv: true });
    assert.deepEqual(target.faces, oldFaces, kind);
    assert.notDeepEqual(target.pixels, oldColors, kind);
  }
  assert.throws(() => createRasterBuffer(641, 420), /vượt giới hạn/);
});
