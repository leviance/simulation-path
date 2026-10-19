import assert from "node:assert/strict";
import test from "node:test";
import { TAU, normalizeAngle, pointOnUnitCircle } from "../lib/labs/angle.ts";
import {
  circleBoard,
  circleScene,
  circleLayers,
  advanceCircle,
  setCircleAngle,
  circleWorldToScreen,
  circleScreenToDirection,
  beginCircleDrag,
  moveCircleNeedle,
  circleTimeToX,
} from "../lib/labs/unit-circle.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";

const near = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, actual + " != " + expected);
const size = { width: 760, height: 520, dpr: 2 };

test("Unit circle normalize keeps the half-open range at negative subnormal and canonicalizes minus zero", () => {
  for (const value of [-Number.MIN_VALUE, -1e-300, -TAU, 0, TAU, -1e300, 1e300]) {
    const angle = normalizeAngle(value);
    assert.ok(angle >= 0 && angle < TAU);
    assert.equal(Object.is(angle, -0), false);
  }
  near(normalizeAngle(-Math.PI / 2), (3 * Math.PI) / 2);
  assert.equal(normalizeAngle(NaN), 0);
  assert.equal(normalizeAngle(Infinity), 0);
});

test("Unit circle has independent cardinal fixtures, unit identity and screen/world round trips", () => {
  for (const [angle, x, y] of [
    [0, 1, 0],
    [Math.PI / 2, 0, 1],
    [Math.PI, -1, 0],
    [(3 * Math.PI) / 2, 0, -1],
  ]) {
    const p = pointOnUnitCircle(angle);
    near(p.x, x);
    near(p.y, y);
  }
  for (let angle = -20; angle <= 20; angle += 0.037) {
    const p = pointOnUnitCircle(angle);
    near(p.x ** 2 + p.y ** 2, 1);
    const restored = circleScreenToDirection(circleWorldToScreen(p));
    near(restored.x, p.x);
    near(restored.y, p.y);
  }
  assert.deepEqual(circleWorldToScreen({ x: 0, y: 1 }), { x: 275, y: 205 });
});

function runSteps(steps, speed = Math.PI / 2, angle = (35 * Math.PI) / 180) {
  let scene = setCircleAngle(circleScene(), angle);
  scene.angularSpeed = speed;
  for (const dt of steps) scene = advanceCircle(scene, dt);
  return scene;
}

test("Unit circle 10 Hz, 120 Hz and uneven frames agree on angle and every independent 60 Hz sample", () => {
  const steps = [
    Array(10).fill(0.1),
    Array(120).fill(1 / 120),
    Array(10).fill([0.013, 0.027, 0.06]).flat(),
  ];
  for (const speed of [0, Math.PI / 2, -TAU, TAU]) {
    const scenes = steps.map((sequence) => runSteps(sequence, speed));
    for (const scene of scenes) {
      near(scene.angle, normalizeAngle((35 * Math.PI) / 180 + speed));
      assert.equal(scene.samples.length, 61);
      scene.samples.forEach((sample, index) => {
        near(sample.time, index / 60);
        near(sample.sine, Math.sin((35 * Math.PI) / 180 + speed * sample.time));
        near(sample.cosine, Math.cos((35 * Math.PI) / 180 + speed * sample.time));
      });
    }
  }
});

test("Unit circle sample phase is correct through the 0/tau seam and bounded after 100 simulated seconds", () => {
  const scene = runSteps(Array(1000).fill(0.1), -TAU, 0.01);
  assert.equal(scene.samples.length, 361);
  near(scene.samples.at(-1).time - scene.samples[0].time, 6);
  for (const sample of scene.samples) {
    near(sample.sine, Math.sin(0.01 - TAU * sample.time));
    assert.ok(sample.time <= scene.elapsedTime + 1e-10);
  }
  for (const dt of [0, -0.1, 1, NaN, Infinity]) assert.equal(advanceCircle(scene, dt), scene);
});

test("Unit circle speed changes preserve past samples while manual angles restart history", () => {
  let scene = runSteps(Array(5).fill(0.1));
  const old = structuredClone(scene.samples);
  const atChange = scene.angle;
  scene = { ...scene, angularSpeed: -Math.PI };
  for (let i = 0; i < 5; i++) scene = advanceCircle(scene, 0.1);
  assert.deepEqual(scene.samples.slice(0, old.length), old);
  for (const sample of scene.samples.slice(old.length)) {
    near(sample.sine, Math.sin(atChange - Math.PI * (sample.time - 0.5)));
  }
  const reset = setCircleAngle(scene, TAU);
  assert.equal(reset.angle, 0);
  assert.equal(reset.requestedAngle, TAU);
  assert.deepEqual(reset.samples, [{ time: 0, sine: 0, cosine: 1 }]);
  assert.equal(reset.elapsedTime, 0);
  assert.equal(reset.nextSampleIndex, 1);
});

