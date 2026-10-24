import assert from "node:assert/strict";
import test from "node:test";
import {
  doublePendulumDerivative,
  doublePendulumEnergy,
  doublePendulumGeometry,
  doublePendulumPhaseSpaceSeparation,
  makeDoublePendulumRace,
  measureDoublePendulumRace,
  planDoublePendulumFixedSteps,
  stepDoublePendulumRace,
  stepDoublePendulumRk4,
  wrapPendulumAngle,
} from "../lib/labs/double-pendulum-chaos.ts";

import {
  makeChaosScene,
  editChaos,
  chooseChaosPreset,
  resetChaos,
  stopChaos,
  singleChaosStep,
  requestChaosFast,
  advanceChaosFrame,
  beginChaosDrag,
  moveChaosDrag,
  endChaosDrag,
  CHAOS_STEPS,
} from "../lib/labs/chaos-scene.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";

const parameters = { mass1: 1, mass2: 1, length1: 1, length2: 1, gravity: 9.81 };
const initial = { theta1: 2, omega1: 0, theta2: 1.1, omega2: 0, elapsed: 0 };

test("Double pendulum geometry and equations use angles from downward vertical", () => {
  const down = { theta1: 0, omega1: 0, theta2: 0, omega2: 0, elapsed: 0 };
  assert.deepEqual(doublePendulumGeometry(down, parameters), {
    pivot: { x: 0, y: 0 },
    bob1: { x: 0, y: -1 },
    bob2: { x: 0, y: -2 },
  });
  assert.equal(doublePendulumEnergy(down, parameters), 0);
  const downDerivative = doublePendulumDerivative(down, parameters);
  assert.ok(downDerivative);
  assert.ok(Math.abs(downDerivative.theta1Rate) < 1e-12);
  assert.ok(Math.abs(downDerivative.omega1Rate) < 1e-12);
  assert.ok(Math.abs(downDerivative.theta2Rate) < 1e-12);
  assert.ok(Math.abs(downDerivative.omega2Rate) < 1e-12);

  const horizontal = {
    theta1: Math.PI / 2,
    omega1: 0,
    theta2: Math.PI / 2,
    omega2: 0,
    elapsed: 0,
  };
  const derivative = doublePendulumDerivative(horizontal, parameters);
  assert.ok(derivative);
  assert.ok(Math.abs(derivative.omega1Rate + parameters.gravity) < 1e-12);
  assert.ok(Math.abs(derivative.omega2Rate) < 1e-12);
});

test("RK4 keeps elapsed explicit and conserves energy for a small fixed step", () => {
  let state = initial;
  const initialEnergy = doublePendulumEnergy(state, parameters);
  for (let step = 0; step < 2400; step += 1) {
    const next = stepDoublePendulumRk4(state, parameters, 1 / 480);
    assert.ok(next);
    state = next;
  }
  assert.ok(Math.abs(state.elapsed - 5) < 1e-12);
  const drift = Math.abs((doublePendulumEnergy(state, parameters) - initialEnergy) / initialEnergy);
  assert.ok(drift < 1e-7, `unexpected RK4 energy drift ${drift}`);
});

test("Wrapped phase-space distance treats the angle seam as continuous", () => {
  const degrees = (value) => (value * Math.PI) / 180;
  assert.ok(Math.abs(wrapPendulumAngle(degrees(181)) - degrees(-179)) < 1e-12);
  const first = { ...initial, theta1: degrees(179) };
  const second = { ...initial, theta1: degrees(-179) };
  const separation = doublePendulumPhaseSpaceSeparation(first, second, parameters);
  assert.ok(Math.abs(separation - degrees(2)) < 1e-12);
});

test("Twin and half-step reference stay lockstep while exposing different errors", () => {
  let race = makeDoublePendulumRace(initial, 1e-4);
  for (let step = 0; step < 2400; step += 1) {
    race = stepDoublePendulumRace(race, parameters, 1 / 240);
  }
  const metrics = measureDoublePendulumRace(race, parameters);
  assert.equal(race.stepCount, 2400);
  assert.ok(Math.abs(race.primary.elapsed - 10) < 1e-10);
  assert.ok(Math.abs(race.perturbed.elapsed - race.primary.elapsed) < 1e-10);
  assert.ok(Math.abs(race.halfStepReference.elapsed - race.primary.elapsed) < 1e-10);
  assert.ok(metrics.phaseSpaceSeparation > 1e-4);
  assert.ok(metrics.numericalSeparation < metrics.phaseSpaceSeparation);
  assert.ok(Number.isFinite(metrics.finiteTimeExponent));
  assert.ok(metrics.finite);
});

