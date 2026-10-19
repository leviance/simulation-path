import assert from "node:assert/strict";
import test from "node:test";
import { TAU, pointOnUnitCircle, normalizeAngle } from "../lib/labs/angle.ts";
import { add, subtract, scale } from "../lib/labs/geometry.ts";
import {
  dot,
  cosineBetween,
  angleBetween,
  vectorProjection,
  rejection,
  scalarProjection,
  signedAngleBetween,
  crossZ,
  rotateTowards,
  isWithinViewCone,
  turretNormalize,
} from "../lib/labs/turret.ts";
import {
  turretBoard,
  turretScene,
  turretLayers,
  turretResults,
  turretWorldToScreen,
  turretScreenToWorld,
  setTurretTarget,
  boundedTurretTarget,
  applyTurretPreset,
  advanceTurret,
} from "../lib/labs/turret-scene.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";

const near = (a, b, epsilon = 1e-9) => assert.ok(Math.abs(a - b) <= epsilon, a + " != " + b);
const nearPoint = (a, b) => {
  near(a.x, b.x);
  near(a.y, b.y);
};
const distance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
const size = { width: 760, height: 520, dpr: 2 };

test("Turret dot and cosine use independent cardinal fixtures and finite extreme normalization", () => {
  assert.equal(dot({ x: 2, y: 0 }, { x: 3, y: 0 }), 6);
  for (const [b, expected] of [
    [{ x: 5, y: 0 }, 1],
    [{ x: 0, y: 5 }, 0],
    [{ x: -5, y: 0 }, -1],
  ])
    near(cosineBetween({ x: 1, y: 0 }, b), expected);
  for (const value of [Number.MIN_VALUE, 1e-300, 1e300, Number.MAX_VALUE]) {
    const v = { x: value, y: value };
    near(Math.hypot(...Object.values(turretNormalize(v))), 1);
    near(cosineBetween(v, v), 1);
  }
  assert.deepEqual(turretNormalize({ x: NaN, y: 1 }), { x: 0, y: 0 });
  near(angleBetween({ x: 1, y: 0 }, { x: 0, y: 1 }), Math.PI / 2);
});

test("Turret signed angle preserves handedness, seam and deterministic antiparallel signed-zero tie", () => {
  near(signedAngleBetween({ x: 1, y: 0 }, { x: 0, y: 1 }), Math.PI / 2);
  near(signedAngleBetween({ x: 1, y: 0 }, { x: 0, y: -1 }), -Math.PI / 2);
  near(signedAngleBetween({ x: 1, y: 0 }, { x: -1, y: -0 }), Math.PI);
  near(
    signedAngleBetween(pointOnUnitCircle((359 * Math.PI) / 180), pointOnUnitCircle(Math.PI / 180)),
    (2 * Math.PI) / 180,
  );
  assert.equal(signedAngleBetween({ x: 0, y: 0 }, { x: 1, y: 0 }), 0);
});

test("Turret projection agrees with independent unnormalized-axis oracle, decomposition and orthogonality", () => {
  for (let x = -6; x <= 6; x++)
    for (let y = -6; y <= 6; y++)
      for (const axis of [
        { x: 2, y: 1 },
        { x: -3, y: 4 },
        { x: 0, y: 2 },
      ]) {
        const v = { x, y },
          p = vectorProjection(v, axis),
          r = rejection(v, axis);
        const coefficient = (x * axis.x + y * axis.y) / (axis.x ** 2 + axis.y ** 2);
        nearPoint(p, { x: coefficient * axis.x, y: coefficient * axis.y });
        nearPoint(add(p, r), v);
        near(dot(p, r), 0);
      }
  assert.equal(scalarProjection({ x: -4, y: 3 }, { x: 1, y: 0 }), -4);
  nearPoint(vectorProjection({ x: 3, y: 4 }, { x: 0, y: 0 }), { x: 0, y: 0 });
});