test("Unit circle plot X is timestamp-based with fixed six-second limits", () => {
  near(circleTimeToX(4, 10), 570);
  near(circleTimeToX(7, 10), 810);
  near(circleTimeToX(10, 10), 1050);
  near(circleTimeToX(-1, 10), 570);
  near(circleTimeToX(12, 10), 1050);
});

test("Unit circle hit-test includes 18 px, preserves angular grab offset and ignores the 8 px center zone", () => {
  const initial = setCircleAngle(circleScene(), 0);
  assert.equal(beginCircleDrag(initial, { x: 479, y: 390 }), initial);
  assert.equal(beginCircleDrag(initial, { x: 478, y: 390 }).dragging, true);
  const offset = beginCircleDrag(initial, { x: 460, y: 400 });
  near(moveCircleNeedle(offset, { x: 460, y: 400 }).angle, 0);
  const grab = beginCircleDrag(initial, { x: 460, y: 390 });
  assert.equal(moveCircleNeedle(grab, { x: 275, y: 390 }), grab);
  assert.equal(moveCircleNeedle(grab, { x: 282, y: 390 }), grab);
  near(moveCircleNeedle(grab, { x: 275, y: 205 }).angle, Math.PI / 2);
  near(moveCircleNeedle(grab, { x: 90, y: 390 }).angle, Math.PI);
  assert.equal(moveCircleNeedle({ ...grab, dragging: false }, { x: 90, y: 390 }).angle, grab.angle);
});

test("Unit circle final and atan2 modes retain animation, projections and both graph layers", () => {
  assert.equal(circleLayers("angle-radians").needle, false);
  assert.equal(circleLayers("angle-sincos").animate, false);
  assert.equal(circleLayers("angle-motion").projections, false);
  assert.equal(circleLayers("angle-graphs").drag, false);
  for (const mode of ["angle-atan2", "angle-full", undefined]) {
    assert.deepEqual(circleLayers(mode), {
      needle: true,
      animate: true,
      projections: true,
      graphs: true,
      drag: true,
    });
  }
});

test("Unit circle actual pointer mapping compensates CSS scale, DPR and letterbox and rejects padding", async () => {
  const boardLayout = await componentCallback("angle-lab-view.ts", "boardLayout", { circleBoard });
  const map = await componentCallback("angle-lab-view.ts", "circlePointFromEvent", { boardLayout });
  const scale = Math.min(size.width / 1100, size.height / 760);
  const ox = (size.width - 1100 * scale) / 2;
  const oy = (size.height - 760 * scale) / 2;
  const currentTarget = {
    getBoundingClientRect: () => ({
      left: 20,
      top: 30,
      width: size.width * 2,
      height: size.height * 2,
    }),
  };
  const event = {
    currentTarget,
    clientX: 20 + 2 * (ox + 460 * scale),
    clientY: 30 + 2 * (oy + 390 * scale),
  };
  const point = map(event, size);
  near(point.x, 460);
  near(point.y, 390);
  assert.equal(map({ ...event, clientX: 20 }, size), null);
  assert.ok(map({ ...event, clientX: -100 }, size, true).x < 0);
});

async function harness() {
  const sceneRef = { current: setCircleAngle(circleScene(), 0) },
    owner = { current: null },
    pausedRef = { current: false },
    captures = new Set();
  const canvas = {
    focus() {},
    setPointerCapture: (id) => captures.add(id),
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => captures.delete(id),
  };
  const updateScene = (next) => {
    sceneRef.current = next;
  };
  const pause = (value) => {
    pausedRef.current = value;
  };
  const release = await componentCallback("angle-lab.tsx", "release", {
    owner,
    sceneRef,
    canvasRef: { current: canvas },
    updateScene,
  });
  const env = {
    layers: circleLayers(),
    owner,
    sceneRef,
    size,
    pause,
    release,
    updateScene,
    circlePointFromEvent: (e) => e.point,
    beginCircleDrag,
    moveCircleNeedle,
  };
  const start = await componentCallback("angle-lab.tsx", "startDrag", env);
  const move = await componentCallback("angle-lab.tsx", "dragPoint", env);
  const end = await componentCallback("angle-lab.tsx", "stopDrag", env);
  const event = (id, point, rest = {}) => ({
    pointerId: id,
    point,
    currentTarget: canvas,
    button: 0,
    buttons: 1,
    isPrimary: true,
    preventDefault() {},
    ...rest,
  });
  return {
    sceneRef,
    owner,
    pausedRef,
    captures,
    release,
    start,
    move,
    end,
    event,
    updateScene,
    canvas,
  };
}

