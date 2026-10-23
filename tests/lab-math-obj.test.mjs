import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { componentCallback, canvasCallback } from "./lab-handler-support.mjs";
import { renderObjFrame } from "../lib/labs/obj-frame.ts";
import { advanceObjViewer, initialObjViewer, turnObjViewer } from "../lib/labs/obj-controls.ts";
import {
  OBJ_PRESETS,
  buildObjScene,
  normalizeObjMesh,
  objBoundsCenter,
  objBoundsMaxExtent,
  objMeshBounds,
  parseObjSource,
  resolveObjPositionIndex,
  clipObjPolygon,
  objWorldToCamera,
  objStage,
  objFaceIndexLabels,
} from "../lib/labs/obj-viewer.ts";
import { renderZTriangles, zFrameDifference } from "../lib/labs/z-buffer.ts";

test("OBJ Canvas math resolves face tokens, triangulates and normalizes like C++", () => {
  assert.equal(resolveObjPositionIndex("1", 5), 0);
  assert.equal(resolveObjPositionIndex("5/2/8", 5), 4);
  assert.equal(resolveObjPositionIndex("-1//3", 5), 4);
  assert.equal(resolveObjPositionIndex("-5", 5), 0);
  assert.equal(resolveObjPositionIndex("0", 5), null);
  assert.equal(resolveObjPositionIndex("-6", 5), null);
  assert.equal(resolveObjPositionIndex("/2/3", 5), null);

  const quad = parseObjSource(OBJ_PRESETS.slash);
  assert.equal(quad.diagnostics.length, 0);
  assert.equal(quad.mesh.positions.length, 4);
  assert.equal(quad.mesh.sourceFaceCount, 1);
  assert.deepEqual(
    quad.mesh.triangles.map((triangle) => triangle.indices),
    [
      [0, 1, 2],
      [0, 2, 3],
    ],
  );

  const normalized = normalizeObjMesh(quad.mesh);
  assert.ok(normalized);
  const bounds = objMeshBounds(normalized.mesh);
  assert.ok(bounds);
  assert.deepEqual(objBoundsCenter(bounds), { x: 0, y: 0, z: 0 });
  assert.equal(objBoundsMaxExtent(bounds), 2);
  assert.equal(normalized.uniformScale, 1);
  assert.equal(
    objFaceIndexLabels(OBJ_PRESETS.slash, quad.mesh, 1),
    "1→0 · 3→2 · 4→3",
    "fan inspector keeps the original corner tokens",
  );
});

test("P21 parser gates each teaching stage and rejects unsupported or malformed geometry", () => {
  const triangle = OBJ_PRESETS.triangle;
  assert.equal(parseObjSource(triangle, 1).mesh.triangles.length, 0);
  assert.equal(parseObjSource(triangle, 2).diagnostics.length, 1);
  assert.equal(parseObjSource(triangle, 3).mesh.triangles.length, 1);
  assert.ok(parseObjSource(OBJ_PRESETS.cube, 3).diagnostics.length > 0);
  assert.equal(parseObjSource(OBJ_PRESETS.cube, 4).mesh.triangles.length, 12);
  for (const token of ["1/", "1///2", "1/foo", "1//0", "1/2/3/4", "0", "2147483648"])
    assert.equal(resolveObjPositionIndex(token, 5), null, token);
  const relative = parseObjSource("v 0 0 0\nv 1 0 0\nv 0 1 0\nf -3 -2 -1\nv 2 2 2");
  assert.deepEqual(relative.mesh.triangles[0].indices, [0, 1, 2]);
  const relativeSource = "v 0 0 0\nv 1 0 0\nv 0 1 0\nf -3 -2 -1\nv 2 2 2";
  assert.equal(objFaceIndexLabels(relativeSource, relative.mesh, 0), "-3→0 · -2→1 · -1→2");
  const unsupported = parseObjSource("v 0 0 0\ncurv 1 2 3");
  assert.equal(unsupported.diagnostics[0].line, 2);
  assert.match(unsupported.diagnostics[0].message, /curv/);
  for (const line of ["v 0x10 0 0", "v 1 2 3oops", "v 1 2 3 4", "v NaN 0 0", "v 1000001 0 0"])
    assert.ok(parseObjSource(line).diagnostics.length > 0, line);
  const concave = "v 0 0 0\nv 2 0 0\nv 1 0.4 0\nv 2 2 0\nv 0 2 0\nf 1 2 3 4 5";
  assert.equal(parseObjSource(concave).mesh.triangles.length, 0);
  assert.ok(parseObjSource(concave).diagnostics.length > 0);
  const star = OBJ_PRESETS.negative.replace("f -5 -4 -3 -2 -1", "f 1 3 5 2 4");
  assert.ok(
    parseObjSource(star).diagnostics.length > 0,
    "self-crossing polygon cannot pass convex test",
  );
  assert.equal(objStage("obj-indices"), 3);
  const tiny = parseObjSource("v 0 0 0\nv 0.000001 0 0\nv 0 0.000001 0\nf 1 2 3");
  assert.deepEqual(tiny.diagnostics, [], "convex test must use a scale-relative area tolerance");
  assert.ok(normalizeObjMesh(tiny.mesh));
});