test("Turret steering matches independent angle oracle, maximum step and no-overshoot across many pairs", () => {
  for (let i = -20; i <= 20; i++)
    for (let j = -20; j <= 20; j++) {
      const current = i * 0.29,
        desired = j * 0.31 + 0.007;
      let difference = Math.atan2(Math.sin(desired - current), Math.cos(desired - current));
      if (difference === -Math.PI) difference = Math.PI;
      const expected = current + Math.max(-0.13, Math.min(0.13, difference));
      const actual = rotateTowards(current, pointOnUnitCircle(desired), 0.13);
      assert.ok(distance(actual, expected) < 1e-9);
      assert.ok(distance(actual, current) <= 0.13 + 1e-9);
    }
  near(rotateTowards(0, pointOnUnitCircle(0.01), 0.2), 0.01);
});

test("Turret fixed-target steering is independent of accepted dt sequence and holds at center/zero speed", () => {
  for (const sequence of [
    Array(120).fill(1 / 120),
    Array(10).fill(0.1),
    Array(10).fill([0.013, 0.027, 0.06]).flat(),
  ]) {
    let scene = { ...turretScene(), turnSpeed: 0.5, targetOffset: { x: 0, y: 5 } };
    for (const dt of sequence) scene = advanceTurret(scene, dt);
    near(scene.turretAngle, 0.5);
  }
  const scene = { ...turretScene(), turretAngle: 0.7 };
  for (const dt of [-1, 0, 1, NaN, Infinity]) assert.equal(advanceTurret(scene, dt), scene);
  assert.equal(advanceTurret(setTurretTarget(scene, { x: 0, y: 0 }), 0.1).turretAngle, 0.7);
  assert.equal(advanceTurret({ ...scene, turnSpeed: 0 }, 0.1).turretAngle, 0.7);
});

test("Turret cone includes both boundaries, rejects outside and never calls zero/near-center locked", () => {
  for (const half of [(5 * Math.PI) / 180, (35 * Math.PI) / 180, Math.PI / 2])
    for (const sign of [-1, 1]) {
      assert.equal(isWithinViewCone({ x: 1, y: 0 }, pointOnUnitCircle(sign * half), half), true);
      assert.equal(
        isWithinViewCone({ x: 1, y: 0 }, pointOnUnitCircle(sign * (half + 1e-5)), half),
        false,
      );
    }
  assert.equal(isWithinViewCone({ x: 1, y: 0 }, { x: 0, y: 0 }, 0.5), false);
  const r = turretResults(setTurretTarget(turretScene(), { x: 0.1, y: 0 }));
  assert.equal(r.valid, false);
  assert.equal(r.locked, false);
});

test("Turret radial input domain keeps projection visible and coordinate round trips correct", () => {
  near(Math.hypot(...Object.values(boundedTurretTarget({ x: 1e300, y: -1e300 }))), 6.5);
  for (let phase = 0; phase < TAU; phase += 0.05)
    for (const heading of [0, 0.4, 1.3, 3.2, 5.5]) {
      const target = scale(pointOnUnitCircle(phase), 6.5);
      nearPoint(turretScreenToWorld(turretWorldToScreen(target)), target);
      const screen = turretWorldToScreen(vectorProjection(target, pointOnUnitCircle(heading)));
      assert.ok(
        screen.x >= 290 - 1e-9 &&
          screen.x <= 810 + 1e-9 &&
          screen.y >= 150 - 1e-9 &&
          screen.y <= 670 + 1e-9,
      );
    }
});

test("Turret presets disable hover, preserve heading and final modes retain every required layer", () => {
  for (let index = 0; index < 7; index++) {
    const scene = applyTurretPreset({ ...turretScene(), turretAngle: 0.8, dragging: true }, index);
    assert.equal(scene.followMouse, false);
    assert.equal(scene.dragging, false);
    near(scene.turretAngle, 0.8);
  }
  for (const mode of ["turret-view-cone", "turret-full", undefined])
    assert.deepEqual(turretLayers(mode), {
      dot: true,
      angle: true,
      projection: true,
      rotation: true,
      cone: true,
    });
  assert.equal(turretLayers("turret-scene").dot, false);
  assert.equal(turretLayers("turret-projection").rotation, false);
});

