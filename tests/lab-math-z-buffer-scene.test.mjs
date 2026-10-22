import assert from "node:assert/strict";
import test from "node:test";
import * as model from "../lib/labs/z-buffer-scene.ts";
import * as math from "../lib/labs/z-buffer.ts";
import { triangleSignedDoubleArea } from "../lib/labs/triangle-raster.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
const close = (a, b) => assert.ok(Number.isFinite(a) && Math.abs(a - b) < 1e-9, a + " != " + b);
test("P17 outward winding and culling preserve visible cube across angles/order", () => {
  for (let i = 0; i < 8; i++) {
    const t = math.buildCubeTriangles(80, 56, -0.42, i * 0.5),
      a = math.renderZTriangles(t, 80, 56),
      b = math.renderZTriangles(t, 80, 56, { cullEnabled: true, reverseOrder: true });
    assert.deepEqual(math.zFrameDifference(a, b), { colorPixels: 0, depthPixels: 0 });
    assert.equal(a.submittedCount, 12);
    assert.ok(b.culledCount > 0);
  }
  const t = math.buildCubeTriangles(80, 56, 0, 0);
  assert.ok(triangleSignedDoubleArea(t[0]) > 0);
  assert.ok(triangleSignedDoubleArea(t[2]) < 0);
  assert.equal(math.renderZTriangles(t, 80, 56, { cullEnabled: true }).submittedCount, 2);
  assert.equal(new Set(t.map((q) => JSON.stringify(q.color))).size, 6);
});
test("P17 NDC oracle, no-write depth toggle and order counterexample", () => {
  close(math.projectZVertex({ x: 0, y: 0, z: 1 }, 800, 600).ndcDepth, 0);
  close(math.projectZVertex({ x: 0, y: 0, z: 10 }, 800, 600).ndcDepth, 1);
  close(math.projectZVertex({ x: 0, y: 0, z: 4 }, 800, 600).ndcDepth, 5 / 6);
  close(math.interpolateNdcDepth(0.2, 0.5, 0.8, { a: 0.25, b: 0.5, c: 0.25 }), 0.5);
  const s = { ...model.initialDepthScene(9), depthEnabled: false };
  assert.ok(
    math.zFrameDifference(model.depthFrame(9, s), model.depthFrame(9, s, true)).colorPixels > 0,
  );
  assert.ok(model.depthFrame(9, s).depths.every((d) => d === 1));
});
test("P17 invalid allocation/depth and NaN equality cannot pass silently", () => {
  for (const [w, h] of [
    [0, 1],
    [-1, 2],
    [Infinity, 2],
    [2000, 3000],
    [1.2, 2],
  ])
    assert.throws(() => math.createZFrame(w, h));
  const f = math.createZFrame(1, 1),
    red = { red: 255, green: 0, blue: 0 };
  for (const d of [NaN, Infinity, -0.1, 1, 2])
    assert.equal(math.testAndWriteZFragment(f, 0, 0, d, red, false, false), false);
  assert.equal(math.testAndWriteZFragment(f, -1, 0, 0.2, red), false);
  assert.equal(math.testAndWriteZFragment(f, 0, 0, 0.2, red, false, false), true);
  assert.equal(f.depths[0], 1);
  assert.equal(math.testAndWriteZFragment(f, 0, 0, 0.3, red, true, false), true);
  assert.equal(math.testAndWriteZFragment(f, 0, 0, 0.3, red, true, false), false);
  assert.throws(() => math.zFrameDifference(f, math.createZFrame(2, 1)));
  f.depths[0] = NaN;
  assert.equal(math.zFrameDifference(f, f).depthPixels, 1);
  assert.ok(Number.isNaN(math.projectZVertex({ x: 0, y: 0, z: 0 }, 80, 60).x));
});
test("P17 camera/pose remain independent and animation is dt invariant", () => {
  const s = model.initialDepthScene(9),
    next = model.editDepthScene(s, "cameraX", 1);
  assert.equal(next.angleY, s.angleY);
  assert.ok(
    math.buildCubeTriangles(80, 56, s.angleX, s.angleY, { x: 1, z: 0 })[0].a.x <
      math.buildCubeTriangles(80, 56, s.angleX, s.angleY)[0].a.x,
  );
  assert.equal(model.editDepthScene(s, "angleY", NaN), s);
  assert.equal(model.initialDepthScene(9, NaN).preset, 1);
  assert.equal(model.depthStage("depth-culling"), 8);
  for (let stage = 1; stage <= 4; stage++)
    assert.equal(model.initialDepthScene(stage).depthEnabled, false);
  let x = { ...s, paused: false },
    y = { ...s, paused: false };
  for (let i = 0; i < 100; i++) x = model.advanceDepthScene(x, 0.01);
  for (let i = 0; i < 50; i++) y = model.advanceDepthScene(y, 0.02);
  close(x.angleY, y.angleY);
  assert.equal(model.advanceDepthScene(x, NaN), x);
});
async function harness(stage = 9) {
  const captured = new Set(),
    canvas = {
      focus() {},
      setPointerCapture: (id) => captured.add(id),
      hasPointerCapture: (id) => captured.has(id),
      releasePointerCapture: (id) => captured.delete(id),
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 440, height: 240 }),
    };
  const layout = await componentCallback("z-buffer-view.ts", "depthLayout", model);
  const pointer = await componentCallback("z-buffer-view.ts", "depthPointer", {
    depthLayout: layout,
  });
  const env = {
    ...model,
    stage,
    canvasRef: { current: canvas },
    sceneRef: { current: model.initialDepthScene(stage) },
    drag: { current: null },
    size: { width: 220, height: 120, dpr: 2 },
    reducedMotion: false,
    depthPointer: pointer,
  };
  env.commit = (s) => {
    env.sceneRef.current = s;
  };
  for (const name of [
    "cancelDrag",
    "pauseEnvironment",
    "reset",
    "edit",
    "toggle",
    "play",
    "step",
    "nextFragment",
    "moveDrag",
    "pointerDown",
    "pointerMove",
    "pointerUp",
    "pointerCancel",
    "keyDown",
  ])
    env[name] = await componentCallback("z-buffer-lab.tsx", name, env);
  return {
    ...env,
    canvas,
    captured,
    event: (x, y, extra = {}) => ({
      clientX: 10 + x * 2,
      clientY: 20 + y * 2,
      currentTarget: canvas,
      pointerId: 1,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      buttons: 1,
      preventDefault() {},
      ...extra,
    }),
  };
}
test("P17 actual pointer has owner, final sample, CSS mapping and fixed camera", async () => {
  const h = await harness(),
    before = h.sceneRef.current;
  h.pointerDown(h.event(100, 40));
  assert.equal(h.drag.current.id, 1);
  h.pointerMove(h.event(110, 40, { pointerId: 2 }));
  close(h.sceneRef.current.angleY, before.angleY);
  h.pointerUp(h.event(120, 40));
  close(h.sceneRef.current.angleY, before.angleY + 0.32);
  assert.equal(h.sceneRef.current.cameraX, 0);
  assert.equal(h.captured.size, 0);
  assert.equal(h.sceneRef.current.inspect.x, 100);
});
test("P17 actual edit/reset/step/debug cancel stale up and clamp inspector", async () => {
  for (const action of [
    (h) => h.reset(),
    (h) => h.edit("cameraZ", 0.3),
    (h) => h.toggle("debug"),
    (h) => h.step(),
    (h) => h.nextFragment(),
  ]) {
    const h = await harness();
    h.pointerDown(h.event(80, 50));
    action(h);
    assert.equal(h.captured.size, 0);
    const state = h.sceneRef.current;
    h.pointerUp(h.event(200, 90));
    assert.equal(h.sceneRef.current, state);
  }
  const h = await harness();
  h.toggle("debug");
  h.sceneRef.current = { ...h.sceneRef.current, inspect: { x: 10, y: 159 } };
  h.toggle("debug");
  assert.equal(h.sceneRef.current.inspect.y, 119);
  assert.ok(Number.isFinite(model.depthFrame(9, h.sceneRef.current).depths[119 * 220 + 10]));
});
test("P17 actual capture failure, wrong buttons and lost button are safe", async () => {
  const h = await harness();
  h.pointerDown(h.event(20, 20, { button: 2 }));
  assert.equal(h.drag.current, null);
  h.pointerDown(h.event(20, 20));
  h.pointerCancel(h.event(0, 0, { pointerId: 2 }));
  assert.ok(h.drag.current);
  h.pointerMove(h.event(40, 20, { buttons: 0 }));
  assert.equal(h.drag.current, null);
  assert.equal(h.captured.size, 0);
  h.canvas.setPointerCapture = () => {
    throw Error("denied");
  };
  h.pointerDown(h.event(20, 20));
  assert.equal(h.drag.current, null);
});
test("P17 actual keyboard respects focus/modifiers, repeat and reduced motion", async () => {
  const h = await harness();
  let prevented = 0;
  for (const e of [{ key: "Tab" }, { key: "r", ctrlKey: true }])
    h.keyDown({
      ...e,
      preventDefault() {
        prevented++;
      },
    });
  assert.equal(prevented, 0);
  const before = h.sceneRef.current.debug;
  h.keyDown({ key: "f", repeat: true, preventDefault() {} });
  assert.equal(h.sceneRef.current.debug, before);
  h.keyDown({ key: "j", preventDefault() {} });
  close(h.sceneRef.current.cameraX, -0.1);
  h.keyDown({ key: "ArrowRight", preventDefault() {} });
  close(h.sceneRef.current.angleY, 0.76);
  const r = await harness();
  r.reducedMotion = true;
  r.play = await componentCallback("z-buffer-lab.tsx", "play", r);
  r.play();
  assert.equal(r.sceneRef.current.paused, true);
  r.step();
  close(r.sceneRef.current.angleY, 0.76);
});
test("P17 actual lifecycle removes listeners and cancels hidden capture", async () => {
  const h = await harness();
  h.pointerDown(h.event(80, 40));
  const added = new Map(),
    removed = [];
  const doc = {
    hidden: true,
    addEventListener: (k, fn) => added.set(k, fn),
    removeEventListener: (k) => removed.push(k),
  };
  const win = {
    addEventListener: (k, fn) => added.set(k, fn),
    removeEventListener: (k) => removed.push(k),
  };
  const effect = await componentEffect("z-buffer-lab.tsx", "visibilitychange", {
    pauseEnvironment: h.pauseEnvironment,
    cancelDrag: h.cancelDrag,
    window: win,
    document: doc,
  });
  const cleanup = effect();
  added.get("visibilitychange")();
  assert.equal(h.drag.current, null);
  cleanup();
  assert.deepEqual(removed.sort(), ["blur", "visibilitychange"]);
});
test("P17 actual animation uses live pause and cancels requestAnimationFrame", async () => {
  const h = await harness(),
    frames = [],
    cancelled = [];
  h.sceneRef.current = { ...h.sceneRef.current, paused: false };
  const effect = await componentEffect("z-buffer-lab.tsx", "const animate", {
    stage: 9,
    scene: h.sceneRef.current,
    reducedMotion: false,
    sceneRef: h.sceneRef,
    commit: h.commit,
    ...model,
    performance: { now: () => 0 },
    requestAnimationFrame: (fn) => {
      frames.push(fn);
      return frames.length;
    },
    cancelAnimationFrame: (id) => cancelled.push(id),
  });
  const cleanup = effect();
  frames[0](20);
  assert.ok(h.sceneRef.current.angleY > 0.68);
  h.sceneRef.current = { ...h.sceneRef.current, paused: true };
  const before = h.sceneRef.current;
  frames.at(-1)(40);
  assert.equal(h.sceneRef.current, before);
  cleanup();
  assert.ok(cancelled.length > 0);
});
test("P17 actual clean renderer retains pixel cube and projected world floor", async () => {
  const layout = await componentCallback("z-buffer-view.ts", "depthLayout", model),
    lines = [],
    pixels = [],
    outlines = [];
  const draw = await componentCallback("z-buffer-view.ts", "drawDepthScene", {
    ...model,
    ...math,
    depthLayout: layout,
    setupCanvas() {},
    drawLine: (...a) => lines.push(a),
  });
  const ctx = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    beginPath() {},
    rect() {},
    clip() {},
    fillRect: (...a) => pixels.push(a),
    strokeRect: (...a) => outlines.push(a),
  };
  draw(ctx, { width: 440, height: 320, dpr: 2 }, 9, {
    ...model.initialDepthScene(9),
    debug: false,
  });
  assert.ok(lines.length > 0);
  assert.ok(pixels.length > 100);
  assert.equal(outlines.length, 0);
});