test("Unit circle actual pointer callbacks reject foreign owners and commit final up coordinates", async () => {
  const h = await harness();
  h.start(h.event(1, { x: 460, y: 390 }, { button: 2 }));
  assert.equal(h.owner.current, null);
  h.start(h.event(1, { x: 460, y: 390 }));
  assert.equal(h.pausedRef.current, true);
  h.move(h.event(2, { x: 275, y: 205 }));
  h.end(h.event(2, { x: 275, y: 205 }));
  near(h.sceneRef.current.angle, 0);
  h.end(h.event(1, { x: 90, y: 390 }, { button: 2 }));
  assert.equal(h.owner.current, 1);
  h.end(h.event(1, { x: 275, y: 205 }));
  near(h.sceneRef.current.angle, Math.PI / 2);
  assert.equal(h.owner.current, null);
  assert.equal(h.captures.size, 0);
});

test("Unit circle actual cancel, lost button and capture failure release without inventing a final sample", async () => {
  for (const cause of ["cancel", "lostButton", "captureFailure"]) {
    const h = await harness();
    if (cause === "captureFailure")
      h.canvas.setPointerCapture = () => {
        throw new Error("capture unavailable");
      };
    h.start(h.event(1, { x: 460, y: 390 }));
    if (cause === "cancel") h.end(h.event(1, { x: 275, y: 205 }), true);
    if (cause === "lostButton") h.move(h.event(1, { x: 275, y: 205 }, { buttons: 0 }));
    assert.equal(h.owner.current, null);
    assert.equal(h.sceneRef.current.dragging, false);
    near(h.sceneRef.current.angle, 0);
  }
});

test("Unit circle actual manual/reset/pause controls cancel drag and persist pause", async () => {
  for (const action of ["manualAngle", "reset", "togglePause"]) {
    const h = await harness();
    h.start(h.event(1, { x: 460, y: 390 }));
    const env = {
      release: h.release,
      pause: (v) => {
        h.pausedRef.current = v;
      },
      pausedRef: h.pausedRef,
      sceneRef: h.sceneRef,
      updateScene: h.updateScene,
      setCircleAngle,
      circleScene,
      mode: "angle-full",
    };
    const handler = await componentCallback("angle-lab.tsx", action, env);
    handler(Math.PI);
    assert.equal(h.owner.current, null);
    assert.equal(h.sceneRef.current.dragging, false);
    assert.equal(h.pausedRef.current, action !== "togglePause");
    if (action === "manualAngle") near(h.sceneRef.current.angle, Math.PI);
  }
});

test("Unit circle actual lifecycle pauses on blur/hidden and cleans listeners and capture on dispose", async () => {
  const h = await harness();
  h.start(h.event(1, { x: 460, y: 390 }));
  const handlers = new Map();
  const target = {
    addEventListener: (name, fn) => handlers.set(name, fn),
    removeEventListener: (name) => handlers.delete(name),
  };
  const document = { ...target, hidden: false };
  const effect = await componentEffect("angle-lab.tsx", 'window.addEventListener("blur"', {
    window: target,
    document,
    release: h.release,
    pause: (v) => {
      h.pausedRef.current = v;
    },
  });
  const dispose = effect();
  document.hidden = true;
  handlers.get("visibilitychange")();
  assert.equal(h.owner.current, null);
  assert.equal(h.pausedRef.current, true);
  dispose();
  assert.equal(handlers.size, 0);
});

test("Unit circle actual keyboard does not trap Tab/modifiers and ignores repeated toggles", async () => {
  let paused = 0,
    manual = 0,
    steps = 0;
  const handler = await componentCallback("angle-lab.tsx", "onKeyDown", {
    layers: circleLayers(),
    sceneRef: { current: circleScene() },
    pausedRef: { current: true },
    reducedMotion: true,
    togglePause: () => paused++,
    reset() {},
    release() {},
    manualAngle: () => manual++,
    step: () => steps++,
    updateScene() {},
    TAU,
  });
  let prevented = 0;
  const e = (key, rest = {}) => ({
    key,
    repeat: false,
    preventDefault: () => prevented++,
    ...rest,
  });
  handler(e("Tab"));
  handler(e("ArrowRight", { ctrlKey: true }));
  assert.equal(prevented, 0);
  handler(e(" ", { repeat: true }));
  handler(e(" "));
  handler(e("ArrowLeft"));
  handler(e("s"));
  assert.equal(paused, 1);
  assert.equal(manual, 1);
  assert.equal(steps, 1);
});