test("Turret actual event mapping handles CSS scale, DPR, letterbox and captured outside coordinates", async () => {
  const boardLayout = await componentCallback("turret-lab-view.ts", "boardLayout", {});
  const map = await componentCallback("turret-lab-view.ts", "turretPointFromEvent", {
    boardLayout,
  });
  const scale = Math.min(size.width / 1100, size.height / 760);
  const ox = (size.width - 1100 * scale) / 2,
    oy = (size.height - 760 * scale) / 2;
  const event = {
    clientX: 10 + 2 * (ox + 710 * scale),
    clientY: 20 + 2 * (oy + 290 * scale),
    currentTarget: {
      getBoundingClientRect: () => ({ left: 10, top: 20, width: 1520, height: 1040 }),
    },
  };
  nearPoint(map(event, size), { x: 710, y: 290 });
  assert.equal(map({ ...event, clientX: 10 }, size), null);
  assert.ok(map({ ...event, clientX: -200 }, size, true).x < 0);
});

async function harness() {
  const sceneRef = { current: turretScene() },
    owner = { current: null },
    pausedRef = { current: true },
    captures = new Set();
  const canvas = {
    focus() {},
    setPointerCapture: (id) => captures.add(id),
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => captures.delete(id),
  };
  const updateScene = (scene) => {
    sceneRef.current = scene;
  };
  const pause = (value) => {
    pausedRef.current = value;
  };
  const release = await componentCallback("turret-lab.tsx", "release", {
    owner,
    sceneRef,
    canvasRef: { current: canvas },
    updateScene,
  });
  const env = {
    owner,
    sceneRef,
    size,
    updateScene,
    turretPointFromEvent: (e) => e.point,
    turretScreenToWorld,
    setTurretTarget,
    release,
  };
  const start = await componentCallback("turret-lab.tsx", "startDrag", env);
  const move = await componentCallback("turret-lab.tsx", "moveTarget", env);
  const end = await componentCallback("turret-lab.tsx", "stopDrag", env);
  const event = (id, point, rest = {}) => ({
    pointerId: id,
    point,
    currentTarget: canvas,
    button: 0,
    buttons: 1,
    pointerType: "mouse",
    isPrimary: true,
    preventDefault() {},
    ...rest,
  });
  return {
    sceneRef,
    owner,
    pausedRef,
    captures,
    canvas,
    updateScene,
    pause,
    release,
    start,
    move,
    end,
    event,
  };
}

test("Turret actual hover follows primary mouse without a button but respects hold, touch and right-button input", async () => {
  const h = await harness();
  h.move(h.event(1, { x: 550, y: 210 }, { buttons: 0 }));
  nearPoint(h.sceneRef.current.targetOffset, { x: 0, y: 5 });
  for (const rest of [
    { pointerType: "touch", buttons: 0 },
    { buttons: 2 },
    { isPrimary: false, buttons: 0 },
  ])
    h.move(h.event(2, { x: 350, y: 410 }, rest));
  nearPoint(h.sceneRef.current.targetOffset, { x: 0, y: 5 });
  h.sceneRef.current.followMouse = false;
  h.move(h.event(1, { x: 350, y: 410 }, { buttons: 0 }));
  nearPoint(h.sceneRef.current.targetOffset, { x: 0, y: 5 });
});

test("Turret actual capture uses a single owner and applies the final up sample while paused", async () => {
  const h = await harness();
  h.start(h.event(1, { x: 710, y: 290 }, { button: 2 }));
  assert.equal(h.owner.current, null);
  h.start(h.event(1, { x: 710, y: 290 }));
  h.move(h.event(2, { x: 350, y: 410 }));
  h.end(h.event(2, { x: 350, y: 410 }));
  nearPoint(h.sceneRef.current.targetOffset, { x: 4, y: 3 });
  h.end(h.event(1, { x: 550, y: 210 }));
  nearPoint(h.sceneRef.current.targetOffset, { x: 0, y: 5 });
  assert.equal(h.owner.current, null);
  assert.equal(h.captures.size, 0);
});

