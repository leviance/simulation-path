import assert from "node:assert/strict";
import test from "node:test";
import {
  initialCubeScene,
  cubeStage,
  cubePreset,
  cubeViewport,
  projectCubeVertex,
  cubeResults,
  cubeSegment,
  moveCube,
  zoomCube,
  dragCube,
  advanceCube,
  cubeDirection,
  setCubePosition,
  changeCubeAngle,
} from "../lib/labs/wireframe-cube-scene.ts";
import { isCubeEdgeValid, hasValidCubeTopology } from "../lib/labs/wireframe-cube.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-9, a + " != " + b);
const file = "wireframe-cube-lab.tsx";

test("P13 projection has independent pixel oracles for both modes and a matched reference plane", () => {
  const s = initialCubeScene();
  s.lens.verticalFovRadians = Math.PI / 2;
  let p = projectCubeVertex({ x: 1, y: 0.5, z: 4 }, s);
  close(p.screen.x, 650);
  close(p.screen.y, 350);
  p = projectCubeVertex({ x: 1, y: 0.5, z: 8 }, s);
  close(p.screen.x, 600);
  close(p.screen.y, 375);
  const ortho = { ...s, projection: "orthographic" };
  for (const z of [4, 8]) {
    p = projectCubeVertex({ x: 1, y: 0.5, z }, ortho);
    close(p.screen.x, 616.6666666666666);
    close(p.screen.y, 366.6666666666667);
  }
  const a = projectCubeVertex({ x: 1, y: 0.5, z: 6 }, s),
    b = projectCubeVertex({ x: 1, y: 0.5, z: 6 }, ortho);
  close(a.screen.x, b.screen.x);
  close(a.screen.y, b.screen.y);
  assert.deepEqual(cubeViewport(), { x: 0, y: 0, width: 1100, height: 800 });
});
test("P13 guards invalid input and depth identically in both projections", () => {
  for (const projection of ["perspective", "orthographic"]) {
    const s = { ...initialCubeScene(), projection };
    for (const [z, status] of [
      [0, "behind"],
      [-1, "behind"],
      [0.2, "before-near"],
      [17, "beyond-far"],
    ]) {
      const p = projectCubeVertex({ x: 0, y: 0, z }, s);
      assert.equal(p.status, status);
      assert.equal(p.screen, null);
    }
    for (const z of [0.5, 16])
      assert.equal(projectCubeVertex({ x: 0, y: 0, z }, s).status, "visible");
    assert.equal(projectCubeVertex({ x: NaN, y: 0, z: 4 }, s).status, "invalid");
    assert.equal(projectCubeVertex({ x: 1e308, y: 0, z: 4 }, s).status, "invalid");
    assert.equal(projectCubeVertex({ x: 0, y: 0, z: 4 }, { ...s, zoom: NaN }).status, "invalid");
  }
  assert.equal(isCubeEdgeValid({ from: 0.5, to: 1 }), false);
  assert.equal(isCubeEdgeValid({ from: 8, to: 1 }), false);
  assert.equal(hasValidCubeTopology(), true);
});
test("P13 stages grow from markers through geometry and both projections", () => {
  assert.deepEqual(
    [
      "cube-vertices",
      "cube-edges",
      "cube-transform",
      "cube-projection",
      "cube-input",
      "cube-depth",
      "cube-validation",
    ].map(cubeStage),
    [1, 2, 3, 4, 5, 6, 7],
  );
  const s = initialCubeScene(),
    saved = structuredClone(s);
  assert.equal(cubeResults(s, 1).edges.length, 0);
  const r = cubeResults(s, 2);
  assert.equal(r.projectionCount, 8);
  assert.equal(r.edges.length, 12);
  assert.equal(r.extraProjections, 0);
  assert.deepEqual(r.local, r.rotated);
  assert.notDeepEqual(cubeResults(s, 3).rotated, r.local);
  assert.equal(
    cubeResults({ ...s, projection: "orthographic" }, 3).active.projection,
    "perspective",
  );
  assert.equal(
    cubeResults({ ...s, projection: "orthographic" }, 4).active.projection,
    "orthographic",
  );
  assert.deepEqual(s, saved);
});
test("P13 clip retains near/far crossings and segments whose two endpoints are outside", () => {
  for (const projection of ["perspective", "orthographic"]) {
    const s = { ...initialCubeScene(), projection };
    const segment = (a, b) => cubeSegment(projectCubeVertex(a, s), projectCubeVertex(b, s), s);
    let e = segment({ x: 0, y: 0, z: -1 }, { x: 0.2, y: 0, z: 2 });
    assert.ok(e);
    assert.equal(e.extraProjections, 2);
    e = segment({ x: 0, y: 0, z: 4 }, { x: 0.2, y: 0, z: 20 });
    assert.ok(e);
    assert.equal(e.extraProjections, 2);
    e = segment({ x: -20, y: 0, z: 4 }, { x: 20, y: 0, z: 4 });
    assert.ok(e);
    close(e.from.x, 0);
    close(e.to.x, 1100);
    assert.equal(e.extraProjections, 0);
    assert.equal(segment({ x: 0, y: 0, z: -2 }, { x: 0, y: 1, z: -1 }), null);
  }
  const r = cubeResults(cubePreset(3), 7);
  assert.ok(r.edges.length > 0);
  assert.ok(r.extraProjections > 0);
  for (const e of r.edges)
    for (const p of [e.from, e.to]) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
      assert.ok(p.x >= -1e-9 && p.x <= 1100 + 1e-9 && p.y >= -1e-9 && p.y <= 800 + 1e-9);
    }
});
test("P13 geometry stays rigid, sorted depth is bounded and projection mode does not change world", () => {
  const s = initialCubeScene();
  for (let i = 0; i < 40; i++) {
    const scene = { ...s, angles: { pitch: i * 0.31, yaw: i * 0.47, roll: i * -0.22 } };
    for (const projection of ["perspective", "orthographic"]) {
      const r = cubeResults({ ...scene, projection }, 7);
      assert.ok(r.edgeError < 1e-9);
      assert.ok(r.roundTrip < 1e-9);
      for (let j = 1; j < r.edges.length; j++)
        assert.ok(r.edges[j - 1].averageDepth >= r.edges[j].averageDepth);
      assert.ok(r.edges.every((e) => e.depthFactor >= 0 && e.depthFactor <= 1));
    }
    assert.deepEqual(
      cubeResults({ ...scene, projection: "perspective" }, 7).world,
      cubeResults({ ...scene, projection: "orthographic" }, 7).world,
    );
  }
});
test("P13 normalized movement is dt-independent, opposite keys cancel and bounds are explicit", () => {
  let a = initialCubeScene(),
    b = initialCubeScene();
  for (let i = 0; i < 60; i++) a = moveCube(a, { x: 1, y: 0, z: 0 }, 1 / 60);
  for (let i = 0; i < 100; i++) b = moveCube(b, { x: 1, y: 0, z: 0 }, 0.01);
  close(a.position.x, 2);
  close(b.position.x, 2);
  const d = moveCube(initialCubeScene(), { x: 1, y: 1, z: 1 }, 0.1);
  close(Math.hypot(d.position.x, d.position.y, d.position.z - 6), 0.2);
  assert.deepEqual(cubeDirection(new Set(["w", "s", "a", "d", "q", "e"])), { x: 0, y: 0, z: 0 });
  assert.deepEqual(cubeDirection(new Set(["w", "d", "e"])), { x: 1, y: 1, z: 1 });
  const s = initialCubeScene();
  assert.equal(moveCube(s, { x: 1, y: 0, z: 0 }, -1), s);
  assert.equal(setCubePosition(s, "z", NaN), s);
  assert.equal(setCubePosition(s, "z", 100).position.z, 15);
  assert.equal(setCubePosition(s, "x", -100).position.x, -6);
});
test("P13 zoom is finite, bounded and separate from movement in both projections", () => {
  for (const projection of ["perspective", "orthographic"]) {
    const s = { ...initialCubeScene(), projection },
      saved = structuredClone(s);
    const zoomed = zoomCube(s, 1);
    assert.deepEqual(zoomed.position, s.position);
    const p = projectCubeVertex({ x: 1, y: 0, z: 6 }, s),
      q = projectCubeVertex({ x: 1, y: 0, z: 6 }, zoomed);
    close((q.screen.x - 550) / (p.screen.x - 550), Math.exp(0.12));
    close(zoomCube(s, 1000).zoom, 2);
    close(zoomCube(s, -1000).zoom, 0.5);
    assert.equal(zoomCube(s, NaN), s);
    assert.deepEqual(s, saved);
  }
});
test("P13 drag wraps rather than clamps pitch and animation respects time guards", () => {
  const s = initialCubeScene();
  s.angles = { pitch: 0, yaw: 0, roll: 0 };
  s.sensitivity = 0.01;
  const d = dragCube(s, 20, -200);
  close(d.angles.yaw, 0.2);
  close(d.angles.pitch, 2);
  const a = advanceCube(s, 10);
  close(a.angles.yaw, 0.055);
  close(advanceCube(s, -1).angles.yaw, 0);
  assert.equal(changeCubeAngle(s, "yaw", NaN), s);
  assert.ok(Math.abs(changeCubeAngle(s, "pitch", 20).angles.pitch) <= Math.PI);
});