test("Unit circle actual animation respects pause/reduced motion and has a bounded delta with RAF cleanup", async () => {
  for (const [paused, reducedMotion] of [
    [true, false],
    [false, true],
  ]) {
    let frames = 0;
    const effect = await componentEffect("angle-lab.tsx", "requestAnimationFrame(animate)", {
      layers: circleLayers(),
      paused,
      reducedMotion,
      requestAnimationFrame: () => frames++,
      performance: { now: () => 0 },
    });
    assert.equal(effect(), undefined);
    assert.equal(frames, 0);
  }
  let callback,
    accepted = 0,
    cancelled = 0;
  const sceneRef = { current: circleScene() };
  const effect = await componentEffect("angle-lab.tsx", "requestAnimationFrame(animate)", {
    layers: circleLayers(),
    paused: false,
    reducedMotion: false,
    sceneRef,
    pausedRef: { current: false },
    performance: { now: () => 0 },
    document: { hidden: false },
    requestAnimationFrame: (fn) => {
      callback = fn;
      return 12;
    },
    cancelAnimationFrame: (id) => {
      cancelled = id;
    },
    advanceCircle: (scene, dt) => {
      accepted = dt;
      return scene;
    },
    updateScene() {},
  });
  const dispose = effect();
  callback(30_000);
  assert.equal(accepted, 0.1);
  dispose();
  assert.equal(cancelled, 12);
});

test("Unit circle actual Canvas renderer draws both recorded graphs while retaining needle and projections", async () => {
  const texts = [],
    lines = [],
    arcs = [];
  const ctx = new Proxy(
    {},
    {
      get: (target, key) =>
        target[key] ??
        ((...args) => {
          if (key === "fillText") texts.push(args[0]);
          if (key === "lineTo") lines.push(args);
          if (key === "arc") arcs.push(args);
        }),
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    },
  );
  const boardLayout = await componentCallback("angle-lab-view.ts", "boardLayout", { circleBoard });
  const draw = await componentCallback("angle-lab-view.ts", "drawAngleLab", {
    setupCanvas() {},
    boardLayout,
    circleBoard,
    pointOnUnitCircle,
    circleWorldToScreen,
    circleTimeToX,
    TAU,
    drawLine: (_, start, end) => {
      lines.push([end.x, end.y]);
    },
  });
  const scene = runSteps(Array(20).fill(0.1));
  draw(ctx, size, scene, circleLayers("angle-full"));
  assert.ok(texts.includes("sin θ") && texts.includes("cos θ"));
  assert.ok(texts.includes("X = cos θ") && texts.includes("Y = sin θ"));
  assert.ok(arcs.some(([x, y, radius]) => radius === 7));
  assert.ok(lines.length > scene.samples.length * 1.8);
  const sample = scene.samples[30];
  assert.ok(
    lines.some(
      ([x, y]) =>
        Math.abs(x - circleTimeToX(sample.time, scene.elapsedTime)) < 1e-8 &&
        Math.abs(y - (400 - sample.sine * 130)) < 1e-8,
    ),
  );
});

test("Unit circle actual resize releases capture without erasing angle or samples; mode changes reset", async () => {
  let released = 0,
    resets = 0;
  const previousMode = { current: "angle-graphs" };
  const effect = await componentEffect("angle-lab.tsx", "previousMode.current !== mode", {
    release: () => released++,
    previousMode,
    mode: "angle-graphs",
    reset: () => resets++,
  });
  effect();
  assert.equal(released, 1);
  assert.equal(resets, 0);
  const changed = await componentEffect("angle-lab.tsx", "previousMode.current !== mode", {
    release: () => released++,
    previousMode,
    mode: "angle-full",
    reset: () => resets++,
  });
  changed();
  assert.equal(previousMode.current, "angle-full");
  assert.equal(resets, 1);
});

test("Unit circle actual reduced-motion effect cancels drag and never automatically resumes when preference clears", async () => {
  const pauses = [];
  let released = 0;
  for (const reducedMotion of [true, false]) {
    const effect = await componentEffect("angle-lab.tsx", "if (reducedMotion)", {
      reducedMotion,
      release: () => released++,
      pause: (value) => pauses.push(value),
    });
    effect();
  }
  assert.equal(released, 1);
  assert.deepEqual(pauses, [true]);
});