test("Turret actual cancel, lost buttons and capture failure clear ownership without committing a cancel sample", async () => {
  for (const cause of ["cancel", "lostButton", "captureFailure"]) {
    const h = await harness();
    if (cause === "captureFailure")
      h.canvas.setPointerCapture = () => {
        throw Error("capture failed");
      };
    h.start(h.event(1, { x: 710, y: 290 }));
    if (cause === "cancel") h.end(h.event(1, { x: 350, y: 410 }), true);
    if (cause === "lostButton") h.move(h.event(1, { x: 350, y: 410 }, { buttons: 0 }));
    assert.equal(h.owner.current, null);
    assert.equal(h.sceneRef.current.dragging, false);
    nearPoint(h.sceneRef.current.targetOffset, { x: 4, y: 3 });
  }
});

test("Turret actual preset/reset/follow controls cancel capture and freeze hover when needed", async () => {
  for (const name of ["choosePreset", "reset", "toggleFollow", "changeHeading"]) {
    const h = await harness();
    h.start(h.event(1, { x: 710, y: 290 }));
    const handler = await componentCallback("turret-lab.tsx", name, {
      release: h.release,
      pause: h.pause,
      sceneRef: h.sceneRef,
      updateScene: h.updateScene,
      turretScene,
      applyTurretPreset,
      normalizeAngle,
    });
    handler(name === "toggleFollow" ? false : name === "changeHeading" ? 0.3 : 4);
    assert.equal(h.owner.current, null);
    assert.equal(h.sceneRef.current.dragging, false);
    if (name !== "changeHeading") assert.equal(h.sceneRef.current.followMouse, false);
  }
});

test("Turret actual keyboard leaves Tab/modifiers alone, suppresses repeat toggles and can edit target while paused", async () => {
  const h = await harness();
  let toggles = 0;
  const handler = await componentCallback("turret-lab.tsx", "onKeyDown", {
    sceneRef: h.sceneRef,
    layers: turretLayers(),
    pausedRef: h.pausedRef,
    reducedMotion: false,
    release: h.release,
    updateScene: h.updateScene,
    setTurretTarget,
    togglePause: () => toggles++,
    reset() {},
    toggleFollow() {},
    step() {},
    changeHeading() {},
  });
  let prevented = 0;
  const e = (key, rest = {}) => ({
    key,
    repeat: false,
    preventDefault: () => prevented++,
    ...rest,
  });
  handler(e("Tab"));
  handler(e("ArrowUp", { ctrlKey: true }));
  assert.equal(prevented, 0);
  handler(e(" ", { repeat: true }));
  handler(e(" "));
  assert.equal(toggles, 1);
  handler(e("ArrowUp"));
  nearPoint(h.sceneRef.current.targetOffset, { x: 4, y: 3.25 });
  assert.equal(h.sceneRef.current.followMouse, false);
});

test("Turret actual blur/hidden/dispose release capture, persist pause and clean listeners", async () => {
  const h = await harness();
  h.start(h.event(1, { x: 710, y: 290 }));
  const listeners = new Map();
  const target = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name) => listeners.delete(name),
  };
  const document = { ...target, hidden: true };
  const effect = await componentEffect("turret-lab.tsx", 'window.addEventListener("blur"', {
    window: target,
    document,
    release: h.release,
    pause: h.pause,
  });
  const dispose = effect();
  listeners.get("visibilitychange")();
  assert.equal(h.owner.current, null);
  assert.equal(h.pausedRef.current, true);
  dispose();
  assert.equal(listeners.size, 0);
});