async function harness(stage = 7) {
  let scene = initialCubeScene(),
    captured = false,
    moving = false;
  const drag = { current: null },
    keys = { current: new Set() },
    sceneRef = { current: scene };
  const canvas = {
    setPointerCapture() {
      captured = true;
    },
    hasPointerCapture() {
      return captured;
    },
    releasePointerCapture() {
      captured = false;
    },
    focus() {},
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 550, height: 400 };
    },
  };
  const env = {
    stage,
    sceneRef,
    drag,
    keys,
    size: { width: 550, height: 400, dpr: 2 },
    canvasRef: { current: canvas },
    setCaptured: (v) => {
      captured = v;
    },
    setMoving: (v) => {
      moving = v;
    },
    commit: (next) => {
      scene = next;
      sceneRef.current = next;
    },
    dragCube,
    moveCube,
    zoomCube,
    advanceCube,
    cubeDirection,
    cubePointFromEvent: (e, size, outside = false) => {
      const p = { x: e.clientX * 2, y: e.clientY * 2 };
      return outside || (p.x >= 0 && p.x < 1100 && p.y >= 0 && p.y < 800) ? p : null;
    },
  };
  env.cancelDrag = await componentCallback(file, "cancelDrag", env);
  env.stopInput = await componentCallback(file, "stopInput", env);
  const callbacks = {};
  for (const name of [
    "startDrag",
    "moveDrag",
    "pointerMove",
    "pointerUp",
    "pointerCancel",
    "onKeyUp",
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
const pointer = (canvas, extra = {}) => ({
  currentTarget: canvas,
  clientX: 100,
  clientY: 100,
  pointerId: 7,
  isPrimary: true,
  button: 0,
  buttons: 1,
  pointerType: "mouse",
  preventDefault() {},
  ...extra,
});
test("P13 actual pointer callbacks keep owner, initial pose, final sample and reset cleanup", async () => {
  const h = await harness(),
    { callbacks: c, canvas } = h;
  const before = structuredClone(h.scene.angles);
  c.startDrag(pointer(canvas));
  assert.equal(h.captured, true);
  assert.deepEqual(h.scene.angles, before);
  c.pointerMove(pointer(canvas, { pointerId: 8, clientX: 120 }));
  assert.deepEqual(h.scene.angles, before);
  c.pointerMove(pointer(canvas, { clientX: 110 }));
  close(h.scene.angles.yaw, before.yaw + 0.16);
  c.pointerUp(pointer(canvas, { clientX: 115, buttons: 0 }));
  close(h.scene.angles.yaw, before.yaw + 0.24);
  assert.equal(h.captured, false);
  assert.equal(h.env.drag.current, null);
  c.startDrag(pointer(canvas));
  h.env.keys.current.add("w");
  h.env.stopInput();
  assert.equal(h.captured, false);
  assert.equal(h.env.keys.current.size, 0);
});
test("P13 actual pointer callbacks reject wrong button, failed capture and lost mouse button", async () => {
  const h = await harness(),
    c = h.callbacks;
  c.startDrag(pointer(h.canvas, { button: 2 }));
  assert.equal(h.captured, false);
  h.canvas.setPointerCapture = () => {
    throw Error("capture");
  };
  c.startDrag(pointer(h.canvas));
  assert.equal(h.env.drag.current, null);
  h.canvas.setPointerCapture = () => {};
  c.startDrag(pointer(h.canvas));
  c.pointerMove(pointer(h.canvas, { buttons: 0 }));
  assert.equal(h.env.drag.current, null);
  const early = await harness(4);
  early.callbacks.startDrag(pointer(early.canvas));
  assert.equal(early.env.drag.current, null);
});
test("P13 actual keyboard callback uses held keys and does not swallow modifiers or Tab", async () => {
  const h = await harness();
  const calls = [];
  const noop = () => calls.push("action");
  const handler = await componentCallback(file, "onKeyDown", {
    ...h.env,
    reset: noop,
    toggleProjection: noop,
    togglePause: noop,
    toggleDebug: noop,
    zoom: noop,
    editAngle: noop,
    reducedMotion: false,
  });
  const event = (key) => ({
    key,
    repeat: false,
    preventDefault() {
      calls.push("prevent");
    },
  });
  handler(event("d"));
  assert.equal(h.moving, true);
  assert.ok(h.env.keys.current.has("d"));
  handler({ ...event("p"), repeat: true });
  assert.equal(calls.filter((x) => x === "action").length, 0);
  h.callbacks.onKeyUp(event("d"));
  assert.equal(h.moving, false);
  handler({ ...event("w"), ctrlKey: true });
  assert.equal(h.env.keys.current.size, 0);
  handler(event("Tab"));
  assert.equal(h.env.keys.current.size, 0);
  handler(event("p"));
  assert.equal(calls.filter((x) => x === "action").length, 1);
});
test("P13 actual wheel effect normalizes deltas, preserves browser zoom and removes listener", async () => {
  const h = await harness();
  let listener,
    removed = false,
    prevented = 0;
  h.canvas.addEventListener = (type, fn, options) => {
    assert.equal(type, "wheel");
    assert.equal(options.passive, false);
    listener = fn;
  };
  h.canvas.removeEventListener = (type, fn) => {
    assert.equal(fn, listener);
    removed = true;
  };
  const effect = await componentEffect(file, 'addEventListener("wheel"', h.env),
    cleanup = effect();
  const e = {
    clientX: 100,
    clientY: 100,
    deltaY: -100,
    deltaMode: 0,
    preventDefault() {
      prevented++;
    },
  };
  listener(e);
  close(h.scene.zoom, Math.exp(0.12));
  assert.equal(prevented, 1);
  listener({ ...e, ctrlKey: true });
  assert.equal(prevented, 1);
  cleanup();
  assert.ok(removed);
});
test("P13 actual animation effect integrates movement and cancels its frame", async () => {
  const h = await harness();
  h.env.keys.current.add("d");
  let animate,
    cancelled = 0;
  const effect = await componentEffect(file, "const animate =", {
    ...h.env,
    moving: true,
    scene: h.scene,
    reducedMotion: false,
    performance: { now: () => 0 },
    requestAnimationFrame: (fn) => {
      animate = fn;
      return 9;
    },
    cancelAnimationFrame: (id) => {
      cancelled = id;
    },
  });
  const cleanup = effect();
  animate(100);
  close(h.scene.position.x, 0.2);
  cleanup();
  assert.equal(cancelled, 9);
});

test("P13 actual view maps letterboxed pointer coordinates independently of DPR", async () => {
  const layout = await componentCallback("wireframe-cube-lab-view.ts", "layout", {});
  const point = await componentCallback("wireframe-cube-lab-view.ts", "cubePointFromEvent", {
    layout,
    cubeViewport,
  });
  const canvas = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 550, height: 500 }) };
  const e = { currentTarget: canvas, clientX: 285, clientY: 270 };
  for (const dpr of [1, 2, 3]) {
    const p = point(e, { width: 550, height: 500, dpr });
    close(p.x, 550);
    close(p.y, 400);
  }
  assert.equal(point({ ...e, clientY: 21 }, { width: 550, height: 500, dpr: 1 }), null);
  assert.ok(point({ ...e, clientY: 21 }, { width: 550, height: 500, dpr: 1 }, true));
});
test("P13 actual renderer retains cube and depth floor when debug is hidden", async () => {
  const layout = await componentCallback("wireframe-cube-lab-view.ts", "layout", {});
  const lines = [],
    labels = [];
  const draw = await componentCallback("wireframe-cube-lab-view.ts", "drawCubeLab", {
    layout,
    cubeResults,
    cubeSegment,
    projectCubeVertex,
    setupCanvas() {},
    drawLine: (ctx, a, b, color) => lines.push({ a, b, color }),
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
    fill() {},
    fillText: (text) => labels.push(text),
  };
  for (const projection of ["perspective", "orthographic"]) {
    lines.length = 0;
    labels.length = 0;
    draw(
      ctx,
      { width: 550, height: 400, dpr: 2 },
      { ...initialCubeScene(), projection, debug: false, depthCue: false },
      7,
    );
    assert.equal(lines.filter((l) => l.color === "#84a9ff").length, 12);
    assert.ok(lines.filter((l) => l.color === "#28334d").length > 10);
    assert.equal(labels.length, 0);
  }
});
test("P13 actual lifecycle effect clears held input, pauses on blur and removes listeners", async () => {
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
  h.env.keys.current.add("d");
  h.env.commit({ ...h.scene, paused: false });
  events.get("visibilitychange")();
  assert.equal(h.scene.paused, true);
  assert.equal(h.env.keys.current.size, 0);
  cleanup();
  assert.deepEqual(removed, ["blur", "visibilitychange"]);
});
