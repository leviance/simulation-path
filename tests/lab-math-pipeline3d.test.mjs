import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  pipelineTransform,
  pipelineViewMatrix,
  pipelineProjectionMatrix,
  pipelineTranslationMatrix,
  pipelineScaleMatrix,
  pipelineMultiplyMatrices,
  pipelineToPoint,
  pipelineToDirection,
  pipelinePerspectiveDivide,
  pipelineNdcToScreen,
  trace3dPipeline,
  pipelineAgreementError,
} from "../lib/labs/pipeline3d.ts";
import {
  initialInspector,
  inspectorPreset,
  inspectorResults,
  inspectorStage,
  inspectorViewport,
  editInspector,
  inspectorParameterValue,
  advanceInspector,
  inspectorPick,
  inspectorLine,
  inspectorVisiblePoint,
  formatInspectorValue,
  INSPECTOR_VERTICES,
} from "../lib/labs/pipeline-inspector.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + " != " + b);
const same = (a, b) => {
  assert.ok(a);
  close(a.x, b.x);
  close(a.y, b.y);
  if ("z" in b) close(a.z, b.z);
  if ("w" in b) close(a.w, b.w);
};
test("P15 independent T*S, S*T and point/direction oracles lock column-vector convention", () => {
  const t = pipelineTranslationMatrix({ x: 3, y: -2, z: 5 }),
    s = pipelineScaleMatrix({ x: 2, y: 3, z: 4 }),
    p = { x: 1, y: 2, z: 3 };
  same(pipelineTransform(t, pipelineToPoint(p)), { x: 4, y: 0, z: 8, w: 1 });
  same(pipelineTransform(t, pipelineToDirection(p)), { ...p, w: 0 });
  same(pipelineTransform(pipelineMultiplyMatrices(t, s), pipelineToPoint(p)), {
    x: 5,
    y: 4,
    z: 17,
    w: 1,
  });
  same(pipelineTransform(pipelineMultiplyMatrices(s, t), pipelineToPoint(p)), {
    x: 8,
    y: 0,
    z: 32,
    w: 1,
  });
  assert.equal(t.values[3], 3);
  assert.equal(t.values[7], -2);
  assert.equal(t.values[11], 5);
});
test("P15 yaw/pitch and off-center focal/aspect have independent oracles", () => {
  const camera = { position: { x: 1, y: 2, z: 3 }, yaw: Math.PI / 2, pitch: 0 };
  same(pipelineTransform(pipelineViewMatrix(camera), pipelineToPoint({ x: 4, y: 2, z: 3 })), {
    x: 0,
    y: 0,
    z: 3,
    w: 1,
  });
  same(
    pipelineTransform(
      pipelineViewMatrix({ ...camera, yaw: 0, pitch: Math.PI / 2 }),
      pipelineToPoint({ x: 1, y: 5, z: 3 }),
    ),
    { x: 0, y: 0, z: 3, w: 1 },
  );
  const clip = pipelineTransform(
    pipelineProjectionMatrix(
      { verticalFovRadians: Math.PI / 2, nearPlane: 1, farPlane: 9 },
      1100 / 560,
    ),
    { x: 2, y: 1, z: 4, w: 1 },
  );
  same(pipelineNdcToScreen(pipelinePerspectiveDivide(clip), 1100, 560), { x: 690, y: 210 });
});
test("P15 hand-calculated oracle spans all six stages and does not derive expected from MVP", () => {
  const s = inspectorPreset(1),
    r = inspectorResults(s, 7),
    t = r.trace;
  same(t.local, { x: 1, y: 1, z: 0, w: 1 });
  same(t.world, { x: 1, y: 1, z: 4, w: 1 });
  same(t.camera, { x: 0, y: 1, z: 4, w: 1 });
  same(t.clip, { x: 0, y: 1, z: 27 / 8, w: 4 });
  same(t.ndc, { x: 0, y: 0.25, z: 27 / 32 });
  same(t.screen, { x: 550, y: 210 });
  assert.equal(t.status, "visible");
  assert.ok(r.values.every(Boolean));
  assert.ok(r.agreement < 1e-9);
});
test("P15 stages reveal only taught data while keeping a real 3D reference viewport", () => {
  const s = initialInspector();
  assert.deepEqual(
    [
      "pipeline-local",
      "pipeline-homogeneous",
      "pipeline-model",
      "pipeline-view",
      "pipeline-projection",
      "pipeline-viewport",
      "pipeline-validation",
    ].map(inspectorStage),
    [1, 2, 3, 4, 5, 6, 7],
  );
  for (const [stage, count] of [
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 3],
    [5, 4],
    [6, 6],
    [7, 6],
  ]) {
    const r = inspectorResults(s, stage);
    assert.equal(r.values.filter(Boolean).length, count);
    assert.ok(r.lines.length > 20);
    assert.ok(r.points.length > 0);
  }
  const r = inspectorResults(s, 2),
    p = s.vertices[6];
  same(r.translatedPoint, { x: p.x + 2, y: p.y + 1, z: p.z + 3, w: 1 });
  same(r.translatedDirection, { ...p, w: 0 });
});
test("P15 clipped coordinates remain truthful; w zero/negative never gets fake NDC/screen", () => {
  const expected = [
    "visible",
    "visible",
    "before-near",
    "behind",
    "beyond-far",
    "outside",
    "behind",
  ];
  for (let i = 0; i < 7; i++) {
    const r = inspectorResults(inspectorPreset(i), 7);
    assert.equal(r.trace.status, expected[i]);
    if (i === 3 || i === 6) {
      assert.equal(r.values[4], null);
      assert.equal(r.values[5], null);
    } else {
      assert.ok(r.trace.ndc);
      assert.ok(r.trace.screen);
    }
  }
  const outside = inspectorResults(inspectorPreset(5), 7);
  assert.ok(outside.trace.screen.x > 1100);
  assert.match(formatInspectorValue(null), /—/);
  assert.doesNotMatch(formatInspectorValue(null), /\(0/);
});
test("P15 finite guards reject bad lens, viewport, local, model and w before unsafe divide", () => {
  const s = initialInspector(),
    p = s.vertices[0];
  for (const w of [0, -1, 1e-12, NaN, Infinity])
    assert.equal(pipelinePerspectiveDivide({ x: 1, y: 2, z: 3, w }), null);
  assert.equal(pipelineNdcToScreen({ x: 0, y: 0, z: 0 }, 0, 560), null);
  for (const lens of [
    { ...s.lens, farPlane: s.lens.nearPlane },
    { ...s.lens, verticalFovRadians: Math.PI },
    { ...s.lens, nearPlane: NaN },
  ]) {
    const t = trace3dPipeline(p, s.model, s.camera, lens, 1100, 560);
    assert.equal(t.status, "invalid");
    assert.equal(t.clip, null);
    assert.equal(t.screen, null);
    assert.equal(pipelineAgreementError(p, s.model, s.camera, lens, 1100, 560), Infinity);
  }
  assert.equal(
    trace3dPipeline({ x: NaN, y: 0, z: 0 }, s.model, s.camera, s.lens, 1100, 560).local,
    null,
  );
  const invalid = inspectorResults({ ...s, selectedVertex: 99 }, 7);
  assert.equal(invalid.trace.status, "invalid");
  assert.equal(invalid.translatedPoint, null);
});
test("P15 near/far boundaries are inclusive and FOV cannot mutate upstream stages", () => {
  const s = inspectorPreset(1),
    base = inspectorResults(s, 7).trace;
  const wider = inspectorResults(editInspector(s, "fov", (110 * Math.PI) / 180), 7).trace;
  assert.deepEqual(wider.world, base.world);
  assert.deepEqual(wider.camera, base.camera);
  assert.notEqual(wider.clip.y, base.clip.y);
  close(wider.clip.w, base.clip.w);
  for (const z of [s.lens.nearPlane, s.lens.farPlane]) {
    const model = { position: { x: 1, y: 0, z }, scale: { x: 1, y: 1, z: 1 }, yaw: 0 };
    const boundary = trace3dPipeline({ x: 0, y: 0, z: 0 }, model, s.camera, s.lens, 1100, 560);
    assert.equal(boundary.status, "visible");
    close(boundary.ndc.z, z === s.lens.nearPlane ? 0 : 1);
  }
});
test("P15 scene controls are immutable and bound near/far, scale, camera pitch and finite inputs", () => {
  const s = initialInspector(),
    before = structuredClone(s);
  const near = editInspector(s, "near", 1000);
  close(near.lens.nearPlane, 29.95);
  const far = editInspector(near, "far", -1000);
  assert.ok(far.lens.farPlane > far.lens.nearPlane);
  assert.equal(editInspector(s, "modelYaw", NaN), s);
  close(editInspector(s, "cameraPitch", 100).camera.pitch, (89 * Math.PI) / 180);
  close(editInspector(s, "scaleX", -3).model.scale.x, -2);
  editInspector(s, "localX", 2);
  assert.deepEqual(s, before);
  assert.deepEqual(s.vertices, INSPECTOR_VERTICES);
});
test("P15 real-time rotation is dt independent and pause/invalid/stall policies are explicit", () => {
  for (const fps of [30, 60, 144]) {
    let s = { ...initialInspector(), paused: false };
    for (let i = 0; i < fps; i++) s = advanceInspector(s, 1 / fps);
    close(s.model.yaw, (55 * Math.PI) / 180);
  }
  const s = initialInspector();
  assert.equal(advanceInspector(s, 0.1), s);
  const moving = { ...s, paused: false };
  for (const dt of [NaN, Infinity, -1]) assert.equal(advanceInspector(moving, dt), moving);
  close(advanceInspector(moving, 2).model.yaw, s.model.yaw + (3.5 * Math.PI) / 180);
});
test("P15 real geometry clips crossings, picks visible vertices and survives clean mode", () => {
  const s = initialInspector(),
    r = inspectorResults(s, 7),
    p = inspectorVisiblePoint(s.vertices[6], s, 7);
  assert.equal(inspectorPick(p, s, 7), 6);
  assert.equal(inspectorPick({ x: 20, y: 700 }, s, 7), null);
  const crossing = inspectorLine({ x: -100, y: 1.6, z: 6 }, { x: 100, y: 1.6, z: 6 }, s, 7, "#fff");
  assert.ok(crossing);
  close(crossing.from.x, 0);
  close(crossing.to.x, 1099);
  const near = inspectorLine({ x: 0, y: 1.6, z: -1 }, { x: 0.1, y: 1.6, z: 4 }, s, 7, "#fff");
  assert.ok(near);
  const clean = inspectorResults({ ...s, debug: false }, 7);
  assert.ok(clean.lines.some((l) => l.color === "#28334d"));
  assert.ok(clean.lines.some((l) => l.color === "#74839f"));
  assert.ok(clean.points.some((p) => p.index === 6));
  assert.deepEqual(inspectorViewport({ ...s, debug: false }), { width: 1100, height: 800 });
  assert.equal(r.modelError < 1e-12, true);
});
const file = "pipeline3d-lab.tsx";
async function harness(stage = 7) {
  let scene = initialInspector(),
    captured = false;
  const canvas = {
    focus() {},
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
  const env = {
    sceneRef: { current: scene },
    drag: { current: null },
    dragModeRef: { current: "model" },
    setDragMode: () => {},
    canvasRef: { current: canvas },
    stage,
    DEG: Math.PI / 180,
    reducedMotion: false,
    size: { width: 550, height: 280, dpr: 2 },
    setCaptured: (v) => {
      captured = v;
    },
    commit: (s) => {
      scene = s;
      env.sceneRef.current = s;
    },
    inspectorPreset,
    editInspector,
    inspectorParameterValue,
    advanceInspector,
    inspectorPick,
    inspectorPointFromEvent: (e) => ({
      x: e.clientX,
      y: e.clientY,
      cssX: e.clientX,
      cssY: e.clientY,
    }),
  };
  env.cancelPointer = await componentCallback(file, "cancelPointer", env);
  const callbacks = {};
  for (const name of [
    "reset",
    "edit",
    "changeDragMode",
    "pauseForEnvironment",
    "selectVertex",
    "selectStage",
    "togglePause",
    "step",
    "toggleDebug",
    "movePointer",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onPointerCancel",
    "onKeyDown",
  ]) {
    callbacks[name] = await componentCallback(file, name, { ...env, ...callbacks });
    env[name] = callbacks[name];
  }
  return {
    env,
    callbacks,
    canvas,
    get scene() {
      return scene;
    },
    get captured() {
      return captured;
    },
  };
}
const pointer = (h, extra = {}) => ({
  currentTarget: h.canvas,
  pointerId: 1,
  isPrimary: true,
  button: 0,
  buttons: 1,
  pointerType: "mouse",
  clientX: 100,
  clientY: 100,
  preventDefault() {},
  ...extra,
});
test("P15 actual drag owns pointer, has no initial jump and applies the final up sample", async () => {
  const h = await harness(),
    c = h.callbacks,
    old = structuredClone(h.scene);
  c.onPointerDown(pointer(h));
  assert.equal(h.captured, true);
  assert.deepEqual(h.scene, old);
  c.onPointerMove(pointer(h, { pointerId: 2, clientX: 200 }));
  assert.deepEqual(h.scene, old);
  c.onPointerMove(pointer(h, { clientY: 130 }));
  assert.deepEqual(h.scene, old);
  c.onPointerMove(pointer(h, { clientX: 120, clientY: 125 }));
  close(h.scene.model.yaw, old.model.yaw + 0.12);
  assert.deepEqual(h.scene.camera, old.camera);
  assert.deepEqual(h.scene.vertices, old.vertices);
  const before = inspectorResults(old, 7),
    after = inspectorResults(h.scene, 7);
  assert.deepEqual(
    after.lines.filter((line) => line.color !== "#74839f"),
    before.lines.filter((line) => line.color !== "#74839f"),
  );
  c.onPointerUp(pointer(h, { clientX: 130, buttons: 0 }));
  close(h.scene.model.yaw, old.model.yaw + 0.18);
  assert.equal(h.captured, false);
  assert.equal(h.env.drag.current, null);
});
test("P15 view drag changes only the camera; switching modes cancels the old gesture", async () => {
  const h = await harness(),
    c = h.callbacks;
  c.onPointerDown(pointer(h));
  c.changeDragMode("view");
  assert.equal(h.captured, false);
  assert.equal(h.env.drag.current, null);
  assert.equal(h.scene.paused, true);
  const old = structuredClone(h.scene);
  c.onPointerUp(pointer(h, { clientX: 160, clientY: 150 }));
  assert.deepEqual(h.scene, old);
  c.onPointerDown(pointer(h));
  c.onPointerMove(pointer(h, { clientX: 120, clientY: 125 }));
  close(h.scene.camera.yaw, old.camera.yaw + 0.12);
  close(h.scene.camera.pitch, old.camera.pitch - 0.1);
  assert.deepEqual(h.scene.model, old.model);
  assert.deepEqual(h.scene.vertices, old.vertices);
  const before = inspectorResults(old, 7),
    after = inspectorResults(h.scene, 7);
  assert.deepEqual(after.trace.local, before.trace.local);
  assert.deepEqual(after.trace.world, before.trace.world);
  assert.notDeepEqual(after.trace.camera, before.trace.camera);
  assert.notDeepEqual(
    after.lines.filter((line) => line.color !== "#74839f"),
    before.lines.filter((line) => line.color !== "#74839f"),
  );
  c.onPointerUp(pointer(h, { clientX: 130, clientY: 130, buttons: 0 }));
  close(h.scene.camera.yaw, old.camera.yaw + 0.18);
  close(h.scene.camera.pitch, old.camera.pitch - 0.12);
  assert.equal(h.captured, false);
  c.reset();
  assert.equal(h.env.dragModeRef.current, "model");
  const early = await harness(3);
  early.callbacks.changeDragMode("view");
  assert.equal(early.env.dragModeRef.current, "model");
  c.changeDragMode("unknown");
  assert.equal(h.env.dragModeRef.current, "model");
});
test("P15 actual drag rejects secondary pointers/buttons, capture failure and lost mouse button", async () => {
  const h = await harness(),
    c = h.callbacks;
  c.onPointerDown(pointer(h, { button: 2 }));
  assert.equal(h.captured, false);
  c.onPointerDown(pointer(h, { isPrimary: false }));
  assert.equal(h.captured, false);
  h.canvas.setPointerCapture = () => {
    throw Error("capture");
  };
  c.onPointerDown(pointer(h));
  assert.equal(h.env.drag.current, null);
  h.canvas.setPointerCapture = () => {};
  c.onPointerDown(pointer(h));
  c.onPointerMove(pointer(h, { buttons: 0 }));
  assert.equal(h.env.drag.current, null);
});
test("P15 actual reset/preset/selection/debug/pause cancel gestures without stale pose overwrite", async () => {
  const h = await harness(),
    c = h.callbacks;
  for (const action of [
    () => c.reset(1),
    () => c.selectVertex(3),
    () => c.toggleDebug(),
    () => c.togglePause(),
    () => c.edit("near", 0.8),
  ]) {
    c.onPointerDown(pointer(h));
    action();
    assert.equal(h.env.drag.current, null);
    assert.equal(h.captured, false);
    const before = h.scene;
    c.onPointerUp(pointer(h, { clientX: 150 }));
    assert.equal(h.scene, before);
  }
});
test("P15 actual keyboard reaches far/near/FOV and honors repeat, modifiers and lesson gates", async () => {
  const h = await harness(),
    key = h.callbacks.onKeyDown;
  const e = (key, extra = {}) => ({ key, repeat: false, preventDefault() {}, ...extra });
  key(e("0"));
  close(h.scene.lens.farPlane, 31);
  key(e("="));
  close(h.scene.lens.nearPlane, 0.6);
  key(e("]"));
  close(h.scene.lens.verticalFovRadians, (65 * Math.PI) / 180);
  key(e(" ", { repeat: true }));
  assert.equal(h.scene.paused, true);
  key(e(" ", { ctrlKey: true }));
  assert.equal(h.scene.paused, true);
  key(e("Tab"));
  key(e(" "));
  assert.equal(h.scene.paused, false);
  key(e("n"));
  assert.equal(h.scene.paused, false);
  key(e("r"));
  assert.deepEqual(h.scene, initialInspector());
  const early = await harness(2);
  early.callbacks.onKeyDown(e("e"));
  assert.deepEqual(early.scene, initialInspector());
});
test("P15 actual reduced-motion, step and RAF cleanup preserve direct control", async () => {
  const h = await harness();
  const pause = await componentCallback(file, "togglePause", { ...h.env, reducedMotion: true });
  pause();
  assert.equal(h.scene.paused, true);
  h.callbacks.step();
  close(h.scene.model.yaw, initialInspector().model.yaw + (35 * Math.PI) / 180 / 30);
  h.env.commit({ ...h.scene, paused: false });
  let animate,
    cancelled = 0;
  const effect = await componentEffect(file, "const animate =", {
    ...h.env,
    scene: h.scene,
    performance: { now: () => 0 },
    requestAnimationFrame: (fn) => {
      animate = fn;
      return 42;
    },
    cancelAnimationFrame: (id) => {
      cancelled = id;
    },
  });
  const cleanup = effect(),
    before = h.scene.model.yaw;
  animate(100);
  close(h.scene.model.yaw, before + (3.5 * Math.PI) / 180);
  cleanup();
  assert.equal(cancelled, 42);
});
test("P15 actual blur/hidden cleanup releases capture and removes listeners", async () => {
  const h = await harness(),
    events = new Map(),
    removed = [];
  const effect = await componentEffect(file, '"visibilitychange"', {
    ...h.env,
    window: {
      addEventListener: (k, f) => events.set(k, f),
      removeEventListener: (k) => removed.push(k),
    },
    document: {
      hidden: true,
      addEventListener: (k, f) => events.set(k, f),
      removeEventListener: (k) => removed.push(k),
    },
  });
  const cleanup = effect();
  h.callbacks.onPointerDown(pointer(h));
  events.get("blur")();
  assert.equal(h.captured, false);
  assert.equal(h.scene.paused, true);
  h.callbacks.onPointerDown(pointer(h));
  events.get("visibilitychange")();
  assert.equal(h.captured, false);
  cleanup();
  assert.deepEqual(removed, ["blur", "visibilitychange"]);
});
test("P15 real resize/DPR and reduced-motion subscriptions stop a gesture and clean up", async () => {
  const h = await harness();
  let effect, frame, resize, motion;
  let width = 550,
    dpr = 1,
    disconnected = false,
    cancelled = false;
  h.canvas.getBoundingClientRect = () => ({ width, height: 280 });
  const win = {
    get devicePixelRatio() {
      return dpr;
    },
    addEventListener: (_, fn) => {
      resize = fn;
    },
    removeEventListener: (_, fn) => {
      assert.equal(fn, resize);
    },
  };
  const fake = {
    useState: (initial) => [initial, () => {}],
    useEffect: (callback) => {
      effect = callback;
    },
    window: win,
    requestAnimationFrame: (callback) => {
      frame = callback;
      return 42;
    },
    cancelAnimationFrame: () => {
      cancelled = true;
    },
    ResizeObserver: class {
      observe() {}
      disconnect() {
        disconnected = true;
      }
    },
  };
  const useSize = await componentCallback("lab-shared.tsx", "useCanvasSize", fake);
  useSize(h.env.canvasRef, h.callbacks.pauseForEnvironment);
  const cleanup = effect();
  frame();
  for (const change of [
    () => {
      width = 600;
    },
    () => {
      dpr = 2;
    },
  ]) {
    h.callbacks.onPointerDown(pointer(h));
    change();
    resize();
    frame();
    assert.equal(h.captured, false);
    assert.equal(h.scene.paused, true);
  }
  h.env.commit({ ...h.scene, paused: false });
  resize();
  frame();
  assert.equal(h.scene.paused, false, "unchanged dimensions do not stop animation");
  resize();
  cleanup();
  assert.equal(disconnected, true);
  assert.equal(cancelled, true);
  const media = {
    matches: false,
    addEventListener: (_, fn) => {
      motion = fn;
    },
    removeEventListener: (_, fn) => {
      assert.equal(fn, motion);
    },
  };
  const useMotion = await componentCallback("lab-shared.tsx", "usePauseOnReducedMotion", {
    ...fake,
    matchMedia: () => media,
  });
  useMotion(h.callbacks.pauseForEnvironment);
  const cleanMotion = effect();
  h.callbacks.onPointerDown(pointer(h));
  media.matches = true;
  motion();
  assert.equal(h.captured, false);
  assert.equal(h.scene.paused, true);
  media.matches = false;
  motion();
  assert.equal(h.scene.paused, true, "leaving reduced motion never resumes the lab");
  cleanMotion();
});
test("P15 changing lesson remounts its scene instead of resetting state in an effect", async () => {
  const source = await readFile(new URL("../components/labs/" + file, import.meta.url), "utf8");
  assert.match(source, /<Pipeline3dScene key=\{mode \?\? "default"\} mode=\{mode\}/);
});
test("P15 actual mapping uses CSS drag delta independent of DPR and rejects letterbox bars", async () => {
  const layout = await componentCallback("pipeline3d-lab-view.ts", "layout", { inspectorViewport });
  const point = await componentCallback("pipeline3d-lab-view.ts", "inspectorPointFromEvent", {
    layout,
  });
  const s = initialInspector(),
    canvas = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 550, height: 400 }) };
  for (const dpr of [1, 2, 3]) {
    const p = point(
      { currentTarget: canvas, clientX: 285, clientY: 220 },
      { width: 550, height: 400, dpr },
      s,
    );
    close(p.x, 550);
    close(p.y, 280);
    assert.equal(p.cssX, 285);
  }
  assert.equal(
    point(
      { currentTarget: canvas, clientX: 285, clientY: 21 },
      { width: 550, height: 400, dpr: 2 },
      s,
    ),
    null,
  );
});
test("P15 actual clean renderer retains grid/mesh/selected point and hides only debug text", async () => {
  const layout = await componentCallback("pipeline3d-lab-view.ts", "layout", { inspectorViewport }),
    lines = [],
    labels = [],
    colors = [];
  const draw = await componentCallback("pipeline3d-lab-view.ts", "drawInspector", {
    layout,
    inspectorResults,
    setupCanvas() {},
    drawLine: (ctx, a, b, color) => lines.push(color),
  });
  const ctx = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    beginPath() {},
    rect() {},
    clip() {},
    arc() {},
    fill() {
      colors.push(this.fillStyle);
    },
    fillText: (t) => labels.push(t),
  };
  draw(ctx, { width: 550, height: 400, dpr: 2 }, { ...initialInspector(), debug: false }, 7);
  assert.ok(lines.includes("#28334d"));
  assert.ok(lines.includes("#74839f"));
  assert.ok(colors.includes("#ffe26c"));
  assert.equal(labels.length, 0);
});
