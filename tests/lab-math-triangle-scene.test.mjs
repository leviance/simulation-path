import assert from "node:assert/strict";
import test from "node:test";
import * as math from "../lib/labs/triangle-raster.ts";
import * as model from "../lib/labs/triangle-scene.ts";
import { projectPerspective, clipPointScreen } from "../lib/labs/projection-point.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
const close = (a, b) => assert.ok(Number.isFinite(a) && Math.abs(a - b) < 1e-9, a + " != " + b);
test("P16 weights belong to original A/B/C even for negative winding", () => {
  const t = { a: { x: 0, y: 0 }, b: { x: 0, y: 4 }, c: { x: 4, y: 0 } };
  for (const [i, k] of ["a", "b", "c"].entries()) {
    const w = math.sampleRasterTriangle(t, t[k], "inclusive").barycentric;
    for (const [j, q] of ["a", "b", "c"].entries()) close(w[q], i === j ? 1 : 0);
  }
  const p = { x: 1, y: 2 },
    w = math.sampleRasterTriangle(t, p, "inclusive").barycentric;
  close(w.a * t.a.x + w.b * t.b.x + w.c * t.c.x, p.x);
  close(w.a * t.a.y + w.b * t.b.y + w.c * t.c.y, p.y);
});
test("P16 outside/invalid bounds are empty and infinity is degenerate", () => {
  for (const t of [
    { a: { x: -30, y: 0 }, b: { x: -20, y: 4 }, c: { x: -10, y: 0 } },
    { a: { x: NaN, y: 0 }, b: { x: 2, y: 4 }, c: { x: 1, y: 0 } },
  ])
    assert.equal(math.triangleCandidateCount(math.triangleBounds(t, 8, 8)), 0);
  assert.equal(
    math.triangleWinding({ a: { x: 0, y: 0 }, b: { x: Infinity, y: 4 }, c: { x: 1, y: 0 } }),
    "degenerate",
  );
});
test("P16 reversing geometry and colors preserves RGB, not just coverage", () => {
  const a = model.initialRasterScene(),
    b = model.rasterScenePreset(1);
  const ta = model.rasterSceneTriangle(a),
    tb = model.rasterSceneTriangle(b);
  const p = { x: (ta.a.x + ta.b.x + ta.c.x) / 3, y: (ta.a.y + ta.b.y + ta.c.y) / 3 };
  const wa = math.sampleRasterTriangle(ta, p).barycentric,
    wb = math.sampleRasterTriangle(tb, p).barycentric;
  assert.deepEqual(model.rasterSceneRgb(a, wa), [85, 85, 85]);
  assert.deepEqual(model.rasterSceneRgb(a, wa), model.rasterSceneRgb(b, wb));
});
test("P16 perspective responds to camera/FOV without modifying world; rejects depth", () => {
  const s = model.initialRasterScene(),
    t = model.rasterSceneTriangle(s);
  for (const next of [
    model.editRasterScene(s, "cameraZ", -1),
    model.editRasterScene(s, "fov", Math.PI / 2),
  ]) {
    assert.deepEqual(next.world, s.world);
    assert.ok(Math.abs(model.rasterSceneTriangle(next).a.x - 165) < Math.abs(t.a.x - 165));
  }
  assert.equal(model.rasterSceneTriangle(model.rasterScenePreset(3)), null);
  assert.equal(
    math.triangleWinding(model.rasterSceneTriangle(model.rasterScenePreset(2))),
    "degenerate",
  );
  const moved = model.dragRasterScene(s, 0, { x: t.a.x + 10, y: t.a.y }, s.world[0].z);
  close(model.rasterSceneTriangle(moved).a.x, t.a.x + 10);
  close(moved.world[0].z, s.world[0].z);
  assert.equal(model.editRasterScene(s, "fov", NaN), s);
});
async function harness() {
  const captured = new Set(),
    canvas = {
      focus() {},
      setPointerCapture: (id) => captured.add(id),
      hasPointerCapture: (id) => captured.has(id),
      releasePointerCapture: (id) => captured.delete(id),
    };
  const env = {
    ...model,
    sceneRef: { current: model.initialRasterScene() },
    canvasRef: { current: canvas },
    drag: { current: null },
    size: { width: 330, height: 180, dpr: 2 },
    reducedMotion: false,
    scenePointer: (e) => ({ x: e.clientX, y: e.clientY }),
  };
  env.commit = (s) => {
    env.sceneRef.current = s;
  };
  for (const name of [
    "cancelDrag",
    "pauseEnvironment",
    "reset",
    "edit",
    "select",
    "toggleDebug",
    "step",
    "play",
    "moveDrag",
    "pointerDown",
    "pointerMove",
    "pointerUp",
    "pointerCancel",
    "keyDown",
  ])
    env[name] = await componentCallback("triangle-scene-lab.tsx", name, env);
  return {
    ...env,
    canvas,
    captured,
    event: (x, y, extra = {}) => ({
      clientX: x,
      clientY: y,
      currentTarget: canvas,
      pointerId: 1,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
      isPrimary: true,
      preventDefault() {},
      ...extra,
    }),
  };
}
test("P16 actual scene drag keeps owner/offset/depth and consumes final up", async () => {
  const h = await harness(),
    s = h.sceneRef.current,
    t = model.rasterSceneTriangle(s);
  h.pointerDown(h.event(t.a.x + 2, t.a.y));
  assert.equal(h.captured.has(1), true);
  assert.deepEqual(h.sceneRef.current.world, s.world);
  h.pointerMove(h.event(t.a.x + 100, t.a.y, { pointerId: 2 }));
  assert.deepEqual(h.sceneRef.current.world, s.world);
  h.pointerUp(h.event(t.a.x + 12, t.a.y, { buttons: 0 }));
  close(model.rasterSceneTriangle(h.sceneRef.current).a.x, t.a.x + 10);
  close(h.sceneRef.current.world[0].z, s.world[0].z);
  assert.equal(h.drag.current, null);
  assert.equal(h.captured.size, 0);
});
test("P16 actual edits/reset/step/environment cancel capture before stale up", async () => {
  for (const action of [
    (h) => h.reset(),
    (h) => h.edit("cameraZ", 0.5),
    (h) => h.step(),
    (h) => h.toggleDebug(),
    (h) => h.select(2),
    (h) => h.pauseEnvironment(),
  ]) {
    const h = await harness(),
      t = model.rasterSceneTriangle(h.sceneRef.current);
    h.pointerDown(h.event(t.a.x, t.a.y));
    action(h);
    const s = h.sceneRef.current;
    h.pointerUp(h.event(t.a.x + 30, t.a.y));
    assert.equal(h.sceneRef.current, s);
    assert.equal(h.captured.size, 0);
  }
});
test("P16 actual pointer handles wrong buttons, capture failure and lost button", async () => {
  const h = await harness(),
    t = model.rasterSceneTriangle(h.sceneRef.current);
  h.pointerDown(h.event(t.a.x, t.a.y, { button: 2 }));
  assert.equal(h.drag.current, null);
  h.pointerDown(h.event(t.a.x, t.a.y));
  h.pointerMove(h.event(t.a.x, t.a.y, { buttons: 0 }));
  assert.equal(h.drag.current, null);
  h.canvas.setPointerCapture = () => {
    throw Error("capture");
  };
  h.pointerDown(h.event(t.a.x, t.a.y));
  assert.equal(h.drag.current, null);
});
test("P16 actual keyboard preserves Tab/modifiers, repeat and step guards", async () => {
  const h = await harness(),
    e = (key, extra = {}) => ({ key, repeat: false, preventDefault() {}, ...extra });
  h.keyDown(e("Tab"));
  h.keyDown(e("ArrowUp", { ctrlKey: true }));
  close(h.sceneRef.current.world[0].y, 1.2);
  h.keyDown(e("ArrowUp"));
  close(h.sceneRef.current.world[0].y, 1.3);
  h.keyDown(e("n", { repeat: true }));
  assert.equal(h.sceneRef.current.limit, Infinity);
  h.keyDown(e("n"));
  assert.equal(h.sceneRef.current.limit, 1);
  const reduced = await componentCallback("triangle-scene-lab.tsx", "play", {
    ...h,
    reducedMotion: true,
  });
  reduced();
  assert.equal(h.sceneRef.current.paused, true);
});
test("P16 actual animation checks live state and cancels its frame", async () => {
  const h = await harness();
  h.commit({ ...h.sceneRef.current, paused: false, limit: 0 });
  let animate, cancelled;
  const effect = await componentEffect("triangle-scene-lab.tsx", "const animate =", {
    ...h,
    scene: h.sceneRef.current,
    raster: { candidateCount: 5000 },
    sceneRaster: () => ({ candidateCount: 5000 }),
    requestAnimationFrame: (f) => {
      animate = f;
      return 42;
    },
    cancelAnimationFrame: (id) => {
      cancelled = id;
    },
  });
  const cleanup = effect();
  animate();
  assert.equal(h.sceneRef.current.limit, 512);
  h.pauseEnvironment();
  const old = h.sceneRef.current;
  animate();
  assert.equal(h.sceneRef.current, old);
  cleanup();
  assert.equal(cancelled, 42);
});
test("P16 real mapping separates CSS/DPR and clean renderer retains pixel fill/grid", async () => {
  const layout = await componentCallback("triangle-scene-view.ts", "layout", {
    rasterSceneViewport: model.rasterSceneViewport,
  });
  const point = await componentCallback("triangle-scene-view.ts", "scenePointer", { layout });
  const s = model.initialRasterScene(),
    canvas = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 660, height: 360 }) };
  for (const dpr of [1, 2, 3])
    assert.deepEqual(
      point(
        { clientX: 340, clientY: 200, currentTarget: canvas },
        { width: 330, height: 180, dpr },
        s,
      ),
      { x: 165, y: 90 },
    );
  const sceneRaster = await componentCallback("triangle-scene-view.ts", "sceneRaster", {
    ...model,
    ...math,
  });
  let pixels = 0,
    lines = 0,
    handles = 0;
  const ctx = {
    save() {},
    restore() {},
    translate() {},
    scale() {},
    beginPath() {},
    rect() {},
    clip() {},
    fillRect() {
      pixels++;
    },
    arc() {
      handles++;
    },
    fill() {},
  };
  const draw = await componentCallback("triangle-scene-view.ts", "drawRasterScene", {
    ...model,
    layout,
    sceneRaster,
    projectPerspective,
    clipPointScreen,
    setupCanvas() {},
    drawLine() {
      lines++;
    },
  });
  draw(ctx, { width: 660, height: 480, dpr: 2 }, { ...s, debug: false });
  assert.ok(pixels > 100);
  assert.ok(lines > 0);
  assert.equal(handles, 0);
});
test("P16 actual 2D drag has a single owner, CSS scaling, offset and final sample", async () => {
  let triangle = { a: { x: 12, y: 2 }, b: { x: 21, y: 13 }, c: { x: 3, y: 13 } };
  const captured = new Set(),
    canvas = {
      focus() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 480, height: 320 }),
      setPointerCapture: (id) => captured.add(id),
      hasPointerCapture: (id) => captured.has(id),
      releasePointerCapture: (id) => captured.delete(id),
    };
  const env = {
    COLUMNS: 24,
    ROWS: 16,
    canvasRef: { current: canvas },
    draggedVertex: { current: null },
    generation: { current: 0 },
    size: { width: 240, height: 160, dpr: 3 },
    grid: { left: 0, top: 0, cell: 10 },
    triangle,
    setTriangle: (f) => {
      triangle = f(triangle);
    },
    setPreset() {},
    setSecondTriangle() {},
    setCandidateLimit() {},
    setPaused() {},
    setSampleCell() {},
  };
  for (const name of [
    "cancelPointer",
    "fromEvent",
    "onPointerDown",
    "movePointer",
    "onPointerMove",
    "stopPointer",
    "onPointerUp",
  ])
    env[name] = await componentCallback("triangle-raster-lab.tsx", name, env);
  const e = (x, extra = {}) => ({
    clientX: x,
    clientY: 40,
    currentTarget: canvas,
    pointerId: 1,
    button: 0,
    buttons: 1,
    pointerType: "mouse",
    isPrimary: true,
    preventDefault() {},
    ...extra,
  });
  env.onPointerDown(e(244));
  close(triangle.a.x, 12);
  env.onPointerMove(e(400, { pointerId: 2 }));
  close(triangle.a.x, 12);
  env.onPointerUp(e(264, { buttons: 0 }));
  close(triangle.a.x, 13);
  assert.equal(captured.size, 0);
  assert.equal(env.draggedVertex.current, null);
});
