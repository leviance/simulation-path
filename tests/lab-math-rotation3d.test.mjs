import assert from "node:assert/strict";
import test from "node:test";
import * as vector from "../lib/labs/normal.ts";
import * as rotation from "../lib/labs/rotation3d.ts";
import * as projection from "../lib/labs/projection-point.ts";
import * as model from "../lib/labs/rotation3d-scene.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
const near = (a, b, e = 1e-9) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= e, a + " != " + b);
const vec = (a, b) => {
  near(a.x, b.x);
  near(a.y, b.y);
  near(a.z, b.z);
};
test("P12 independent quarter-turn and order oracles fix signs and fixed-axis semantics", () => {
  const p = { x: 1, y: 2, z: 3 },
    q = Math.PI / 2,
    a = { pitch: q, yaw: q, roll: 0 };
  vec(rotation.rotateX3(p, q), { x: 1, y: -3, z: 2 });
  vec(rotation.rotateY3(p, q), { x: 3, y: 2, z: -1 });
  vec(rotation.rotateZ3(p, q), { x: -2, y: 1, z: 3 });
  vec(rotation.rotateEuler3(p, a, "xyz"), { x: 2, y: -3, z: -1 });
  vec(rotation.rotateEuler3(p, a, "zyx"), { x: 3, y: 1, z: 2 });
  for (const f of [rotation.rotateX3, rotation.rotateY3, rotation.rotateZ3])
    for (const angle of [0, 2 * Math.PI]) vec(f(p, angle), p);
});
test("P12 centroid and raw cross have numeric oracles; normal ignores translation and flips with winding", () => {
  const t = rotation.DEFAULT_WORLD_TRIANGLE,
    raw = vector.cross3(vector.subtract3(t.b, t.a), vector.subtract3(t.c, t.a));
  vec(rotation.rotationTriangleCentroid(t), { x: 0, y: 0, z: 6 });
  vec(raw, { x: -1.71, y: 0.51, z: 6.45 });
  const local = rotation.toLocalTriangle3(t);
  vec(rotation.rotationTriangleCentroid(local), { x: 0, y: 0, z: 0 });
  const translated = rotation.translateTriangle3(t, { x: 2, y: 3, z: 1 });
  vec(model.triangleUnitNormal(t), model.triangleUnitNormal(translated));
  vec(
    model.triangleUnitNormal({ a: t.a, b: t.c, c: t.b }),
    vector.scale3(model.triangleUnitNormal(t), -1),
  );
  vec(model.triangleUnitNormal({ a: t.a, b: t.a, c: t.c }), { x: 0, y: 0, z: 0 });
});
test("P12 every order preserves edges/centroid/normal and inverse over a parameter grid", () => {
  for (const order of ["xyz", "zyx"])
    for (const pitch of [-2, -0.5, 0, 0.7, 2.5]) {
      const s = model.initialRotationScene();
      s.angles = { pitch, yaw: 0.7, roll: -0.3 };
      s.order = order;
      s.position = { x: 1, y: -1, z: 7 };
      const r = model.rotationResults(s, 8);
      assert.ok(r.edgeError < 1e-9);
      assert.ok(r.roundTrip < 1e-9);
      assert.ok(r.normalError < 1e-9);
      vec(r.center, s.position);
      near(vector.magnitude3(r.normal), 1);
      near(vector.dot3(r.normal, vector.subtract3(r.world.b, r.world.a)), 0);
      near(vector.dot3(r.normal, vector.subtract3(r.world.c, r.world.a)), 0);
    }
});
test("P12 stages do not leak yaw/roll early and presets reproduce near rejection", () => {
  const s = model.rotationPreset(2);
  assert.deepEqual(model.rotationResults(s, 1).angles, { pitch: 0, yaw: 0, roll: 0 });
  assert.deepEqual(model.rotationResults(s, 3).angles, { pitch: 0.4, yaw: 0, roll: 0 });
  assert.ok(model.rotationResults(s, 4).orderDifference > 1e-3);
  assert.equal(model.rotationResults(model.rotationPreset(3), 1).vertices[0].status, "before-near");
  assert.ok(model.rotationResults(model.rotationPreset(0), 1).allVisible);
});
test("P12 object mouse wraps beyond 90 degrees, rejects nonfinite data and does not use FPS clamp", () => {
  const a = model.applyMouseDrag({ pitch: 0, yaw: 0, roll: 0.3 }, 20, -10, 0.01);
  near(a.yaw, 0.2);
  near(a.pitch, 0.1);
  near(a.roll, 0.3);
  near(model.applyMouseDrag({ pitch: 0, yaw: 0, roll: 0 }, 0, -200, 0.01).pitch, 2);
  const start = { pitch: 0, yaw: 0, roll: 0 };
  for (const [dx, dy, sensitivity] of [
    [NaN, 1, 0.01],
    [1, Infinity, 0.01],
    [1, 1, 0],
    [1, 1, 0.1],
  ])
    assert.equal(model.applyMouseDrag(start, dx, dy, sensitivity), start);
  for (const angle of [-100, 100, 3 * Math.PI])
    assert.ok(Math.abs(model.wrapRotationAngle(angle)) <= Math.PI);
});
test("P12 scene setters are immutable/atomic and equal dt partitions give equal orientation", () => {
  const s = model.initialRotationScene();
  assert.equal(model.moveRotationModel(s, { x: NaN, y: 1, z: 0 }), s);
  assert.equal(model.changeRotationAngle(s, "pitch", Infinity), s);
  assert.equal(model.setRotationPosition(s, "z", NaN), s);
  assert.deepEqual(model.moveRotationModel(s, { x: 99, y: 99, z: 99 }).position, {
    x: 4,
    y: 4,
    z: 15,
  });
  let a = s,
    b = s;
  for (let i = 0; i < 60; i++) a = model.advanceRotation(a, 1 / 60);
  for (let i = 0; i < 20; i++) b = model.advanceRotation(b, 0.05);
  near(a.angles.pitch, b.angles.pitch);
  near(a.angles.yaw, b.angles.yaw);
  near(a.angles.roll, b.angles.roll);
  for (const dt of [0, -1, NaN, Infinity]) assert.equal(model.advanceRotation(s, dt), s);
  near(model.advanceRotation(s, 9).angles.pitch, 0.035);
});
const layout = (size) => {
  const scale = Math.min(size.width / 1100, size.height / 800);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 800 * scale) / 2 };
};
const point = await componentCallback("rotation3d-lab-view.ts", "rotationPointFromEvent", {
  layout,
  ...model,
});
test("P12 actual mouse mapping applies CSS/letterbox once and permits captured points outside", () => {
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
  assert.equal(
    point({ clientX: 0, clientY: 0, currentTarget: canvas }, { width: 1100, height: 800, dpr: 3 }),
    null,
  );
  assert.ok(
    point(
      { clientX: 0, clientY: 0, currentTarget: canvas },
      { width: 1100, height: 800, dpr: 3 },
      true,
    ),
  );
});
async function harness(stage = 8) {
  const sceneRef = { current: model.initialRotationScene() },
    drag = { current: null },
    capturedIds = new Set(),
    state = { captured: false },
    canvas = {
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 1100, height: 800 }),
      focus() {},
      setPointerCapture: (id) => capturedIds.add(id),
      hasPointerCapture: (id) => capturedIds.has(id),
      releasePointerCapture: (id) => capturedIds.delete(id),
    };
  const env = {
    ...model,
    sceneRef,
    drag,
    canvasRef: { current: canvas },
    size: { width: 1100, height: 800, dpr: 2 },
    stage,
    reducedMotion: false,
    rotationPointFromEvent: point,
    setCaptured: (value) => (state.captured = value),
  };
  env.commit = (next) => (sceneRef.current = next);
  for (const name of [
    "cancelDrag",
    "reset",
    "editAngle",
    "editPosition",
    "editSensitivity",
    "setOrder",
    "togglePause",
    "toggleDebug",
    "moveDrag",
    "startDrag",
    "pointerMove",
    "pointerUp",
    "pointerCancel",
    "onKeyDown",
  ])
    env[name] = await componentCallback("rotation3d-lab.tsx", name, env);
  return {
    ...env,
    canvas,
    state,
    capturedIds,
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
test("P12 actual drag is relative, owned and takes final up sample without moving model or roll", async () => {
  const h = await harness(),
    before = structuredClone(h.sceneRef.current);
  h.startDrag(h.event(500, 400));
  assert.deepEqual(h.sceneRef.current, before);
  assert.equal(h.state.captured, true);
  h.pointerMove(h.event(700, 600, { pointerId: 2 }));
  assert.deepEqual(h.sceneRef.current, before);
  h.pointerMove(h.event(525, 390));
  h.pointerUp(h.event(550, 380));
  near(h.sceneRef.current.angles.yaw, 0.4);
  near(h.sceneRef.current.angles.pitch, 0.16);
  near(h.sceneRef.current.angles.roll, 0);
  assert.deepEqual(h.sceneRef.current.position, before.position);
  assert.equal(h.drag.current, null);
  assert.equal(h.state.captured, false);
  assert.equal(h.capturedIds.size, 0);
});
test("P12 actual pointer rejects early/background/right input and cancels missing button/capture failure", async () => {
  for (const [stage, extra, x, y] of [
    [5, {}, 500, 400],
    [8, { button: 2 }, 500, 400],
    [8, { isPrimary: false }, 500, 400],
    [8, {}, 20, 20],
  ]) {
    const h = await harness(stage);
    h.startDrag(h.event(x, y, extra));
    assert.equal(h.drag.current, null);
  }
  const h = await harness();
  h.startDrag(h.event(500, 400));
  h.pointerMove(h.event(550, 400, { buttons: 0 }));
  assert.equal(h.drag.current, null);
  h.canvas.setPointerCapture = () => {
    throw Error("denied");
  };
  h.startDrag(h.event(500, 400));
  assert.equal(h.drag.current, null);
  assert.equal(h.state.captured, false);
});
test("P12 actual state edits, order, reset and sensitivity cancel the active capture", async () => {
  for (const [name, args] of [
    ["editAngle", ["yaw", 0.7]],
    ["editPosition", ["z", 7]],
    ["editSensitivity", [0.01]],
    ["setOrder", ["zyx"]],
    ["reset", [2]],
  ]) {
    const h = await harness();
    h.startDrag(h.event(500, 400));
    h[name](...args);
    assert.equal(h.drag.current, null);
    assert.equal(h.state.captured, false);
    assert.equal(h.capturedIds.size, 0);
    assert.equal(h.sceneRef.current.paused, true);
  }
});
test("P12 actual keyboard keeps Tab/modifiers, Q/E roll, one order toggle and repeated Space prevention", async () => {
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
  near(h.sceneRef.current.angles.roll, (5 * Math.PI) / 180);
  h.onKeyDown(event("q"));
  near(h.sceneRef.current.angles.roll, 0);
  h.onKeyDown(event("o", { repeat: true }));
  assert.equal(h.sceneRef.current.order, "xyz");
  h.onKeyDown(event("o"));
  assert.equal(h.sceneRef.current.order, "zyx");
  h.onKeyDown(event("w", { ctrlKey: true }));
  near(h.sceneRef.current.angles.pitch, 0);
  h.onKeyDown(
    event("Tab", {
      preventDefault() {
        throw Error("trapped Tab");
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
  near(h.sceneRef.current.angles.yaw, 0.055);
  h.onKeyDown(event("f"));
  assert.equal(h.sceneRef.current.debug, false);
  h.onKeyDown(event("r"));
  assert.deepEqual(h.sceneRef.current, model.initialRotationScene());
  const early = await harness(3);
  early.onKeyDown(event("e"));
  near(early.sceneRef.current.angles.roll, 0);
});
test("P12 actual lifecycle pauses/cancels on blur, hidden, resize and mode and disposes listeners", async () => {
  const h = await harness(),
    listeners = new Map(),
    removed = [],
    target = {
      hidden: false,
      addEventListener: (n, cb) => listeners.set(n, cb),
      removeEventListener: (n) => removed.push(n),
    };
  const cleanup = (
    await componentEffect("rotation3d-lab.tsx", "visibilitychange", {
      ...h,
      window: target,
      document: target,
    })
  )();
  h.startDrag(h.event(500, 400));
  target.hidden = true;
  listeners.get("visibilitychange")();
  assert.equal(h.drag.current, null);
  const before = h.sceneRef.current.position;
  h.sceneRef.current.paused = false;
  (await componentEffect("rotation3d-lab.tsx", "Resize releases", h))();
  assert.equal(h.sceneRef.current.paused, true);
  assert.equal(h.sceneRef.current.position, before);
  (await componentEffect("rotation3d-lab.tsx", "initialRotationScene()", h))();
  assert.deepEqual(h.sceneRef.current, model.initialRotationScene());
  cleanup();
  assert.deepEqual(removed.sort(), ["blur", "visibilitychange"]);
});
test("P12 actual animation caps stalls, respects queued pause/reduced-motion and cancels current rAF", async () => {
  const h = await harness();
  h.sceneRef.current.paused = false;
  let callback,
    id = 0,
    cancelled;
  const cleanup = (
    await componentEffect("rotation3d-lab.tsx", "requestAnimationFrame(animate)", {
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
  near(h.sceneRef.current.angles.pitch, 0.035);
  cleanup();
  assert.equal(cancelled, id);
  const paused = { ...h.sceneRef.current, paused: true };
  h.commit(paused);
  callback(10000);
  assert.equal(h.sceneRef.current, paused);
  h.sceneRef.current.paused = false;
  (
    await componentEffect("rotation3d-lab.tsx", "if (reducedMotion)", { ...h, reducedMotion: true })
  )();
  assert.equal(h.sceneRef.current.paused, true);
});
test("P12 actual renderer projects geometry and a true 3D normal; clean mode retains primary scene", async () => {
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
  const draw = await componentCallback("rotation3d-lab-view.ts", "drawRotationLab", {
    ...vector,
    ...projection,
    ...model,
    ...rotation,
    layout,
    setupCanvas: noop,
    drawLine: (_ctx, a, b, color) => lines.push({ a, b, color }),
  });
  const s = model.rotationPreset(2);
  draw(ctx, { width: 1100, height: 800, dpr: 2 }, s, 8);
  const normal = lines.filter((l) => l.color === "#ffe26c");
  assert.equal(normal.length, 3);
  const r = model.rotationResults(s, 8),
    expected = projection.projectPerspective(
      r.normalTip,
      s.camera,
      s.lens,
      model.rotationViewport(),
    );
  near(normal[0].b.x, expected.screen.x);
  near(normal[0].b.y, expected.screen.y);
  lines.length = 0;
  labels.length = 0;
  arcs.length = 0;
  s.debug = false;
  draw(ctx, { width: 1100, height: 800, dpr: 2 }, s, 8);
  for (const color of ["#28334d", "#74839f", "#ffb454", "#53f0ae", "#84a9ff"])
    assert.ok(
      lines.some((l) => l.color === color),
      color,
    );
  assert.ok(!lines.some((l) => l.color === "#ffe26c"));
  assert.equal(labels.length, 0);
  assert.equal(arcs.length, 0);
  assert.ok(lines.every((l) => [l.a.x, l.a.y, l.b.x, l.b.y].every(Number.isFinite)));
});