test("Fixed-step planning is independent from render-frame splits and has a guard", () => {
  let fastRemainder = 0;
  let fastSteps = 0;
  for (let frame = 0; frame < 120; frame += 1) {
    const plan = planDoublePendulumFixedSteps(fastRemainder, 1 / 120, 1 / 240, 16, 0.1);
    fastRemainder = plan.remainder;
    fastSteps += plan.steps;
  }
  let slowRemainder = 0;
  let slowSteps = 0;
  for (let frame = 0; frame < 30; frame += 1) {
    const plan = planDoublePendulumFixedSteps(slowRemainder, 1 / 30, 1 / 240, 16, 0.1);
    slowRemainder = plan.remainder;
    slowSteps += plan.steps;
  }
  assert.equal(fastSteps, 240);
  assert.equal(slowSteps, 240);
  assert.ok(planDoublePendulumFixedSteps(0, 1, 1 / 240, 16, 0.1).droppedTime > 0.9);
});

test("P26 unequal-mass equations satisfy independent Newton tension residuals", () => {
  const p = { mass1: 1.7, mass2: 0.6, length1: 0.9, length2: 1.3, gravity: 9.81 };
  for (const theta1 of [-2, -0.5, 0.2, 1.4])
    for (const theta2 of [-1.7, 0.4, 2.8]) {
      const s = { theta1, theta2, omega1: 0.7, omega2: -1.1, elapsed: 1 },
        d = doublePendulumDerivative(s, p);
      assert.ok(d);
      const n1 = { x: Math.sin(theta1), y: -Math.cos(theta1) },
        n2 = { x: Math.sin(theta2), y: -Math.cos(theta2) };
      const t1 = { x: Math.cos(theta1), y: Math.sin(theta1) },
        t2 = { x: Math.cos(theta2), y: Math.sin(theta2) };
      const a1 = {
        x: p.length1 * (d.omega1Rate * t1.x - s.omega1 ** 2 * n1.x),
        y: p.length1 * (d.omega1Rate * t1.y - s.omega1 ** 2 * n1.y),
      };
      const a2 = {
        x: a1.x + p.length2 * (d.omega2Rate * t2.x - s.omega2 ** 2 * n2.x),
        y: a1.y + p.length2 * (d.omega2Rate * t2.y - s.omega2 ** 2 * n2.y),
      };
      assert.ok(Math.abs(p.mass2 * a2.x * t2.x + p.mass2 * (a2.y + p.gravity) * t2.y) < 1e-10);
      assert.ok(
        Math.abs(
          (p.mass1 * a1.x + p.mass2 * a2.x) * t1.x +
            (p.mass1 * (a1.y + p.gravity) + p.mass2 * (a2.y + p.gravity)) * t1.y,
        ) < 1e-10,
      );
    }
});
test("P26 RK4 fourth-order convergence and small-step divergence are separate evidence", () => {
  const integrate = (dt, T) => {
    let s = initial;
    for (let i = 0; i < Math.round(T / dt); i++) s = stepDoublePendulumRk4(s, parameters, dt);
    return s;
  };
  const ref = integrate(1 / 7680, 1),
    errors = [30, 60, 120].map((d) =>
      doublePendulumPhaseSpaceSeparation(integrate(1 / d, 1), ref, parameters),
    );
  assert.ok(errors[0] / errors[1] > 10 && errors[0] / errors[1] < 20);
  assert.ok(errors[1] / errors[2] > 10 && errors[1] / errors[2] < 20);
  let previousNumeric = 1,
    previousDrift = 1;
  for (const denominator of [240, 480, 960]) {
    let race = makeDoublePendulumRace(initial, 1e-4),
      maxDrift = 0;
    for (let i = 0; i < 10 * denominator; i++) {
      race = stepDoublePendulumRace(race, parameters, 1 / denominator);
      const m = measureDoublePendulumRace(race, parameters);
      maxDrift = Math.max(
        maxDrift,
        Math.abs(m.relativeEnergyDrift),
        Math.abs(m.perturbedRelativeEnergyDrift),
      );
      assert.equal(race.primary.elapsed, race.halfStepReference.elapsed);
    }
    const m = measureDoublePendulumRace(race, parameters);
    assert.ok(m.phaseSpaceSeparation > 0.2 && m.phaseSpaceSeparation < 0.23);
    assert.ok(m.numericalSeparation < 0.001 * m.phaseSpaceSeparation);
    assert.ok(m.numericalSeparation < 0.3 * previousNumeric);
    assert.ok(maxDrift < 1e-6 && maxDrift < 0.1 * previousDrift);
    previousNumeric = m.numericalSeparation;
    previousDrift = maxDrift;
  }
});
test("P26 invalid derivatives, failed references, mismatched clocks and overflow are atomic", () => {
  assert.equal(doublePendulumDerivative({ ...initial, omega1: 1e308 }, parameters), null);
  assert.equal(stepDoublePendulumRk4(initial, parameters, 1e308), null);
  for (const change of [{ omega1: Infinity }, { elapsed: 0.01 }]) {
    const race = makeDoublePendulumRace(initial, 1e-4),
      bad = { ...race, halfStepReference: { ...race.halfStepReference, ...change } };
    assert.strictEqual(stepDoublePendulumRace(bad, parameters, 1 / 240), bad);
    assert.equal(bad.primary.elapsed, 0);
  }
  assert.ok(
    Number.isNaN(
      doublePendulumPhaseSpaceSeparation(initial, { ...initial, elapsed: 0.01 }, parameters),
    ),
  );
  for (const args of [
    [1e308, 1e308, 1e-300, 32, 0.1],
    [0, 1, 0.01, NaN, 0.1],
    [0, 1, 0.01, 2.5, 0.1],
  ]) {
    assert.deepEqual(planDoublePendulumFixedSteps(...args), {
      steps: 0,
      remainder: 0,
      droppedTime: 0,
    });
  }
  const zero = makeDoublePendulumRace(
      { theta1: 0, omega1: 0, theta2: 0, omega2: 0, elapsed: 0 },
      0,
    ),
    m = measureDoublePendulumRace(zero, parameters);
  assert.ok(m.finite);
  assert.ok(Number.isNaN(m.relativeEnergyDrift));
  assert.ok(Number.isNaN(m.finiteTimeExponent));
});
test("P26 zero perturbation stays identical while the numerical reference is a different experiment", () => {
  let r = makeDoublePendulumRace(initial, 0);
  for (let i = 0; i < 2400; i++) r = stepDoublePendulumRace(r, parameters, 1 / 240);
  assert.deepEqual(r.primary, r.perturbed);
  const m = measureDoublePendulumRace(r, parameters);
  assert.equal(m.phaseSpaceSeparation, 0);
  assert.ok(m.numericalSeparation > 0);
  assert.ok(Number.isNaN(m.finiteTimeExponent));
});
test("P26 all presets complete cancellable 30-second Canvas jobs with bounded history", () => {
  for (const preset of ["calm", "chaotic", "near-upright"]) {
    let s = requestChaosFast(chooseChaosPreset(makeChaosScene(), preset));
    for (let frame = 0; frame < 1000 && s.fastRemaining > 0; frame++) {
      s = advanceChaosFrame(s, 0);
      assert.ok(s.substeps <= 32);
    }
    assert.equal(s.race.stepCount, 7200);
    assert.ok(Math.abs(s.race.primary.elapsed - 30) < 1e-9);
    assert.equal(s.fastRemaining, 0);
    assert.ok(s.metrics.finite);
    assert.ok(s.history.length <= 751);
    assert.equal(s.history[0].time, 0);
    assert.equal(s.history.at(-1).time, s.race.primary.elapsed);
  }
  let s = advanceChaosFrame(requestChaosFast(makeChaosScene()), 0);
  assert.equal(s.race.stepCount, 32);
  s = stopChaos(s);
  const stopped = s.race;
  s = advanceChaosFrame(s, 10);
  assert.strictEqual(s.race, stopped);
  assert.equal(s.fastRemaining, 0);
});
test("P26 staged scenes advance only taught trajectories and reset deterministically", () => {
  for (const stage of [1, 2]) {
    const s = makeChaosScene(stage);
    assert.strictEqual(singleChaosStep(s), s);
    assert.strictEqual(requestChaosFast(s), s);
    assert.strictEqual(editChaos(s, "dtIndex", 0), s);
    assert.strictEqual(editChaos(s, "epsilon", 0.01), s);
  }
  for (const stage of [3, 4, 5, 6, 7]) {
    const s = singleChaosStep(makeChaosScene(stage));
    assert.equal(s.race.stepCount, 1);
    assert.equal(s.race.primary.elapsed, 1 / 240);
    assert.equal(s.race.perturbed.elapsed, stage >= 4 ? 1 / 240 : 0);
    assert.equal(s.race.halfStepReference.elapsed, stage >= 6 ? 1 / 240 : 0);
    assert.ok(s.metrics.finite);
    assert.deepEqual(resetChaos(s).race, makeChaosScene(stage).race);
  }
  assert.equal(advanceChaosFrame(requestChaosFast(makeChaosScene(6), 10), 0).race.stepCount, 32);
  const invalid = singleChaosStep({ ...makeChaosScene(), dtIndex: 99 });
  assert.equal(invalid.race.stepCount, 0);
  assert.ok(invalid.message);
});
test("P26 frame partitions and angle editing preserve the intended clock and initial-condition policy", () => {
  const run = (frames) => {
    let s = { ...makeChaosScene(), paused: false };
    for (const frame of frames) s = advanceChaosFrame(s, frame);
    return s;
  };
  const a = run(Array(120).fill(1 / 120)),
    b = run(Array(30).fill(1 / 30));
  assert.equal(a.race.stepCount, 240);
  assert.deepEqual(a.race, b.race);
  const guard = run([2]);
  assert.equal(guard.substeps, 24);
  assert.ok(Math.abs(guard.droppedTime - 1.9) < 1e-12);
  const s = makeChaosScene(),
    geo = doublePendulumGeometry(s.race.primary, parameters),
    grab = { x: geo.bob2.x + 0.02, y: geo.bob2.y + 0.01 };
  let dragged = beginChaosDrag(s, grab, 0.1);
  assert.ok(dragged);
  assert.ok(Math.abs(dragged.initial.theta2 - s.initial.theta2) < 1e-12);
  dragged = moveChaosDrag(dragged, { x: grab.x + 0.2, y: grab.y });
  assert.notEqual(dragged.initial.theta2, s.initial.theta2);
  assert.equal(dragged.initial.omega2, 0);
  assert.equal(dragged.race.stepCount, 0);
  assert.equal(dragged.history.length, 1);
  assert.equal(endChaosDrag(dragged).dragOffset, null);
  assert.equal(beginChaosDrag(s, { x: 0, y: 0 }, 0.1), null);
  assert.equal(beginChaosDrag(s, { x: NaN, y: 0 }, 0.1), null);
});
async function actualChaosView() {
  const file = "chaos-view.ts",
    result = {};
  for (const name of [
    "chaosBoardLayout",
    "chaosWorldView",
    "chaosWorldToScreen",
    "chaosScreenToWorld",
    "chaosInPrimaryPane",
    "chaosLogY",
  ])
    result[name] = await componentCallback(file, name, {});
  result.chaosEventPoint = await componentCallback(file, "chaosEventPoint", result);
  return result;
}
test("P26 actual graph renderer uses sample times, log floor and independent Joule axes", async () => {
  const view = await actualChaosView(),
    lines = [],
    colors = { a: "A", b: "B", reference: "R", physical: "P", numerical: "N", grid: "G" };
  const env = {
    ...view,
    CHAOS_COLORS: colors,
    CHAOS_STEPS,
    drawLine: (_ctx, a, b, color) => lines.push({ a, b, color }),
  };
  env.chaosEnergyBound = await componentCallback("chaos-view.ts", "chaosEnergyBound", env);
  const drawS = await componentCallback("chaos-view.ts", "drawChaosSeparation", env),
    drawE = await componentCallback("chaos-view.ts", "drawChaosEnergy", env);
  const s = makeChaosScene();
  s.history = [
    { time: 0, physical: 1e-8, numerical: 0, energyErrors: [0, 0, 0] },
    { time: 1, physical: 1e-4, numerical: 0, energyErrors: [0, 0, 0] },
    { time: 4, physical: 1e-8, numerical: 0, energyErrors: [1, 0, 0] },
  ];
  const ctx = { strokeRect() {}, strokeStyle: "" };
  drawS(ctx, s);
  assert.ok(
    lines.some(
      (l) => l.color === "P" && Math.abs(l.b.x - 162.5) < 1e-12 && Math.abs(l.b.y - 650) < 1e-12,
    ),
  );
  assert.equal(view.chaosLogY(0), 730);
  assert.equal(s.history[0].numerical, 0);
  lines.length = 0;
  drawE(ctx, s);
  assert.ok(lines.some((l) => l.color === "A" && l.b.x === 1060 && l.b.y === 590));
  for (const size of [
    { width: 1100, height: 820, dpr: 1 },
    { width: 760, height: 660, dpr: 2 },
    { width: 440, height: 900, dpr: 3 },
  ]) {
    const board = view.chaosBoardLayout(size),
      point = { x: 420, y: 250 };
    const canvas = {
      getBoundingClientRect: () => ({
        left: 20,
        top: 30,
        width: size.width * 0.7,
        height: size.height * 0.7,
      }),
    };
    const p = view.chaosEventPoint(
      {
        currentTarget: canvas,
        clientX: 20 + 0.7 * (board.x + point.x * board.scale),
        clientY: 30 + 0.7 * (board.y + point.y * board.scale),
      },
      size,
    );
    assert.ok(Math.abs(p.x - point.x) < 1e-10 && Math.abs(p.y - point.y) < 1e-10);
  }
});
async function chaosHarness() {
  const view = await actualChaosView(),
    captures = new Set(),
    sceneRef = { current: makeChaosScene() },
    ownerRef = { current: null };
  let throwCapture = false;
  const canvas = {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 550, height: 410 }),
    setPointerCapture: (id) => {
      if (throwCapture) throw Error("capture");
      captures.add(id);
    },
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => captures.delete(id),
    focus() {},
  };
  const env = {
    ...view,
    stage: 7,
    canvasRef: { current: canvas },
    sceneRef,
    ownerRef,
    size: { width: 1100, height: 820, dpr: 2 },
    setScene() {},
    reducedMotion: false,
    makeChaosScene,
    resetChaos,
    editChaos,
    chooseChaosPreset,
    stopChaos,
    singleChaosStep,
    requestChaosFast,
    advanceChaosFrame,
    beginChaosDrag,
    moveChaosDrag,
    endChaosDrag,
  };
  for (const name of [
    "clearCapture",
    "commit",
    "stop",
    "reset",
    "defaults",
    "edit",
    "preset",
    "step",
    "togglePause",
    "fast",
    "shortRun",
    "toggleDebug",
  ])
    env[name] = await componentCallback("double-pendulum-chaos-lab.tsx", name, env);
  const callbacks = {};
  for (const name of [
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onPointerCancel",
    "onLostPointerCapture",
    "onKeyDown",
  ])
    callbacks[name] = await componentCallback("double-pendulum-chaos-lab.tsx", name, env);
  const event = (p, extra = {}) => ({
    currentTarget: canvas,
    clientX: 10 + p.x / 2,
    clientY: 20 + p.y / 2,
    pointerId: 1,
    button: 0,
    buttons: 1,
    isPrimary: true,
    preventDefault() {
      this.prevented = true;
    },
    ...extra,
  });
  const point = () =>
    view.chaosWorldToScreen(
      doublePendulumGeometry(sceneRef.current.race.primary, parameters).bob2,
      view.chaosWorldView(sceneRef.current),
    );
  return {
    env,
    callbacks,
    event,
    point,
    captures,
    sceneRef,
    ownerRef,
    setThrow: (value) => (throwCapture = value),
  };
}
test("P26 actual pointer owns only a real bob, preserves offset and commits the final up sample", async () => {
  const h = await chaosHarness(),
    c = h.callbacks,
    p = h.point(),
    e = h.event;
  h.setThrow(true);
  c.onPointerDown(e(p));
  assert.equal(h.ownerRef.current, null);
  assert.equal(h.sceneRef.current.dragOffset, null);
  h.setThrow(false);
  for (const extra of [{ button: 2 }, { isPrimary: false }]) c.onPointerDown(e(p, extra));
  c.onPointerDown(e({ x: 700, y: 300 }));
  assert.equal(h.ownerRef.current, null);
  const before = h.sceneRef.current.initial.theta2;
  c.onPointerDown(e({ x: p.x + 1, y: p.y }));
  assert.equal(h.ownerRef.current, 1);
  assert.ok(h.captures.has(1));
  assert.ok(Math.abs(h.sceneRef.current.initial.theta2 - before) < 1e-12);
  const saved = h.sceneRef.current;
  c.onPointerMove(e({ x: p.x + 30, y: p.y }, { pointerId: 2 }));
  assert.strictEqual(h.sceneRef.current, saved);
  c.onPointerUp(e({ x: p.x + 31, y: p.y }, { buttons: 0 }));
  assert.equal(h.ownerRef.current, null);
  assert.equal(h.captures.size, 0);
  assert.equal(h.sceneRef.current.dragOffset, null);
  assert.notEqual(h.sceneRef.current.initial.theta2, before);
  assert.equal(h.sceneRef.current.race.stepCount, 0);
});
test("P26 actual gesture cancellation and reset ignore late releases", async () => {
  for (const method of ["onPointerCancel", "onLostPointerCapture", "buttons", "reset"]) {
    const h = await chaosHarness(),
      c = h.callbacks,
      e = h.event,
      p = h.point();
    c.onPointerDown(e(p));
    c.onPointerMove(e({ x: p.x + 10, y: p.y }));
    if (method === "buttons") c.onPointerMove(e(p, { buttons: 0 }));
    else if (method === "reset") h.env.reset();
    else c[method](e(p));
    assert.equal(h.ownerRef.current, null);
    assert.equal(h.captures.size, 0);
    const saved = h.sceneRef.current;
    c.onPointerUp(e({ x: p.x + 100, y: p.y }, { buttons: 0 }));
    assert.strictEqual(h.sceneRef.current, saved);
  }
});
test("P26 actual keys and internal focus preserve accessibility and reduced-motion semantics", async () => {
  const h = await chaosHarness(),
    key = (k, extra = {}) => ({
      key: k,
      repeat: false,
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      preventDefault() {
        this.prevented = true;
      },
      ...extra,
    });
  const Node = class {},
    inside = new Node(),
    blur = await componentCallback("double-pendulum-chaos-lab.tsx", "onBlur", {
      ...h.env,
      Node,
      containerRef: { current: { contains: (x) => x === inside } },
    });
  h.sceneRef.current = { ...h.sceneRef.current, paused: false };
  blur({ relatedTarget: inside });
  assert.equal(h.sceneRef.current.paused, false);
  h.env.togglePause();
  assert.equal(h.sceneRef.current.paused, true);
  for (const e of [key("Tab"), key("r", { ctrlKey: true }), key(" ", { repeat: true })]) {
    const saved = h.sceneRef.current;
    h.callbacks.onKeyDown(e);
    assert.strictEqual(h.sceneRef.current, saved);
  }
  const before = h.sceneRef.current.initial.theta2;
  h.callbacks.onKeyDown(key("w"));
  assert.ok(h.sceneRef.current.initial.theta2 > before);
  const reduced = await componentCallback("double-pendulum-chaos-lab.tsx", "togglePause", {
    ...h.env,
    reducedMotion: true,
  });
  reduced();
  assert.equal(h.sceneRef.current.paused, true);
});
test("P26 actual RAF caps fast batches and cleans listeners, capture and queued frames", async () => {
  const h = await chaosHarness(),
    windows = new Map(),
    docs = new Map(),
    frames = new Map();
  let id = 0;
  const window = {
    addEventListener: (n, f) => windows.set(n, f),
    removeEventListener: (n) => windows.delete(n),
  };
  const document = {
    hidden: false,
    addEventListener: (n, f) => docs.set(n, f),
    removeEventListener: (n) => docs.delete(n),
  };
  const effect = await componentEffect("double-pendulum-chaos-lab.tsx", "requestAnimationFrame", {
    ...h.env,
    window,
    document,
    requestAnimationFrame: (f) => {
      frames.set(++id, f);
      return id;
    },
    cancelAnimationFrame: (i) => frames.delete(i),
  });
  const cleanup = effect();
  h.env.fast();
  const first = frames.get(1);
  frames.delete(1);
  first(1000);
  assert.equal(h.sceneRef.current.race.stepCount, 32);
  assert.ok(h.sceneRef.current.fastRemaining > 0);
  document.hidden = true;
  docs.get("visibilitychange")();
  assert.equal(h.sceneRef.current.paused, true);
  assert.equal(h.sceneRef.current.fastRemaining, 0);
  cleanup();
  assert.equal(frames.size, 0);
  assert.equal(windows.size, 0);
  assert.equal(docs.size, 0);
});
