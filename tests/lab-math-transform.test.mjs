import assert from "node:assert/strict";
import test from "node:test";
import {
  multiplyMatrices2,
  transformVector2,
  identityMatrix,
  multiplyMatrices,
  transformPoint,
  transformDirection,
  composeTransform,
  scalePoint,
  rotatePoint,
  shearPoint,
} from "../lib/labs/transform.ts";
import * as model from "../lib/labs/transform-scene.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";

const near = (a, b) => assert.ok(Number.isFinite(a) && Math.abs(a - b) < 1e-9, a + " != " + b);
const pointNear = (a, b) => {
  near(a.x, b.x);
  near(a.y, b.y);
};
const initial = model.initialTransformScene;
// View imports use application aliases; load its actual pure callbacks through the AST harness.
const pointer = await componentCallback("transform-lab-view.ts", "transformPointFromEvent", {
  layout: (size) => {
    const scale = Math.min(size.width / 900, size.height / 800);
    return { scale, x: (size.width - 900 * scale) / 2, y: (size.height - 800 * scale) / 2 };
  },
});

test("P09 Mat2/Mat3 have independent numeric multiplication and point/direction oracles", () => {
  assert.deepEqual(multiplyMatrices2([1, 2, 3, 4], [2, 0, 1, 2]), [4, 4, 10, 8]);
  assert.deepEqual(transformVector2([1, 2, 3, 4], { x: 2, y: -1 }), { x: 0, y: 2 });
  const m = [1, 2, 5, 3, 4, -2, 0, 0, 1];
  assert.deepEqual(transformPoint(m, { x: 2, y: -1 }), { x: 5, y: 0 });
  assert.deepEqual(transformDirection(m, { x: 2, y: -1 }), { x: 0, y: 2 });
  assert.deepEqual(multiplyMatrices(identityMatrix(), m), m);
  assert.deepEqual(multiplyMatrices(m, identityMatrix()), m);
});
test("P09 component transforms keep original coordinates and simultaneous shear differs from sequential shear", () => {
  assert.deepEqual(scalePoint({ x: 4, y: -2 }, 2, 3), { x: 8, y: -6 });
  pointNear(rotatePoint({ x: 1, y: 0 }, Math.PI / 2), { x: 0, y: 1 });
  assert.deepEqual(shearPoint({ x: 2, y: 4 }, 0.5, -0.25), { x: 4, y: 3.5 });
  const sequential = shearPoint(shearPoint({ x: 2, y: 4 }, 0.5, 0), 0, -0.25);
  assert.deepEqual(sequential, { x: 4, y: 3 });
});
test("P09 two orders match expanded coefficients over bounded negative, zero and shear inputs", () => {
  for (let sample = 0; sample < 41; sample++) {
    const p = {
      scaleX: (sample - 20) / 10,
      scaleY: ((sample % 9) - 4) / 3,
      angle: sample * 0.17,
      shearX: ((sample % 7) - 3) / 4,
      shearY: ((sample % 5) - 2) / 3,
      translation: { x: 0.5, y: -0.75 },
    };
    const c = Math.cos(p.angle),
      s = Math.sin(p.angle);
    for (const order of ["scale-shear-rotate", "rotate-shear-scale"]) {
      const reversed = order === "rotate-shear-scale";
      const a = reversed ? p.scaleX * (c + p.shearX * s) : p.scaleX * (c - s * p.shearY);
      const b = reversed ? p.scaleX * (-s + p.shearX * c) : p.scaleY * (c * p.shearX - s);
      const d = reversed ? p.scaleY * (p.shearY * c + s) : p.scaleX * (s + c * p.shearY);
      const e = reversed ? p.scaleY * (-p.shearY * s + c) : p.scaleY * (s * p.shearX + c);
      const scene = { parameters: p, order, paused: true },
        r = model.transformResults(scene);
      for (const point of model.transformSquare) {
        const expected = {
          x: a * point.x + b * point.y + p.translation.x,
          y: d * point.x + e * point.y + p.translation.y,
        };
        pointNear(transformPoint(r.matrix, point), expected);
        pointNear(model.directTransformPoint(point, p, order), expected);
      }
      const det = p.scaleX * p.scaleY * (1 - p.shearX * p.shearY);
      near(r.determinant, det);
      near(r.areaRatio, Math.abs(det));
      near(r.error, 0);
    }
  }
});
test("P09 noncommuting known point, identity, reflection and singular presets are unambiguous", () => {
  const p = { ...initial().parameters, scaleX: 2, angle: Math.PI / 2 };
  pointNear(transformPoint(composeTransform(p, "scale-shear-rotate"), { x: 1, y: 1 }), {
    x: -1,
    y: 2,
  });
  pointNear(transformPoint(composeTransform(p, "rotate-shear-scale"), { x: 1, y: 1 }), {
    x: -2,
    y: 1,
  });
  assert.deepEqual(model.transformResults(initial()).square, model.transformSquare);
  assert.ok(model.transformResults(model.transformPreset(1)).determinant < 0);
  near(model.transformResults(model.transformPreset(2)).areaRatio, 0);
  near(model.transformResults(model.transformPreset(3)).areaRatio, 0);
});
test("P09 lesson staging never activates future transformations", () => {
  const scene = model.transformPreset(4);
  for (let stage = 1; stage <= 8; stage++) {
    const e = model.effectiveTransformScene(scene, stage);
    if (stage < 2) near(e.parameters.scaleX, 1);
    if (stage < 3) near(e.parameters.angle, 0);
    if (stage < 4) near(e.parameters.shearX, 0);
    if (stage < 5) assert.deepEqual(e.parameters.translation, { x: 0, y: 0 });
    assert.ok(Number.isFinite(model.transformResults(e).areaRatio));
  }
});
test("P09 parameter setters clamp, reject nonfinite and pause manual angle while keeping values immutable", () => {
  const scene = initial(),
    next = model.changeTransformParameter(scene, "scaleX", 99);
  near(scene.parameters.scaleX, 1);
  near(next.parameters.scaleX, 2);
  assert.equal(model.changeTransformParameter(scene, "angle", NaN), scene);
  assert.equal(
    model.changeTransformParameter({ ...scene, paused: false }, "angle", 0.2).paused,
    true,
  );
  assert.deepEqual(model.boundTransformTranslation({ x: 5, y: -5 }), { x: 2, y: -2 });
});
test("P09 world/screen and pointer conversion handle CSS scale, letterbox and DPR once", () => {
  const point = { x: -1.25, y: 1.75 };
  pointNear(model.transformScreenToWorld(model.transformWorldToScreen(point)), point);
  const canvas = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 2000, height: 800 }) };
  pointNear(
    pointer(
      { clientX: 1010, clientY: 420, currentTarget: canvas },
      { width: 1000, height: 400, dpr: 3 },
    ),
    { x: 450, y: 400 },
  );
  assert.equal(
    pointer(
      { clientX: 15, clientY: 20, currentTarget: canvas },
      { width: 1000, height: 400, dpr: 3 },
    ),
    null,
  );
});
test("P09 animation is bounded, wraps angles and ignores invalid dt", () => {
  let scene = initial();
  const start = scene;
  for (const dt of [0, -1, NaN, Infinity, 0.11])
    assert.equal(model.advanceTransform(scene, dt), scene);
  for (let i = 0; i < 20; i++) scene = model.advanceTransform(scene, 0.1);
  near(scene.parameters.angle, 0.9);
  near(start.parameters.angle, 0);
  scene = { ...scene, parameters: { ...scene.parameters, angle: Math.PI - 0.01 } };
  const next = model.advanceTransform(scene, 0.1);
  assert.ok(next.parameters.angle < -3);
});
async function harness(stage = 8) {
  const sceneRef = { current: initial() },
    drag = { current: null },
    captured = new Set();
  let focus = 0;
  const canvas = {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 900, height: 800 }),
    focus: () => focus++,
    setPointerCapture: (id) => captured.add(id),
    hasPointerCapture: (id) => captured.has(id),
    releasePointerCapture: (id) => captured.delete(id),
  };
  const env = {
    stage,
    sceneRef,
    drag,
    canvasRef: { current: canvas },
    size: { width: 900, height: 800, dpr: 2 },
    reducedMotion: false,
    ...model,
    transformPointFromEvent: pointer,
  };
  env.commit = (next) => {
    sceneRef.current = next;
  };
  env.cancelDrag = await componentCallback("transform-lab.tsx", "cancelDrag", env);
  for (const name of [
    "reset",
    "moveTarget",
    "togglePause",
    "startDrag",
    "pointerMove",
    "pointerUp",
    "pointerCancel",
    "onKeyDown",
    "changeParameter",
  ])
    env[name] = await componentCallback("transform-lab.tsx", name, env);
  const event = (x, y, extra = {}) => ({
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
  });
  return { ...env, event, canvas, captured, focused: () => focus };
}
test("P09 actual drag retains grab offset, owner and final release sample", async () => {
  const h = await harness(),
    { event } = h;
  h.startDrag(event(500, 400));
  assert.equal(h.focused(), 1);
  assert.deepEqual(h.sceneRef.current.parameters.translation, { x: 0, y: 0 });
  h.pointerMove(event(550, 350, { pointerId: 2 }));
  assert.deepEqual(h.sceneRef.current.parameters.translation, { x: 0, y: 0 });
  h.pointerMove(event(550, 350));
  pointNear(h.sceneRef.current.parameters.translation, { x: 1, y: 1 });
  h.pointerUp(event(575, 325));
  pointNear(h.sceneRef.current.parameters.translation, { x: 1.5, y: 1.5 });
  assert.equal(h.drag.current, null);
  assert.equal(h.captured.size, 0);
});
test("P09 actual drag rejects secondary/right/future input and safely cancels lost buttons/capture failure", async () => {
  for (const extra of [{ isPrimary: false }, { button: 2 }]) {
    const h = await harness();
    h.startDrag(h.event(450, 400, extra));
    assert.equal(h.drag.current, null);
  }
  const early = await harness(4);
  early.startDrag(early.event(450, 400));
  assert.equal(early.drag.current, null);
  const h = await harness();
  h.startDrag(h.event(450, 400));
  h.pointerMove(h.event(500, 400, { buttons: 0 }));
  assert.equal(h.drag.current, null);
  h.canvas.setPointerCapture = () => {
    throw Error("denied");
  };
  h.startDrag(h.event(450, 400));
  assert.equal(h.drag.current, null);
});
test("P09 actual keyboard and control callbacks preserve Tab/modifiers and cancel drag on reset/order", async () => {
  const h = await harness(),
    key = (key, extra = {}) => ({
      key,
      repeat: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      preventDefault() {},
      ...extra,
    });
  h.onKeyDown(key("ArrowUp"));
  near(h.sceneRef.current.parameters.translation.y, 0.1);
  h.onKeyDown(key("ArrowUp", { ctrlKey: true }));
  near(h.sceneRef.current.parameters.translation.y, 0.1);
  h.onKeyDown(key("o", { repeat: true }));
  assert.equal(h.sceneRef.current.order, "scale-shear-rotate");
  h.startDrag(h.event(450, 400));
  h.onKeyDown(key("o"));
  assert.equal(h.drag.current, null);
  assert.equal(h.sceneRef.current.order, "rotate-shear-scale");
  h.changeParameter("scaleX", -1);
  near(h.sceneRef.current.parameters.scaleX, -1);
  h.onKeyDown(key("r"));
  assert.deepEqual(h.sceneRef.current, initial());
  h.onKeyDown(
    key("Tab", {
      preventDefault() {
        throw Error("Tab must leave Canvas");
      },
    }),
  );
});
test("P09 lifecycle actual effects pause on hidden/blur and clean listeners", async () => {
  const h = await harness(),
    listeners = new Map(),
    removed = [];
  const target = {
    hidden: false,
    addEventListener: (name, callback) => listeners.set(name, callback),
    removeEventListener: (name) => removed.push(name),
  };
  const cleanup = (
    await componentEffect("transform-lab.tsx", "visibilitychange", {
      ...h,
      window: target,
      document: target,
    })
  )();
  h.sceneRef.current.paused = false;
  target.hidden = true;
  listeners.get("visibilitychange")();
  assert.equal(h.sceneRef.current.paused, true);
  cleanup();
  assert.deepEqual(removed.sort(), ["blur", "visibilitychange"]);
  const preference = await componentEffect("transform-lab.tsx", "if (reducedMotion)", {
    ...h,
    reducedMotion: true,
  });
  assert.ok(preference);
  h.sceneRef.current.paused = false;
  preference();
  assert.equal(h.sceneRef.current.paused, true);
});

