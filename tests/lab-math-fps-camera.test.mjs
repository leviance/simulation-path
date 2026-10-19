import assert from "node:assert/strict";
import test from "node:test";
import { dot3, subtract3, magnitude3 } from "../lib/labs/normal.ts";
import { cameraBasisFps } from "../lib/labs/fps-camera.ts";
import {
  initialFpsScene,
  fpsStage,
  fpsPreset,
  activeFpsCamera,
  fpsViewPoint,
  turnFpsCamera,
  lookFpsScene,
  advanceFpsScene,
  toggleFpsMode,
  clampFpsRoom,
  fpsInsideRoom,
  fpsInput,
  fpsResults,
  fpsRoomSegment,
} from "../lib/labs/fps-camera-scene.ts";
import { FPS_ROOM_GEOMETRY, makeFpsRoom } from "../lib/labs/fps-camera-room.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + " != " + b);
const same = (a, b) => {
  close(a.x, b.x);
  close(a.y, b.y);
  close(a.z, b.z);
};
const file = "fps-camera-lab.tsx";
test("P14 view has independent translation, yaw90 and pitch90 oracles", () => {
  let s = initialFpsScene();
  s.camera = { position: { x: 1, y: 2, z: 3 }, yaw: Math.PI / 2, pitch: 0 };
  same(fpsViewPoint({ x: 4, y: 2, z: 3 }, s, 2), { x: 3, y: 0, z: 0 });
  same(fpsViewPoint({ x: 4, y: 2, z: 3 }, s, 3), { x: 0, y: 0, z: 3 });
  same(cameraBasisFps(s.camera).right, { x: 0, y: 0, z: -1 });
  s.camera.yaw = 0;
  s.camera.pitch = Math.PI / 2;
  same(fpsViewPoint({ x: 1, y: 5, z: 3 }, s, 3), { x: 0, y: 0, z: 3 });
});
test("P14 basis and view agree through independent dot products over many poses", () => {
  for (let i = 0; i < 100; i++) {
    const s = initialFpsScene();
    s.camera = { position: { x: 1, y: 2, z: 3 }, yaw: i * 0.27, pitch: -1.4 + i * 0.028 };
    const r = fpsResults(s, 9),
      v = subtract3(r.world, s.camera.position),
      b = r.basis;
    same(r.view, { x: dot3(v, b.right), y: dot3(v, b.up), z: dot3(v, b.forward) });
    assert.ok(r.basisError < 1e-12);
    assert.ok(r.roundTrip < 1e-9);
  }
});
test("P14 stages isolate fixed room, translation, orientation, fly and bounds", () => {
  assert.deepEqual(
    [
      "camera-room",
      "camera-translation",
      "camera-orientation",
      "camera-basis",
      "camera-movement",
      "camera-fly",
      "camera-mouse-look",
      "camera-bounds",
      "camera-validation",
    ].map(fpsStage),
    [1, 2, 3, 4, 5, 6, 7, 8, 9],
  );
  const s = fpsPreset(3);
  assert.deepEqual(activeFpsCamera(s, 1), initialFpsScene().camera);
  assert.equal(activeFpsCamera(s, 2).pitch, 0);
  assert.ok(activeFpsCamera(s, 3).pitch > 0);
  same(advanceFpsScene(s, { strafe: 0, advance: 1, lift: 0 }, 0.1, 5).camera.position, {
    x: 0,
    y: 1.6,
    z: 2.35,
  });
  assert.ok(advanceFpsScene(s, { strafe: 0, advance: 1, lift: 0 }, 0.1, 6).camera.position.y > 1.6);
  assert.equal(advanceFpsScene(s, { strafe: 0, advance: 1, lift: 0 }, 0.1, 4), s);
});
test("P14 room is immutable world geometry with matching native fixture", () => {
  const before = structuredClone(FPS_ROOM_GEOMETRY);
  assert.equal(before.length, 96);
  assert.deepEqual(makeFpsRoom(), before);
  assert.deepEqual(before[0], {
    from: { x: -6, y: 0, z: 0 },
    to: { x: -6, y: 0, z: 22 },
    color: "#4484ae",
  });
  for (let i = 0; i < 5; i++) fpsResults(fpsPreset(i), 9);
  assert.deepEqual(FPS_ROOM_GEOMETRY, before);
  assert.ok(before.some((s) => s.color === "#ffb454"));
  assert.ok(before.some((s) => s.color === "#53f0ae"));
});
test("P14 room clipping retains near/far and two-outside-endpoint crossings", () => {
  const s = initialFpsScene();
  s.lens.verticalFovRadians = Math.PI / 2;
  const line = (from, to) => fpsRoomSegment({ from, to, color: "#fff" }, s, 9);
  const cross = line({ x: -20, y: 1.6, z: 6 }, { x: 20, y: 1.6, z: 6 });
  assert.ok(cross);
  close(cross.from.x, 0);
  close(cross.to.x, 1100);
  assert.ok(line({ x: 0, y: 1.6, z: 1 }, { x: 0.2, y: 1.6, z: 4 }));
  assert.ok(line({ x: 0, y: 1.6, z: 6 }, { x: 0.2, y: 1.6, z: 50 }));
  assert.equal(line({ x: 0, y: 1.6, z: 0 }, { x: 1, y: 1.6, z: 1 }), null);
  assert.equal(line({ x: NaN, y: 0, z: 4 }, { x: 0, y: 0, z: 5 }), null);
  for (let i = 0; i < 5; i++)
    for (const e of fpsResults(fpsPreset(i), 9).segments)
      for (const p of [e.from, e.to])
        assert.ok(
          Number.isFinite(p.x) &&
            Number.isFinite(p.y) &&
            p.x >= -1e-9 &&
            p.x <= 1100 + 1e-9 &&
            p.y >= -1e-9 &&
            p.y <= 800 + 1e-9,
        );
});
test("P14 Walk is dt independent, yaw relative, normalized and ignores pitch/lift", () => {
  for (const fps of [30, 60, 144]) {
    let s = initialFpsScene();
    for (let i = 0; i < fps; i++)
      s = advanceFpsScene(s, { strafe: 0, advance: 1, lift: 0 }, 1 / fps);
    same(s.camera.position, { x: 0, y: 1.6, z: 5.5 });
  }
  const s = initialFpsScene();
  s.camera.yaw = Math.PI / 2;
  s.camera.pitch = Math.PI / 4;
  const a = advanceFpsScene(s, { strafe: 0, advance: 1, lift: 1 }, 0.1);
  same(a.camera.position, { x: 0.35, y: 1.6, z: 2 });
  const d = advanceFpsScene(s, { strafe: 1, advance: 1, lift: 1 }, 0.1);
  close(magnitude3(subtract3(d.camera.position, s.camera.position)), 0.35);
  assert.deepEqual(fpsInput(new Set(["w", "s", "a", "d", "q", "e"])), {
    strafe: 0,
    advance: 0,
    lift: 0,
  });
});
test("P14 Fly pitch45 and world-Y lift have numeric oracles and bounded combined speed", () => {
  const s = initialFpsScene();
  s.fly = true;
  s.camera.pitch = Math.PI / 4;
  const f = advanceFpsScene(s, { strafe: 0, advance: 1, lift: 0 }, 0.1);
  same(f.camera.position, { x: 0, y: 1.6 + 0.35 / Math.sqrt(2), z: 2 + 0.35 / Math.sqrt(2) });
  same(advanceFpsScene(s, { strafe: 0, advance: 0, lift: 1 }, 0.1).camera.position, {
    x: 0,
    y: 1.95,
    z: 2,
  });
  const d = advanceFpsScene(s, { strafe: 1, advance: 1, lift: 1 }, 0.1);
  close(magnitude3(subtract3(d.camera.position, s.camera.position)), 0.35);
  const walk = toggleFpsMode({ ...s, camera: { ...s.camera, position: { x: 0, y: 3, z: 2 } } });
  assert.equal(walk.fly, false);
  close(walk.camera.position.y, 1.6);
});
test("P14 bounds, pause, stalls and invalid inputs do not corrupt state", () => {
  const s = initialFpsScene(),
    i = { strafe: 0, advance: 1, lift: 0 },
    before = structuredClone(s);
  for (const dt of [-1, NaN, Infinity]) assert.equal(advanceFpsScene(s, i, dt), s);
  same(advanceFpsScene(s, i, 5).camera.position, { x: 0, y: 1.6, z: 2.35 });
  assert.equal(advanceFpsScene({ ...s, paused: true }, i, 0.1).camera.position, s.camera.position);
  same(
    clampFpsRoom({ position: { x: 100, y: -10, z: -100 }, yaw: 0, pitch: 0 }, true, 0.35).position,
    { x: 5.65, y: 0.35, z: 0.35 },
  );
  assert.equal(
    clampFpsRoom({ ...s.camera, position: { x: 0, y: 3, z: 2 } }, false, 0.35).position.y,
    1.6,
  );
  assert.deepEqual(s, before);
});
test("P14 look has no dt, wraps yaw, clamps FPS pitch and rejects invalid values", () => {
  const s = initialFpsScene(),
    a = lookFpsScene(s, 20, -10);
  close(a.camera.yaw, 0.05);
  close(a.camera.pitch, 0.025);
  const extreme = lookFpsScene(s, 1e5, -1e5);
  close(extreme.camera.pitch, (89 * Math.PI) / 180);
  assert.ok(Math.abs(extreme.camera.yaw) <= Math.PI);
  assert.equal(lookFpsScene(s, NaN, 0), s);
  assert.equal(turnFpsCamera(s.camera, NaN, 0), s.camera);
});