test("P21 real native assets parse in Canvas and near clipping preserves order independence", async () => {
  for (const [file, count] of [
    ["cube.obj", 12],
    ["faceted-sphere.obj", 2976],
    ["low-poly-rocket.obj", 32],
  ]) {
    const text = await readFile(
      new URL("../examples/project-21-obj-mesh-viewer/assets/" + file, import.meta.url),
      "utf8",
    );
    const parsed = parseObjSource(text);
    assert.deepEqual(parsed.diagnostics, [], file);
    assert.equal(parsed.mesh.triangles.length, count);
    if (file === "cube.obj" || file === "low-poly-rocket.obj") {
      const preset = parseObjSource(OBJ_PRESETS[file === "cube.obj" ? "cube" : "rocket"]);
      assert.deepEqual(
        preset.mesh.positions,
        parsed.mesh.positions,
        "Canvas preset must match native asset positions",
      );
      assert.deepEqual(
        preset.mesh.triangles.map((t) => t.indices),
        parsed.mesh.triangles.map((t) => t.indices),
        "Canvas preset must match native asset topology",
      );
    }
    const mesh = normalizeObjMesh(parsed.mesh).mesh;
    const scene = buildObjScene(mesh, 64, 40, -0.85, 0.65, false, {
      yaw: 0.31,
      pitch: -0.17,
      distance: 1.1,
    });
    assert.ok(scene.clippedCount > 0, file);
    assert.ok(
      scene.triangles.every((t) =>
        [t.a, t.b, t.c].every((p) => [p.x, p.y, p.ndcDepth].every(Number.isFinite)),
      ),
    );
    const forward = renderZTriangles(scene.triangles, 64, 40),
      reverse = renderZTriangles(scene.triangles, 64, 40, { reverseOrder: true });
    assert.ok(forward.passedCount > 0);
    assert.deepEqual(zFrameDifference(forward, reverse), { colorPixels: 0, depthPixels: 0 });
  }
  const clipped = clipObjPolygon([
    { x: -1, y: 0, z: 0.2 },
    { x: 1, y: -1, z: 2 },
    { x: 0, y: 1, z: 2 },
  ]);
  assert.equal(clipped.length, 4);
  assert.ok(clipped.every((p) => p.z >= 0.7));
});

test("P21 camera and model controls preserve shape, pause and fixed single step", () => {
  const state = initialObjViewer();
  const orbit = turnObjViewer({ ...state, cameraDrag: true }, 0.3, 0.2);
  assert.equal(orbit.angleY, state.angleY);
  assert.equal(orbit.cameraYaw, 0.3);
  const model = turnObjViewer(orbit, 0.2, 0.1);
  assert.equal(model.angleY, state.angleY, "camera mode stays selected");
  const turned = turnObjViewer({ ...orbit, cameraDrag: false }, 0.2, 0.1);
  assert.equal(turned.cameraYaw, orbit.cameraYaw);
  const camera = { yaw: orbit.cameraYaw, pitch: orbit.cameraPitch, distance: 4.2 };
  const quarterView = objWorldToCamera(
    { x: 0, y: 1, z: 0 },
    { yaw: Math.PI / 2, pitch: 0.6, distance: 4.2 },
  );
  assert.ok(
    Math.abs(quarterView.z - (4.2 - Math.sin(0.6))) < 1e-12,
    "orbit pitch must remain effective at ninety-degree yaw",
  );
  const origin = objWorldToCamera({ x: 0, y: 0, z: 0 }, camera);
  assert.ok(Math.hypot(origin.x, origin.y) < 1e-12);
  assert.ok(Math.abs(origin.z - camera.distance) < 1e-12);
  assert.equal(advanceObjViewer(state, 0.5), state);
  assert.ok(
    Math.abs(advanceObjViewer(state, 1 / 60, true).angleY - state.angleY - 0.45 / 60) < 1e-12,
  );
  assert.equal(advanceObjViewer(state, NaN, true), state);
});

test("P21 Canvas rejects pathological overdraw before allocating coverage", () => {
  const t = {
    a: { x: 0, y: 0, ndcDepth: 0.2 },
    b: { x: 256, y: 0, ndcDepth: 0.2 },
    c: { x: 128, y: 160, ndcDepth: 0.2 },
    color: { red: 20, green: 30, blue: 40 },
    face: "overdraw",
  };
  const result = renderObjFrame(
    Array.from({ length: 6000 }, () => t),
    256,
    160,
  );
  assert.match(result.message, /ngân sách/);
  assert.equal(
    result.frame.passedCount,
    0,
    "must not present a partially rendered model as success",
  );
  assert.ok(result.candidates < 1600000, "preflight stops as soon as budget is exceeded");
  const ordinary = renderObjFrame([t], 256, 160);
  assert.equal(ordinary.message, "");
  assert.ok(ordinary.frame.passedCount > 0);
});

