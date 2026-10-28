import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as viewer from "../lib/labs/dual-renderer-cube.ts";
import { parseObjSource } from "../lib/labs/obj-parser.ts";

test("viewer preserves canonical rocket, sphere and cube datasets", async () => {
  const models = viewer.viewerModels();
  assert.deepEqual(
    models.map((m) => m.indices.length / 3),
    [32, 2976, 12],
  );
  assert.equal(models[2].vertices.length, 24);
  assert.ok(
    models.every((m) =>
      m.indices.every((i) => Number.isInteger(i) && i >= 0 && i < m.vertices.length),
    ),
  );
  const source = await readFile(
    new URL("../examples/project-21-obj-mesh-viewer/assets/faceted-sphere.obj", import.meta.url),
    "utf8",
  );
  const actual = parseObjSource(viewer.viewerSphereSource()).mesh,
    expected = parseObjSource(source).mesh;
  assert.equal(actual.positions.length, 1490);
  assert.deepEqual(
    actual.triangles.map((t) => t.indices),
    expected.triangles.map((t) => t.indices),
  );
  actual.positions.forEach((p, i) => {
    for (const key of ["x", "y", "z"])
      assert.ok(Math.abs(p[key] - expected.positions[i][key]) <= 1e-7);
  });
});

test("viewer camera is RH, target centered, object/camera/pan/zoom independent", () => {
  const scene = viewer.initialViewerScene();
  scene.view.angleX = scene.view.angleY = 0;
  const matrices = viewer.viewerMatrices(scene, 1.7);
  const center = viewer.transformVector(matrices.mvp, { x: 0, y: 0, z: 0, w: 1 });
  assert.ok(Math.abs(center.x) < 1e-10 && Math.abs(center.y) < 1e-10 && center.w > 0);
  scene.view.cameraDrag = true;
  const moved = viewer.turnViewer(scene, 0.2, -0.3);
  assert.equal(moved.view.angleY, scene.view.angleY);
  assert.notEqual(moved.view.cameraYaw, scene.view.cameraYaw);
  const pan = viewer.panViewer(moved, 30, -20, 500);
  assert.equal(pan.view.angleY, moved.view.angleY);
  assert.notEqual(pan.targetX, moved.targetX);
  assert.equal(viewer.zoomViewer(scene, 1000).view.distance, 0.35);
  assert.equal(viewer.zoomViewer(scene, -1000).view.distance, 40);
  const original = structuredClone(scene);
  const trace = viewer.traceViewerVertex(
    viewer.viewerModels()[0].vertices[0].position,
    scene,
    320,
    240,
  );
  assert.ok(trace.screen && trace.screen.depth >= 0 && trace.screen.depth <= 1);
  assert.deepEqual(scene, original);
});

test("homogeneous clipping handles all six planes before divide", () => {
  for (let plane = 0; plane < 6; plane++) {
    const outside = { x: 0, y: 0, z: 0, w: 1 };
    outside[["x", "x", "y", "y", "z", "z"][plane]] = plane % 2 ? 2 : -2;
    const polygon = viewer.clipTriangle(
      outside,
      { x: 0.3, y: 0, z: 0, w: 1 },
      { x: 0, y: 0.3, z: 0, w: 1 },
    );
    assert.ok(polygon.length >= 3);
    for (const p of polygon)
      for (let j = 0; j < 6; j++) assert.ok(viewer.clipDistance(p, j) >= -1e-10);
  }
});

test("real meshes are deterministic, read-only and depth order independent", () => {
  for (const mesh of viewer.viewerModels()) {
    const scene = viewer.initialViewerScene();
    scene.view.grid = false;
    scene.view.cullBackfaces = false;
    const original = structuredClone(scene);
    const frame = viewer.renderViewer(mesh, scene, 160, 120);
    assert.ok(frame.passed > 0 && frame.submitted === mesh.indices.length / 3);
    assert.ok(frame.depth.every((z) => Number.isFinite(z) && z >= 0 && z <= 1));
    assert.deepEqual(scene, original);
    assert.deepEqual(viewer.renderViewer(mesh, scene, 160, 120).rgba, frame.rgba);
    scene.view.reverseOrder = true;
    assert.deepEqual(viewer.renderViewer(mesh, scene, 160, 120).rgba, frame.rgba);
  }
});

test("depth-off experiment exposes draw order, lighting/debug are shared scene options", () => {
  const mesh = viewer.viewerModels()[2],
    scene = viewer.initialViewerScene();
  scene.view.grid = false;
  scene.view.cullBackfaces = false;
  scene.depthEnabled = false;
  const first = viewer.renderViewer(mesh, scene, 120, 90);
  scene.view.reverseOrder = true;
  const reverse = viewer.renderViewer(mesh, scene, 120, 90);
  assert.notDeepEqual(first.rgba, reverse.rgba);
  assert.ok(first.depth.every((z) => z === 1));
  scene.depthEnabled = true;
  scene.lit = false;
  assert.notDeepEqual(viewer.renderViewer(mesh, scene, 120, 90).rgba, first.rgba);
  scene.view.normals = true;
  scene.view.wireframe = true;
  assert.ok(viewer.renderViewer(mesh, scene, 120, 90).passed > 0);
});

test("near/eye crossing and bounded viewport remain safe", () => {
  const scene = viewer.initialViewerScene();
  scene.view.distance = 0.35;
  const frame = viewer.renderViewer(viewer.viewerModels()[1], scene, 96, 72);
  assert.ok(frame.depth.every(Number.isFinite));
  assert.throws(() => viewer.renderViewer(viewer.viewerModels()[0], scene, 10000, 10000));
  assert.throws(() => viewer.viewerMatrices(scene, 0));
});