async function harness(stage = 9) {
  let scene = initialFpsScene(),
    captured = false,
    moving = false;
  const sceneRef = { current: scene },
    drag = { current: null },
    keys = { current: new Set() };
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
    stage,
    sceneRef,
    drag,
    keys,
    canvasRef: { current: canvas },
    size: { width: 550, height: 400, dpr: 2 },
    setCaptured: (v) => {
      captured = v;
    },
    setMoving: (v) => {
      moving = v;
    },
    setFps() {},
    commit: (s) => {
      scene = s;
      sceneRef.current = s;
    },
    fpsPreset,
    turnFpsCamera,
    lookFpsScene,
    advanceFpsScene,
    toggleFpsMode,
    clampFpsRoom,
    fpsInput,
    fpsPointFromEvent: (e, size, outside = false) =>
      outside || (e.clientX >= 0 && e.clientX < 550 && e.clientY >= 0 && e.clientY < 400)
        ? { x: e.clientX, y: e.clientY }
        : null,
  };
  env.cancelLook = await componentCallback(file, "cancelLook", env);
  env.stopInput = await componentCallback(file, "stopInput", env);
  const callbacks = {};
  for (const name of [
    "reset",
    "moveLook",
    "startLook",
    "pointerMove",
    "pointerUp",
    "pointerCancel",
    "onKeyUp",
    "changeMode",
    "togglePause",
    "stepInput",
  ])
    callbacks[name] = await componentCallback(file, name, { ...env, ...callbacks });
  return {
    env,
    canvas,
    callbacks,
    get scene() {
      return scene;
    },
    get captured() {
      return captured;
    },
    get moving() {
      return moving;
    },
  };
}
const pointer = (c, extra = {}) => ({
  currentTarget: c,
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
test("P14 actual drag keeps owner, starts without a pose jump and receives final sample", async () => {
  const h = await harness(),
    c = h.callbacks,
    old = structuredClone(h.scene.camera);
  h.env.keys.current.add("w");
  c.startLook(pointer(h.canvas));
  assert.equal(h.captured, true);
  assert.deepEqual(h.scene.camera, old);
  assert.ok(h.env.keys.current.has("w"));
  c.pointerMove(pointer(h.canvas, { pointerId: 2, clientX: 140 }));
  assert.deepEqual(h.scene.camera, old);
  c.pointerMove(pointer(h.canvas, { clientX: 120 }));
  close(h.scene.camera.yaw, 0.05);
  c.pointerUp(pointer(h.canvas, { clientX: 130, buttons: 0 }));
  close(h.scene.camera.yaw, 0.075);
  assert.equal(h.captured, false);
});
test("P14 actual pointer rejects wrong button, earlier stages, failed capture and missing button", async () => {
  const h = await harness(),
    c = h.callbacks;
  c.startLook(pointer(h.canvas, { button: 2 }));
  assert.equal(h.captured, false);
  h.canvas.setPointerCapture = () => {
    throw Error("capture");
  };
  c.startLook(pointer(h.canvas));
  assert.equal(h.env.drag.current, null);
  h.canvas.setPointerCapture = () => {};
  c.startLook(pointer(h.canvas));
  c.pointerMove(pointer(h.canvas, { buttons: 0 }));
  assert.equal(h.env.drag.current, null);
  const early = await harness(6);
  early.callbacks.startLook(pointer(early.canvas));
  assert.equal(early.env.drag.current, null);
});
test("P14 actual reset/mode/pause clear keys and capture; stale repeated keydown cannot restart movement", async () => {
  const h = await harness(),
    c = h.callbacks;
  c.startLook(pointer(h.canvas));
  h.env.keys.current.add("w");
  c.changeMode();
  assert.equal(h.captured, false);
  assert.equal(h.env.keys.current.size, 0);
  assert.equal(h.scene.fly, true);
  c.startLook(pointer(h.canvas));
  c.togglePause();
  assert.equal(h.scene.paused, true);
  assert.equal(h.captured, false);
  c.reset();
  assert.deepEqual(h.scene, initialFpsScene());
  const key = await componentCallback(file, "onKeyDown", {
    ...h.env,
    ...c,
    toggleDemo() {},
    toggleDebug() {},
  });
  key({ key: "w", repeat: true, preventDefault() {} });
  assert.equal(h.env.keys.current.size, 0);
  key({ key: "w", repeat: false, preventDefault() {} });
  assert.ok(h.env.keys.current.has("w"));
});
test("P14 actual keyboard can look while walking, preserves Tab/modifiers and blocks repeated toggles", async () => {
  const h = await harness(),
    c = h.callbacks;
  const handler = await componentCallback(file, "onKeyDown", {
    ...h.env,
    ...c,
    toggleDemo() {},
    toggleDebug() {},
  });
  const e = (key) => ({ key, repeat: false, preventDefault() {} });
  handler(e("w"));
  handler(e("l"));
  assert.ok(h.env.keys.current.has("w"));
  close(h.scene.camera.yaw, (3 * Math.PI) / 180);
  handler({ ...e("m"), repeat: true });
  assert.equal(h.scene.fly, false);
  handler({ ...e("d"), ctrlKey: true });
  handler(e("Tab"));
  assert.equal(h.env.keys.current.size, 1);
  c.onKeyUp(e("w"));
  assert.equal(h.env.keys.current.size, 0);
  handler(e(" "));
  assert.equal(h.scene.paused, true);
});
test("P14 actual animation uses real dt and cleanup cancels the frame", async () => {
  const h = await harness();
  h.env.keys.current.add("w");
  let animate,
    cancelled = 0;
  const effect = await componentEffect(file, "const animate =", {
    ...h.env,
    scene: h.scene,
    moving: true,
    reducedMotion: false,
    performance: { now: () => 0 },
    requestAnimationFrame: (fn) => {
      animate = fn;
      return 5;
    },
    cancelAnimationFrame: (id) => {
      cancelled = id;
    },
  });
  const cleanup = effect();
  animate(100);
  close(h.scene.camera.position.z, 2.35);
  cleanup();
  assert.equal(cancelled, 5);
});
test("P14 actual lifecycle pauses and removes all window/document listeners", async () => {
  const h = await harness(),
    events = new Map(),
    removed = [];
  const effect = await componentEffect(file, '"visibilitychange"', {
    ...h.env,
    window: {
      addEventListener: (k, fn) => events.set(k, fn),
      removeEventListener: (k) => removed.push(k),
    },
    document: {
      hidden: true,
      addEventListener: (k, fn) => events.set(k, fn),
      removeEventListener: (k) => removed.push(k),
    },
  });
  const cleanup = effect();
  h.env.keys.current.add("w");
  h.callbacks.startLook(pointer(h.canvas));
  events.get("blur")();
  assert.equal(h.scene.paused, true);
  assert.equal(h.captured, false);
  assert.equal(h.env.keys.current.size, 0);
  cleanup();
  assert.deepEqual(removed, ["blur", "visibilitychange"]);
});
test("P14 actual Canvas point mapping keeps CSS delta independent of DPR and rejects letterbox bars", async () => {
  const layout = await componentCallback("fps-camera-lab-view.ts", "layout", {});
  const point = await componentCallback("fps-camera-lab-view.ts", "fpsPointFromEvent", { layout });
  const canvas = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 550, height: 500 }) },
    e = { currentTarget: canvas, clientX: 285, clientY: 270 };
  for (const dpr of [1, 2, 3])
    assert.deepEqual(point(e, { width: 550, height: 500, dpr }), { x: 285, y: 270 });
  assert.equal(point({ ...e, clientY: 21 }, { width: 550, height: 500, dpr: 2 }), null);
  assert.ok(point({ ...e, clientY: 21 }, { width: 550, height: 500, dpr: 2 }, true));
});
test("P14 actual renderer keeps floor/walls/markers when debug is hidden", async () => {
  const layout = await componentCallback("fps-camera-lab-view.ts", "layout", {});
  const lines = [],
    labels = [];
  const draw = await componentCallback("fps-camera-lab-view.ts", "drawFpsLab", {
    layout,
    fpsResults,
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
    fillText: (t) => labels.push(t),
  };
  draw(ctx, { width: 550, height: 400, dpr: 2 }, { ...initialFpsScene(), debug: false }, 9);
  assert.ok(lines.includes("#4484ae"));
  assert.ok(lines.includes("#7da5ee"));
  assert.ok(lines.includes("#ffb454"));
  assert.equal(labels.length, 0);
});
test("P14 actual reduced-motion/demo/step behavior does not block direct user control", async () => {
  const h = await harness(),
    c = h.callbacks;
  const toggle = await componentCallback(file, "toggleDemo", { ...h.env, reducedMotion: true });
  toggle();
  assert.equal(h.scene.demo, false);
  const effect = await componentEffect(file, "if (reducedMotion)", {
    ...h.env,
    reducedMotion: true,
  });
  h.env.commit({ ...h.scene, demo: true });
  effect();
  assert.equal(h.scene.demo, false);
  h.env.commit({ ...h.scene, paused: true });
  c.stepInput({ strafe: 0, advance: 1, lift: 0 });
  assert.equal(h.scene.paused, true);
  close(h.scene.camera.position.z, 2.35);
});

test("P14 actual position and margin sliders clamp all six room bounds immediately", async () => {
  const h = await harness();
  const edit = await componentCallback(file, "editPosition", { ...h.env });
  h.env.commit({ ...h.scene, margin: 1, fly: true });
  edit("x", 5.65);
  close(h.scene.camera.position.x, 5);
  edit("y", 3.65);
  close(h.scene.camera.position.y, 3);
  edit("z", 0.35);
  close(h.scene.camera.position.z, 1);
  assert.equal(fpsInsideRoom(h.scene), true);
  assert.equal(
    fpsInsideRoom({
      ...h.scene,
      camera: { ...h.scene.camera, position: { ...h.scene.camera.position, y: 3.5 } },
    }),
    false,
  );
  const number = await componentCallback(file, "editNumber", { ...h.env });
  h.env.commit({
    ...initialFpsScene(),
    camera: { ...initialFpsScene().camera, position: { x: 5.65, y: 1.6, z: 2 } },
  });
  number("margin", 1);
  close(h.scene.camera.position.x, 5);
});