test("P21 actual pointer callbacks capture one owner, include final-up and cancel safely", async () => {
  const drag = { current: null },
    current = { current: initialObjViewer() };
  let capturing = false,
    captured = false,
    focused = false;
  const canvas = {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 800 }),
    focus() {
      focused = true;
    },
    setPointerCapture() {
      captured = true;
    },
    hasPointerCapture() {
      return captured;
    },
    releasePointerCapture() {
      captured = false;
    },
  };
  const canvasRef = { current: canvas };
  const commit = (next) => {
    current.current = next;
  };
  const setCapturing = (next) => {
    capturing = next;
  };
  const cancel = await componentCallback("obj-viewer-lab.tsx", "cancel", {
    drag,
    canvasRef,
    setCapturing,
  });
  const down = await componentCallback("obj-viewer-lab.tsx", "pointerDown", {
    drag,
    current,
    commit,
    setCapturing,
  });
  const move = await componentCallback("obj-viewer-lab.tsx", "pointerMove", {
    drag,
    current,
    commit,
    cancel,
    turnObjViewer,
  });
  const up = await componentCallback("obj-viewer-lab.tsx", "pointerUp", {
    drag,
    pointerMove: move,
    cancel,
  });
  const event = {
    pointerId: 7,
    button: 0,
    buttons: 1,
    clientX: 410,
    clientY: 220,
    currentTarget: canvas,
    preventDefault() {},
  };
  down(event);
  assert.ok(focused && captured && capturing);
  const original = current.current.angleY;
  move({ ...event, pointerId: 8, clientX: 510 });
  assert.equal(current.current.angleY, original);
  up({ ...event, pointerId: 8, type: "pointerup", buttons: 0 });
  assert.ok(drag.current);
  up({ ...event, clientX: 510, type: "pointerup", buttons: 0 });
  assert.ok(Math.abs(current.current.angleY - original - 0.8) < 1e-12);
  assert.equal(drag.current, null);
  assert.equal(captured, false);
  assert.equal(capturing, false);
  down(event);
  const onCancel = await canvasCallback("obj-viewer-lab.tsx", "onPointerCancel", { drag, cancel });
  onCancel({ pointerId: 8 });
  assert.ok(drag.current);
  onCancel({ pointerId: 7 });
  assert.equal(drag.current, null);
  canvas.setPointerCapture = () => {
    throw new Error("pointer no longer active");
  };
  assert.doesNotThrow(() => down(event));
  assert.equal(drag.current, null);
  assert.equal(capturing, false);
  assert.equal(current.current.paused, true);
});

test("P21 actual keyboard callback leaves Tab/modifiers alone and gates future controls", async () => {
  for (const stage of [1, 6, 7, 8]) {
    const current = { current: initialObjViewer(stage) };
    let prevented = 0;
    const change = (patch) => {
      current.current = { ...current.current, ...patch };
    };
    const key = await componentCallback("obj-viewer-lab.tsx", "keyDown", {
      stage,
      current,
      change,
      commit: (next) => {
        current.current = next;
      },
      cancel() {},
      turnObjViewer,
      reset() {},
      step() {},
      reducedMotion: false,
    });
    const event = {
      key: "Tab",
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      nativeEvent: { isComposing: false },
      repeat: false,
      preventDefault() {
        prevented++;
      },
    };
    const initial = current.current;
    key(event);
    key({ ...event, key: "v", ctrlKey: true });
    assert.equal(current.current, initial);
    assert.equal(prevented, 0);
    key({ ...event, key: "v" });
    assert.equal(current.current.cameraDrag, stage >= 8);
    key({ ...event, key: "n" });
    assert.equal(current.current.normals, stage >= 6);
    key({ ...event, key: "ArrowRight" });
    assert.equal(prevented, 1);
  }
});

test("OBJ Canvas renderer keeps Z-buffer output independent of face order", () => {
  const parsed = parseObjSource(OBJ_PRESETS.rocket);
  const normalized = normalizeObjMesh(parsed.mesh);
  assert.ok(normalized);
  const scene = buildObjScene(normalized.mesh, 72, 48, -0.35, 0.65, false);
  assert.ok(scene.triangles.length > 0);
  assert.ok(scene.triangles.every((triangle) => Number.isFinite(triangle.intensity)));

  const forward = renderZTriangles(scene.triangles, 72, 48);
  const reverse = renderZTriangles(scene.triangles, 72, 48, { reverseOrder: true });
  assert.deepEqual(zFrameDifference(forward, reverse), { colorPixels: 0, depthPixels: 0 });
  assert.ok(forward.passedCount > 0);
  assert.ok(forward.rejectedCount > 0);

  const malformed = parseObjSource(OBJ_PRESETS.malformed);
  assert.equal(malformed.mesh.triangles.length, 0);
  assert.equal(malformed.diagnostics.length, 3);
  assert.deepEqual(
    malformed.diagnostics.map((diagnostic) => diagnostic.line),
    [3, 4, 5],
  );
});
