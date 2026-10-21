import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import * as math from "../lib/labs/projection-point.ts";
import * as model from "../lib/labs/projection-scene.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
const near = (a, b, e = 1e-9) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= e, a + " != " + b);
const vectorNear = (a, b) => {
  near(a.x, b.x);
  near(a.y, b.y);
  near(a.z, b.z);
};
test("P11 projection has independent pixel, camera translation and double-depth oracles", () => {
  const s = model.initialPointScene(),
    v = { x: 10, y: 20, width: 800, height: 600 };
  s.lens.verticalFovRadians = Math.PI / 2;
  const a = math.projectPerspective({ x: 1, y: 0.5, z: 4 }, s.camera, s.lens, v),
    b = math.projectPerspective({ x: 1, y: 0.5, z: 8 }, s.camera, s.lens, v);
  assert.equal(a.status, "visible");
  near(a.screen.x, 485);
  near(a.screen.y, 282.5);
  near(b.screen.x, 447.5);
  near(b.screen.y, 301.25);
  assert.deepEqual(math.worldToCamera({ x: 3, y: 2, z: 8 }, { position: { x: 1, y: -1, z: 2 } }), {
    x: 2,
    y: 3,
    z: 6,
  });
});
test("P11 rejects unsafe depth/lens/viewport before divide, includes near/far and has no invented pixel", () => {
  const s = model.initialPointScene(),
    v = model.viewportFor(s);
  for (const [z, status] of [
    [-1, "behind"],
    [0, "behind"],
    [1e-300, "before-near"],
    [0.5, "visible"],
    [16, "visible"],
    [16.01, "beyond-far"],
  ]) {
    const r = math.projectPerspective({ x: 0, y: 0, z }, s.camera, s.lens, v);
    assert.equal(r.status, status);
    if (status !== "visible") {
      assert.equal(r.screen, null);
      assert.equal(r.ndc, null);
    }
  }
  for (const lens of [
    { ...s.lens, verticalFovRadians: 0 },
    { ...s.lens, verticalFovRadians: Math.PI },
    { ...s.lens, nearPlane: 16 },
    { ...s.lens, farPlane: Infinity },
  ])
    assert.equal(math.projectPerspective(s.point, s.camera, lens, v).status, "invalid");
  for (const point of [
    { x: NaN, y: 0, z: 4 },
    { x: 0, y: Infinity, z: 4 },
  ])
    assert.equal(math.projectPerspective(point, s.camera, s.lens, v).status, "invalid");
  assert.equal(
    math.projectPerspective(s.point, s.camera, s.lens, { ...v, width: 0 }).status,
    "invalid",
  );
  const outside = math.projectPerspective({ x: 6, y: 0, z: 1 }, s.camera, s.lens, v);
  assert.equal(outside.status, "outside");
  assert.ok(outside.ndc.x > 1);
  assert.equal(math.projectionRoundTripError({ x: 0, y: 0, z: -1 }, s.camera, s.lens, v), null);
});
test("P11 inverse, aspect and FOV hold across independent fixtures and parameter grid", () => {
  const s = model.initialPointScene();
  for (const aspect of [0, 1, 2])
    for (const fov of [25, 60, 90, 110])
      for (const z of [2, 4, 8, 16]) {
        s.aspect = aspect;
        s.lens.verticalFovRadians = (fov * Math.PI) / 180;
        assert.ok(
          math.projectionRoundTripError(
            { x: 0.2, y: -0.1, z },
            s.camera,
            s.lens,
            model.viewportFor(s),
          ) < 1e-9,
        );
      }
  vectorNear(
    math.screenToCameraAtDepth(
      { x: 485, y: 282.5 },
      4,
      { ...s.lens, verticalFovRadians: Math.PI / 2 },
      { x: 10, y: 20, width: 800, height: 600 },
    ),
    { x: 1, y: 0.5, z: 4 },
  );
  assert.equal(math.screenToCameraAtDepth({ x: NaN, y: 0 }, 4, s.lens, model.viewportFor(s)), null);
  assert.equal(math.screenToCameraAtDepth({ x: 0, y: 0 }, 0, s.lens, model.viewportFor(s)), null);
  const narrow = math.projectPerspective(
    s.point,
    s.camera,
    { ...s.lens, verticalFovRadians: Math.PI / 3 },
    model.viewportFor(s),
  );
  const wide = math.projectPerspective(
    s.point,
    s.camera,
    { ...s.lens, verticalFovRadians: Math.PI / 2 },
    model.viewportFor(s),
  );
  assert.ok(Math.abs(wide.screen.x - 550) < Math.abs(narrow.screen.x - 550));
});
test("P11 near/far and screen clipping have analytic intersections and bounded output", () => {
  const s = model.initialPointScene(),
    v = model.viewportFor(s);
  assert.deepEqual(math.clipPointDepth({ x: -1, y: 0, z: 0 }, { x: 1, y: 0, z: 2 }, s.lens), [
    { x: -0.5, y: 0, z: 0.5 },
    { x: 1, y: 0, z: 2 },
  ]);
  assert.deepEqual(math.clipPointDepth({ x: 0, y: 0, z: 15 }, { x: 2, y: 0, z: 17 }, s.lens), [
    { x: 0, y: 0, z: 15 },
    { x: 1, y: 0, z: 16 },
  ]);
  assert.equal(math.clipPointDepth({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 0 }, s.lens), null);
  const line = math.clipPointScreen({ x: -999, y: 400 }, { x: 99999, y: 400 }, v);
  near(line[0].x, v.x);
  near(line[1].x, v.x + v.width);
});
test("P11 model bounds nonfinite input and presets; same simulation elapsed produces same flight", () => {
  const s = model.initialPointScene();
  assert.equal(model.movePoint(s, { x: NaN, y: 1, z: 0 }), s);
  assert.equal(model.changePointCamera(s, "x", Infinity), s);
  assert.equal(model.changePointLens(s, "nearPlane", NaN), s);
  assert.equal(model.movePoint(s, { x: 0, y: 0, z: 99 }).point.z, 20);
  assert.equal(model.changePointLens(s, "nearPlane", 99).lens.nearPlane, 2);
  assert.equal(model.changePointLens(s, "farPlane", -1).lens.farPlane, 8);
  const expected = ["visible", "visible", "before-near", "behind", "beyond-far", "outside"];
  for (let i = 0; i < 6; i++)
    assert.equal(model.pointDisplay(model.pointPreset(i), 8).status, expected[i]);
  let a = s,
    b = s;
  for (let i = 0; i < 60; i++) a = model.advancePoint(a, 1 / 60);
  for (let i = 0; i < 20; i++) b = model.advancePoint(b, 0.05);
  vectorNear(a.point, b.point);
  near(a.elapsed, 1);
  for (const dt of [0, -1, NaN, Infinity]) assert.equal(model.advancePoint(s, dt), s);
  near(model.advancePoint(s, 9).elapsed, 0.1);
  vectorNear(model.flightPoint(0), { x: 0, y: 1.3, z: 6 });
  assert.equal(model.pointDisplay(s, 1).screen.x, 620);
  near(model.pointDisplay(s, 3).ndc.x, 1 / 4 / (1040 / 585)); // focal scale 1 until lesson 4
});
const layout = (size) => {
  const scale = Math.min(size.width / 1100, size.height / 800);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 800 * scale) / 2 };
};
const point = await componentCallback("projection-lab-view.ts", "projectionPointFromEvent", {
  layout,
});
test("P11 actual mouse mapping handles CSS scaling/letterbox without double DPR", () => {
  const canvas = {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 2200, height: 1600 }),
  };
  assert.deepEqual(
    point(
      { clientX: 1110, clientY: 820, currentTarget: canvas },
      { width: 1100, height: 800, dpr: 3 },
    ),
    { x: 550, y: 400 },
  );
});
async function harness(stage = 8) {
  const sceneRef = { current: model.initialPointScene() },
    drag = { current: null },
    captured = new Set(),
    canvas = {
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 1100, height: 800 }),
      focus() {},
      setPointerCapture: (id) => captured.add(id),
      hasPointerCapture: (id) => captured.has(id),
      releasePointerCapture: (id) => captured.delete(id),
    };
  const env = {
    ...math,
    ...model,
    sceneRef,
    drag,
    canvasRef: { current: canvas },
    size: { width: 1100, height: 800, dpr: 2 },
    stage,
    reducedMotion: false,
    projectionPointFromEvent: point,
  };
  env.commit = (next) => (sceneRef.current = next);
  for (const name of [
    "cancelDrag",
    "pauseForEnvironment",
    "reset",
    "togglePause",
    "step",
    "toggleDebug",
    "editPoint",
    "editCamera",
    "editLens",
    "moveDrag",
    "startDrag",
    "pointerMove",
    "pointerUp",
    "pointerCancel",
    "onKeyDown",
  ])
    env[name] = await componentCallback("projection-lab.tsx", name, env);
  return {
    ...env,
    canvas,
    captured,
    event: (x, y, extra = {}) => ({
      clientX: 10 + x,
      clientY: 20 + y,
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
test("P11 actual drag preserves grab/depth, ignores other owner and accepts final up sample", async () => {
  const h = await harness(),
    s = structuredClone(h.sceneRef.current),
    p = model.pointDisplay(s, 8).screen;
  h.startDrag(h.event(p.x + 10, p.y));
  assert.deepEqual(h.sceneRef.current, s);
  h.pointerMove(h.event(p.x + 50, p.y, { pointerId: 2 }));
  assert.deepEqual(h.sceneRef.current, s);
  h.pointerMove(h.event(p.x + 30, p.y));
  h.pointerUp(h.event(p.x + 50, p.y));
  const r = model.pointDisplay(h.sceneRef.current, 8);
  near(r.screen.x, p.x + 40);
  near(r.screen.y, p.y);
  near(h.sceneRef.current.point.z, s.point.z);
  assert.equal(h.drag.current, null);
  assert.equal(h.captured.size, 0);
});
test("P11 actual drag rejects background/right/early input and clears lost-button/capture failure", async () => {
  for (const extra of [{ button: 2 }, { isPrimary: false }]) {
    const h = await harness(),
      p = model.pointDisplay(h.sceneRef.current, 8).screen;
    h.startDrag(h.event(p.x, p.y, extra));
    assert.equal(h.drag.current, null);
  }
  const early = await harness(6),
    p = model.pointDisplay(early.sceneRef.current, 8).screen;
  early.startDrag(early.event(p.x, p.y));
  assert.equal(early.drag.current, null);
  const h = await harness();
  h.startDrag(h.event(50, 500));
  assert.equal(h.drag.current, null);
  h.startDrag(h.event(p.x, p.y));
  h.pointerMove(h.event(p.x + 5, p.y, { buttons: 0 }));
  assert.equal(h.drag.current, null);
  h.canvas.setPointerCapture = () => {
    throw Error("denied");
  };
  h.startDrag(h.event(p.x, p.y));
  assert.equal(h.drag.current, null);
});
test("P11 actual keyboard keeps Tab/modifiers, depth, repeated Space and reduced-motion semantics", async () => {
  const h = await harness(),
    event = (key, extra = {}) => ({
      key,
      repeat: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      preventDefault() {},
      ...extra,
    });
  h.onKeyDown(event("e"));
  near(h.sceneRef.current.point.z, 4.1);
  h.onKeyDown(event("d"));
  near(h.sceneRef.current.point.x, 1.1);
  h.onKeyDown(event("d", { ctrlKey: true }));
  near(h.sceneRef.current.point.x, 1.1);
  h.onKeyDown(
    event("Tab", {
      preventDefault() {
        throw Error("Tab trapped");
      },
    }),
  );
  let prevented = false;
  h.onKeyDown(
    event(" ", {
      repeat: true,
      preventDefault() {
        prevented = true;
      },
    }),
  );
  assert.equal(prevented, true);
  assert.equal(h.sceneRef.current.paused, true);
  h.onKeyDown(event(" "));
  assert.equal(h.sceneRef.current.paused, false);
  h.onKeyDown(event(" "));
  h.onKeyDown(event("n"));
  near(h.sceneRef.current.elapsed, 0.1);
  h.onKeyDown(event("f"));
  assert.equal(h.sceneRef.current.debug, false);
  h.onKeyDown(event("r"));
  assert.deepEqual(h.sceneRef.current, model.initialPointScene());
  const toggle = await componentCallback("projection-lab.tsx", "togglePause", {
    ...h,
    reducedMotion: true,
  });
  toggle();
  assert.equal(h.sceneRef.current.paused, true);
});
test("P11 actual edits cancel capture and pause before changing geometry/camera/lens", async () => {
  for (const [name, args] of [
    ["editPoint", ["x", 2]],
    ["editCamera", ["x", 1]],
    ["editLens", ["nearPlane", 1]],
  ]) {
    const h = await harness(),
      p = model.pointDisplay(h.sceneRef.current, 8).screen;
    h.startDrag(h.event(p.x, p.y));
    h[name](...args);
    assert.equal(h.drag.current, null);
    assert.equal(h.captured.size, 0);
    assert.equal(h.sceneRef.current.paused, true);
  }
});
test("P11 actual lifecycle cleans listeners and capture on hidden, resize and mode changes", async () => {
  const h = await harness(),
    listeners = new Map(),
    removed = [],
    target = {
      hidden: false,
      addEventListener: (n, cb) => listeners.set(n, cb),
      removeEventListener: (n) => removed.push(n),
    };
  const cleanup = (
    await componentEffect("projection-lab.tsx", "visibilitychange", {
      ...h,
      window: target,
      document: target,
    })
  )();
  const p = model.pointDisplay(h.sceneRef.current, 8).screen;
  h.startDrag(h.event(p.x, p.y));
  target.hidden = true;
  listeners.get("visibilitychange")();
  assert.equal(h.drag.current, null);
  const before = h.sceneRef.current.point;
  h.sceneRef.current.paused = false;
  h.pauseForEnvironment();
  assert.equal(h.sceneRef.current.paused, true);
  assert.deepEqual(h.sceneRef.current.point, before);
  const source = await readFile(
    new URL("../components/labs/projection-lab.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /<ProjectionScene key=\{mode \?\? "projection-full"\} mode=\{mode\}/);
  assert.match(source, /useCanvasSize\(canvasRef, pauseForEnvironment\)/);
  assert.match(source, /usePauseOnReducedMotion\(pauseForEnvironment\)/);
  cleanup();
  assert.deepEqual(removed.sort(), ["blur", "visibilitychange"]);
});
test("P11 actual animation caps stalled frame, reduced-motion pauses, cleanup cancels current rAF", async () => {
  const h = await harness();
  h.sceneRef.current.paused = false;
  let callback,
    id = 0,
    cancelled;
  const cleanup = (
    await componentEffect("projection-lab.tsx", "requestAnimationFrame(animate)", {
      ...h,
      scene: h.sceneRef.current,
      performance: { now: () => 0 },
      requestAnimationFrame: (cb) => {
        callback = cb;
        return ++id;
      },
      cancelAnimationFrame: (n) => (cancelled = n),
    })
  )();
  callback(9000);
  near(h.sceneRef.current.elapsed, 0.1);
  cleanup();
  assert.equal(cancelled, id);
  const paused = { ...h.sceneRef.current, paused: true };
  h.commit(paused);
  callback(10000);
  assert.equal(h.sceneRef.current, paused, "queued frame must not advance a paused scene");
  h.pauseForEnvironment();
  assert.equal(h.sceneRef.current.paused, true);
});

test("P11 actual step cancels a drag before changing depth and cannot run while flying", async () => {
  const h = await harness(),
    p = model.pointDisplay(h.sceneRef.current, 8).screen;
  h.startDrag(h.event(p.x, p.y));
  h.onKeyDown({ key: "n", repeat: false, preventDefault() {} });
  assert.equal(h.drag.current, null);
  assert.equal(h.captured.size, 0);
  near(h.sceneRef.current.elapsed, 0.1);
  const afterStep = h.sceneRef.current;
  h.pointerUp(h.event(p.x + 100, p.y));
  assert.equal(h.sceneRef.current, afterStep, "old drag cannot overwrite a step");
  h.commit({ ...afterStep, paused: false });
  const flying = h.sceneRef.current;
  h.step();
  assert.equal(h.sceneRef.current, flying);
  const early = await harness(5);
  early.step();
  assert.deepEqual(early.sceneRef.current, model.initialPointScene());
});
test("P11 actual clean renderer keeps depth geometry/marker and hides overlays, rejects behind marker", async () => {
  const lines = [],
    labels = [],
    arcs = [],
    noop = () => {},
    ctx = {
      save: noop,
      restore: noop,
      translate: noop,
      scale: noop,
      fillRect: noop,
      beginPath: noop,
      rect: noop,
      clip: noop,
      arc: (...a) => arcs.push(a),
      fill: noop,
      fillText: (t) => labels.push(t),
    };
  const draw = await componentCallback("projection-lab-view.ts", "drawProjectionLab", {
    ...math,
    ...model,
    layout,
    setupCanvas: noop,
    drawLine: (_ctx, a, b, color) => lines.push({ a, b, color }),
  });
  const s = model.initialPointScene();
  s.debug = false;
  draw(ctx, { width: 1100, height: 800, dpr: 2 }, s, 8);
  assert.ok(lines.some((l) => l.color === "#28334d"));
  assert.ok(lines.some((l) => l.color === "#74839f"));
  assert.equal(arcs.length, 2);
  assert.equal(labels.length, 0);
  assert.ok(!lines.some((l) => l.color === "#ffe26c" || l.color === "#ff6b6b"));
  const first = arcs[0];
  arcs.length = 0;
  const far = model.pointPreset(1);
  far.debug = false;
  draw(ctx, { width: 1100, height: 800, dpr: 2 }, far, 8);
  near(arcs[0][0] - 550, (first[0] - 550) * 0.5);
  near(arcs[0][1] - 400, (first[1] - 400) * 0.5);
  arcs.length = 0;
  draw(ctx, { width: 1100, height: 800, dpr: 2 }, model.pointPreset(3), 8);
  assert.equal(arcs.length, 0);
});