test("P09 actual resize and mode effects cancel drag, retaining parameters only on resize", async () => {
  const h = await harness();
  h.changeParameter("scaleX", 1.5);
  h.startDrag(h.event(450, 400));
  h.sceneRef.current.paused = false;
  (await componentEffect("transform-lab.tsx", "Resize releases", h))();
  assert.equal(h.drag.current, null);
  assert.equal(h.sceneRef.current.paused, true);
  near(h.sceneRef.current.parameters.scaleX, 1.5);
  (await componentEffect("transform-lab.tsx", "initialTransformScene()", h))();
  assert.deepEqual(h.sceneRef.current, initial());
});
test("P09 actual rAF effect clamps resumed dt and cleanup cancels the current frame", async () => {
  const h = await harness();
  let next,
    serial = 0,
    cancelled;
  h.sceneRef.current.paused = false;
  const effect = await componentEffect("transform-lab.tsx", "requestAnimationFrame(animate)", {
    ...h,
    scene: h.sceneRef.current,
    performance: { now: () => 0 },
    requestAnimationFrame: (callback) => {
      next = callback;
      return ++serial;
    },
    cancelAnimationFrame: (id) => (cancelled = id),
  });
  const cleanup = effect();
  next(9000);
  near(h.sceneRef.current.parameters.angle, 0.045);
  cleanup();
  assert.equal(cancelled, serial);
});
test("P09 actual Canvas renderer transforms ten local grid lines with the square and labels both basis", async () => {
  const lines = [],
    labels = [],
    noop = () => {};
  const ctx = {
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
  const layout = (size) => {
    const scale = Math.min(size.width / 900, size.height / 800);
    return { scale, x: (size.width - 900 * scale) / 2, y: (size.height - 800 * scale) / 2 };
  };
  const draw = await componentCallback("transform-lab-view.ts", "drawTransformLab", {
    ...model,
    transformPoint,
    layout,
    setupCanvas: noop,
    drawLine: (_ctx, a, b, color, width) => lines.push({ a, b, color, width }),
  });
  const scene = model.transformPreset(4),
    size = { width: 900, height: 800, dpr: 2 };
  draw(ctx, size, scene, 1);
  const base = lines.length;
  lines.length = 0;
  draw(ctx, size, scene, 6);
  assert.equal(lines.length, base + 10);
  assert.equal(lines.filter((line) => line.color === "#335e59").length, 10);
  assert.ok(labels.includes("ex"));
  assert.ok(labels.includes("ey"));
  assert.ok(labels.includes("P2"));
  const expected = model.transformWorldToScreen(
    transformPoint(model.transformResults(scene).matrix, { x: -2, y: -2 }),
  );
  pointNear(lines.find((line) => line.color === "#335e59").a, expected);
});
