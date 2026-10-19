import assert from "node:assert/strict";
import test from "node:test";
import * as math from "../lib/labs/normal.ts";
import * as camera from "../lib/labs/normal-camera.ts";
import * as model from "../lib/labs/normal-scene.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
const near = (a, b, e = 1e-8) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= e, a + " != " + b);
const vectorNear = (a, b) => {
  near(a.x, b.x);
  near(a.y, b.y);
  near(a.z, b.z);
};
test("P10 cross has basis and independent all-component numeric oracles", () => {
  assert.deepEqual(math.cross3({ x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }), { x: 0, y: 0, z: 1 });
  assert.deepEqual(math.cross3({ x: 1, y: 2, z: 3 }, { x: 4, y: -2, z: 1 }), {
    x: 8,
    y: 11,
    z: -10,
  });
});
test("P10 cross is orthogonal, winding anti-symmetric and area matches independent Heron", () => {
  for (let sample = 0; sample < 61; sample++) {
    const t = {
      a: { x: -0.7, y: 0.2, z: -0.3 },
      b: { x: ((sample % 7) - 3) * 0.4, y: ((sample % 9) - 4) * 0.3, z: ((sample % 5) - 2) * 0.5 },
      c: {
        x: ((sample % 11) - 5) * 0.3,
        y: ((sample % 13) - 6) * 0.25,
        z: ((sample % 3) - 1) * 0.7,
      },
    };
    const { ab, ac } = math.triangleEdges(t),
      n = math.triangleRawNormal(t);
    near(math.dot3(n, ab), 0);
    near(math.dot3(n, ac), 0);
    const a = math.magnitude3(ab),
      b = math.magnitude3(math.subtract3(t.c, t.b)),
      c = math.magnitude3(ac),
      s = (a + b + c) / 2;
    near(math.triangleArea(t), Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c))), 1e-7);
    vectorNear(math.triangleRawNormal(math.reverseWinding(t)), math.scale3(n, -1));
    near(math.triangleArea(math.reverseWinding(t)), math.triangleArea(t));
  }
});
test("P10 presets distinguish finite area, zero edges, near-collinearity and small perpendicular triangles", () => {
  const r = model.compassResults(model.compassPreset(1));
  near(r.rawLength, 12);
  near(r.area, 6);
  near(math.magnitude3(r.unit), 1);
  for (const i of [2, 3, 4]) {
    const result = model.compassResults(model.compassPreset(i));
    assert.equal(result.valid, false);
    assert.equal(result.facing, null);
    assert.equal(result.status, "Không xác định");
  }
  assert.ok(model.compassResults(model.compassPreset(4)).area > 0);
  assert.equal(
    math.isDegenerateTriangle({
      a: { x: 0, y: 0, z: 0 },
      b: { x: 1e-4, y: 0, z: 0 },
      c: { x: 0, y: 1e-4, z: 0 },
    }),
    false,
  );
});
test("P10 camera has independent axis-aligned oracle and perspective inverse-depth scaling", () => {
  assert.deepEqual(
    camera.worldToCompassCamera({ x: 1, y: 2, z: 3 }, { yaw: 0, pitch: 0, radius: 9 }),
    { x: 1, y: 2, z: 6 },
  );
  const a = camera.projectCompassPoint({ x: 1, y: 1, z: 2 }),
    b = camera.projectCompassPoint({ x: 1, y: 1, z: 4 });
  near(a.x - 550, 2 * (b.x - 550));
  near(410 - a.y, 2 * (410 - b.y));
  for (const z of [-1, 0, 0.19, 30.1, NaN])
    assert.equal(camera.projectCompassPoint({ x: 0, y: 0, z }), null);
});
test("P10 depth clipping keeps the analytic near/far intersections and rejects invalid segments", () => {
  const first = { x: 0, y: 0, z: -1 },
    last = { x: 2, y: 0, z: 1 };
  const clipped = camera.clipCompassDepth(first, last);
  near(clipped[0].x, 1.2);
  assert.equal(clipped[0].z, 0.2);
  assert.ok(camera.projectCompassPoint(clipped[0]));
  assert.equal(first.z, -1);
  const far = camera.clipCompassDepth({ x: 0, y: 0, z: 29 }, { x: 2, y: 0, z: 31 });
  near(far[1].x, 1);
  assert.equal(far[1].z, 30);
  assert.equal(camera.clipCompassDepth({ x: 0, y: 0, z: -1 }, { x: 0, y: 0, z: 0 }), null);
  assert.equal(camera.clipCompassDepth({ x: NaN, y: 0, z: 1 }, last), null);
});
test("P10 facing uses actual eye, not fixed view direction, and orbit leaves geometry intact", () => {
  let scene = model.compassPreset(1);
  scene = { ...scene, camera: { yaw: 0, pitch: 0, radius: 9 } };
  const geometry = structuredClone(scene.triangle),
    front = model.compassResults(scene);
  assert.ok(front.facing > 0);
  assert.ok(model.compassResults(model.flipCompass(scene)).facing < 0);
  scene = { ...scene, camera: { yaw: Math.PI, pitch: 0, radius: 9 } };
  assert.ok(model.compassResults(scene).facing < 0);
  scene = { ...scene, camera: { yaw: Math.PI / 2, pitch: 0, radius: 9 } };
  assert.equal(model.compassResults(scene).status, "edge-on");
  assert.deepEqual(scene.triangle, geometry);
});
test("P10 vertex setters are immutable, bounded and reject nonfinite; camera/animation have bounded work", () => {
  const original = model.initialCompassScene(),
    next = model.changeCompassVertex(original, "z", 99);
  near(next.triangle.c.z, 2);
  near(original.triangle.c.z, 1);
  assert.equal(model.changeCompassVertex(original, "x", NaN), original);
  assert.equal(model.moveCompassVertex(original, { x: NaN, y: 0.1, z: 0 }), original);
  const orbit = camera.orbitCompass(original.camera, 9999, 9999);
  assert.ok(Math.abs(orbit.yaw) <= Math.PI);
  near(orbit.pitch, 1.2);
  for (const dt of [0, -1, NaN, Infinity, 0.11])
    assert.equal(model.advanceCompass(original, dt), original);
  near(model.advanceCompass(original, 0.1).camera.yaw, original.camera.yaw + 0.035);
});
const layout = (size) => {
  const scale = Math.min(size.width / 1100, size.height / 800);
  return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 800 * scale) / 2 };
};
const point = await componentCallback("normal-lab-view.ts", "compassPointFromEvent", { layout });
test("P10 actual pointer mapping applies CSS scale/letterbox once, never DPR twice", () => {
  const canvas = {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 2200, height: 1600 }),
  };
  assert.deepEqual(
    point(
      { clientX: 1110, clientY: 840, currentTarget: canvas },
      { width: 1100, height: 800, dpr: 3 },
    ),
    { x: 550, y: 410 },
  );
  assert.equal(
    point(
      { clientX: 10, clientY: 20, currentTarget: canvas },
      { width: 1100, height: 800, dpr: 3 },
    ),
    null,
  );
});
async function harness(stage = 7) {
  const sceneRef = { current: model.initialCompassScene() },
    drag = { current: null },
    captured = new Set(),
    canvas = {
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 1100, height: 800 }),
      focus: () => {},
      setPointerCapture: (id) => captured.add(id),
      hasPointerCapture: (id) => captured.has(id),
      releasePointerCapture: (id) => captured.delete(id),
    };
  const env = {
    ...camera,
    ...model,
    sceneRef,
    drag,
    canvasRef: { current: canvas },
    size: { width: 1100, height: 800, dpr: 2 },
    stage,
    reducedMotion: false,
    compassPointFromEvent: point,
  };
  env.commit = (next) => (sceneRef.current = next);
  for (const name of [
    "cancelDrag",
    "reset",
    "flip",
    "togglePause",
    "setCamera",
    "moveOrbit",
    "startDrag",
    "pointerMove",
    "pointerUp",
    "pointerCancel",
    "onKeyDown",
  ])
    env[name] = await componentCallback("normal-lab.tsx", name, env);
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
test("P10 actual orbit keeps grab position, owner and final sample without editing vertices", async () => {
  const h = await harness(),
    before = structuredClone(h.sceneRef.current);
  h.startDrag(h.event(500, 400));
  assert.deepEqual(h.sceneRef.current, before);
  h.pointerMove(h.event(600, 500, { pointerId: 2 }));
  assert.deepEqual(h.sceneRef.current, before);
  h.pointerMove(h.event(525, 425));
  h.pointerUp(h.event(550, 450));
  near(h.sceneRef.current.camera.yaw, before.camera.yaw + 0.4);
  near(h.sceneRef.current.camera.pitch, before.camera.pitch + 0.4);
  assert.deepEqual(h.sceneRef.current.triangle, before.triangle);
  assert.equal(h.drag.current, null);
  assert.equal(h.captured.size, 0);
});
test("P10 actual pointer rejects wrong buttons/early stages and cancels lost button/capture failure", async () => {
  for (const extra of [{ button: 2 }, { isPrimary: false }]) {
    const h = await harness();
    h.startDrag(h.event(500, 400, extra));
    assert.equal(h.drag.current, null);
  }
  const early = await harness(5);
  early.startDrag(early.event(500, 400));
  assert.equal(early.drag.current, null);
  const h = await harness();
  h.startDrag(h.event(500, 400));
  h.pointerMove(h.event(550, 400, { buttons: 0 }));
  assert.equal(h.drag.current, null);
  h.canvas.setPointerCapture = () => {
    throw Error("denied");
  };
  h.startDrag(h.event(500, 400));
  assert.equal(h.drag.current, null);
});
test("P10 actual keyboard leaves Tab/modifiers free, selects/moves Z and ignores repeated winding", async () => {
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
  h.onKeyDown(event("1"));
  assert.equal(h.sceneRef.current.selected, "a");
  h.onKeyDown(event("PageUp"));
  near(h.sceneRef.current.triangle.a.z, 0.1);
  const before = structuredClone(h.sceneRef.current.triangle);
  h.onKeyDown(event("f", { repeat: true }));
  assert.deepEqual(h.sceneRef.current.triangle, before);
  h.onKeyDown(event("f"));
  assert.deepEqual(h.sceneRef.current.triangle, math.reverseWinding(before));
  const cameraBefore = h.sceneRef.current.camera;
  h.onKeyDown(event("d", { ctrlKey: true }));
  assert.equal(h.sceneRef.current.camera, cameraBefore);
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
  h.onKeyDown(event("r"));
  assert.deepEqual(h.sceneRef.current, model.initialCompassScene());
});
test("P10 actual lifecycle pauses/cancels on hidden/resize, clears listeners and resets mode separately", async () => {
  const h = await harness(),
    listeners = new Map(),
    removed = [];
  const target = {
    hidden: false,
    addEventListener: (n, cb) => listeners.set(n, cb),
    removeEventListener: (n) => removed.push(n),
  };
  const cleanup = (
    await componentEffect("normal-lab.tsx", "visibilitychange", {
      ...h,
      window: target,
      document: target,
    })
  )();
  h.startDrag(h.event(500, 400));
  target.hidden = true;
  listeners.get("visibilitychange")();
  assert.equal(h.drag.current, null);
  h.sceneRef.current.paused = false;
  (await componentEffect("normal-lab.tsx", "Resize releases", h))();
  assert.equal(h.sceneRef.current.paused, true);
  h.sceneRef.current.paused = false;
  (await componentEffect("normal-lab.tsx", "if (reducedMotion)", { ...h, reducedMotion: true }))();
  assert.equal(h.sceneRef.current.paused, true);
  cleanup();
  assert.deepEqual(removed.sort(), ["blur", "visibilitychange"]);
});
test("P10 actual animation clamps a stalled frame and disposes current rAF", async () => {
  const h = await harness();
  h.sceneRef.current.paused = false;
  let callback,
    serial = 0,
    cancelled;
  const before = h.sceneRef.current.camera.yaw;
  const cleanup = (
    await componentEffect("normal-lab.tsx", "requestAnimationFrame(animate)", {
      ...h,
      scene: h.sceneRef.current,
      performance: { now: () => 0 },
      requestAnimationFrame: (cb) => {
        callback = cb;
        return ++serial;
      },
      cancelAnimationFrame: (id) => (cancelled = id),
    })
  )();
  callback(9000);
  near(h.sceneRef.current.camera.yaw, before + 0.035);
  cleanup();
  assert.equal(cancelled, serial);
  const paused = { ...h.sceneRef.current, paused: true };
  h.commit(paused);
  callback(10000);
  assert.equal(h.sceneRef.current, paused, "queued frame must not advance a paused scene");
});
test("P10 actual renderer draws all required vectors in perspective and hides undefined normal", async () => {
  const lines = [],
    labels = [],
    noop = () => {},
    ctx = {
      save: noop,
      restore: noop,
      translate: noop,
      scale: noop,
      beginPath: noop,
      rect: noop,
      clip: noop,
      arc: noop,
      fill: noop,
      fillText: (text) => labels.push(text),
    };
  const draw = await componentCallback("normal-lab-view.ts", "drawCompassLab", {
    ...math,
    ...camera,
    ...model,
    layout,
    setupCanvas: noop,
    drawLine: (_ctx, a, b, color) => lines.push({ a, b, color }),
  });
  draw(ctx, { width: 1100, height: 800, dpr: 2 }, model.initialCompassScene(), 7);
  for (const color of ["#ff6b6b", "#53f0ae", "#84a9ff", "#ffb454", "#53dfef", "#ffe26c", "#e6a0ff"])
    assert.ok(
      lines.some((l) => l.color === color),
      color,
    );
  for (const label of ["X", "Y", "Z", "P0"]) assert.ok(labels.includes(label), label);
  const first = lines[0].a;
  lines.length = 0;
  const scene = model.initialCompassScene();
  scene.camera.yaw += 0.7;
  draw(ctx, { width: 1100, height: 800, dpr: 2 }, scene, 7);
  assert.notDeepEqual(lines[0].a, first);
  lines.length = 0;
  draw(ctx, { width: 1100, height: 800, dpr: 2 }, model.compassPreset(2), 7);
  assert.equal(
    lines.some((l) => l.color === "#e6a0ff" || l.color === "#ffe26c"),
    false,
  );
});