test("Turret actual resize preserves scene and mode/reduced-motion effects stop active input without auto resume", async () => {
  let releases = 0,
    resets = 0;
  const previousMode = { current: "turret-rotation" };
  const resize = await componentEffect("turret-lab.tsx", "previousMode.current !== mode", {
    release: () => releases++,
    previousMode,
    mode: "turret-rotation",
    reset: () => resets++,
  });
  resize();
  assert.equal(releases, 1);
  assert.equal(resets, 0);
  const change = await componentEffect("turret-lab.tsx", "previousMode.current !== mode", {
    release: () => releases++,
    previousMode,
    mode: "turret-full",
    reset: () => resets++,
  });
  change();
  assert.equal(resets, 1);
  const pauses = [];
  for (const reducedMotion of [true, false]) {
    const effect = await componentEffect("turret-lab.tsx", "if (reducedMotion)", {
      reducedMotion,
      release() {},
      pause: (v) => pauses.push(v),
    });
    effect();
  }
  assert.deepEqual(pauses, [true]);
});

test("Turret actual animation clamps long gaps, respects pause/reduced motion and cancels RAF", async () => {
  for (const [paused, reducedMotion] of [
    [true, false],
    [false, true],
  ]) {
    const effect = await componentEffect("turret-lab.tsx", "requestAnimationFrame(animate)", {
      layers: turretLayers(),
      paused,
      reducedMotion,
    });
    assert.equal(effect(), undefined);
  }
  let callback,
    dt = 0,
    cancelled = 0;
  const effect = await componentEffect("turret-lab.tsx", "requestAnimationFrame(animate)", {
    layers: turretLayers(),
    paused: false,
    reducedMotion: false,
    performance: { now: () => 0 },
    document: { hidden: false },
    pausedRef: { current: false },
    sceneRef: { current: turretScene() },
    requestAnimationFrame: (fn) => {
      callback = fn;
      return 9;
    },
    cancelAnimationFrame: (id) => {
      cancelled = id;
    },
    advanceTurret: (scene, accepted) => {
      dt = accepted;
      return scene;
    },
    updateScene() {},
  });
  const dispose = effect();
  callback(30_000);
  assert.equal(dt, 0.1);
  dispose();
  assert.equal(cancelled, 9);
});

test("Turret actual Canvas renderer retains physical barrel, both debug vectors and projection/rejection", async () => {
  const labels = [],
    segments = [],
    arcs = [],
    placements = [];
  const ctx = new Proxy(
    {},
    {
      get: (target, key) =>
        target[key] ??
        ((...args) => {
          if (key === "fillText") {
            labels.push(args[0]);
            placements.push(args);
          }
          if (key === "arc") arcs.push(args);
        }),
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    },
  );
  const boardLayout = await componentCallback("turret-lab-view.ts", "boardLayout", {});
  const draw = await componentCallback("turret-lab-view.ts", "drawTurretLab", {
    setupCanvas() {},
    boardLayout,
    turretResults,
    turretBoard,
    turretWorldToScreen,
    turretNormalize,
    pointOnUnitCircle,
    TAU,
    add,
    subtract,
    scale,
    drawLine: (_, a, b, color) => segments.push({ a, b, color }),
  });
  draw(ctx, size, turretScene(), turretLayers("turret-full"));
  for (const label of ["forward", "target direction", "projection"])
    assert.ok(labels.includes(label));
  for (const color of ["#ffe26c", "#53f0ae", "#84a9ff", "#ff6b6b", "#ffffff"])
    assert.ok(
      segments.some((line) => line.color === color),
      color,
    );
  assert.ok(arcs.some(([, , radius]) => radius === 24));
  placements.length = 0;
  draw(ctx, size, setTurretTarget(turretScene(), { x: 5, y: 0 }), turretLayers("turret-full"));
  const forwardLabel = placements.find(([text]) => text === "forward");
  const targetLabel = placements.find(([text]) => text === "target direction");
  assert.ok(targetLabel[2] < forwardLabel[2], "aligned labels remain on different sides");
  assert.ok(
    segments.some(
      ({ a, b, color }) =>
        color === "#ffffff" && Math.abs(a.y - 404) < 1e-9 && Math.abs(b.y - 404) < 1e-9,
    ),
  );
});
