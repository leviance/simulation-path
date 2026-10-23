import assert from "node:assert/strict";
import test from "node:test";
import * as model from "../lib/labs/integrator-scene.ts";
import * as benchmark from "../lib/labs/integrator-benchmark.ts";
import * as math from "../lib/labs/integrator-race.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
import {
  analyticIntegratorState,
  explicitEulerIntegratorStep,
  integratorAngularFrequency,
  integratorEnergy,
  makeIntegratorRaceState,
  measureIntegratorState,
  planIntegratorFixedSteps,
  runIntegratorSimulation,
  rungeKutta4IntegratorStep,
  stepIntegratorRaceState,
  traceExplicitEulerStep,
  traceRungeKutta4Step,
  traceVelocityVerletStep,
  velocityVerletIntegratorStep,
} from "../lib/labs/integrator-race.ts";

const parameters = { mass: 1, stiffness: 4 };
const initial = { position: 1, velocity: 0, elapsed: 0 };

test("Integrator math matches the harmonic-oscillator model and one-step formulas", () => {
  assert.equal(integratorAngularFrequency(parameters), 2);
  const quarter = analyticIntegratorState(initial, parameters, Math.PI / 4);
  assert.ok(Math.abs(quarter.position) < 1e-12);
  assert.ok(Math.abs(quarter.velocity + 2) < 1e-12);
  assert.ok(
    Math.abs(integratorEnergy(quarter, parameters) - integratorEnergy(initial, parameters)) < 1e-12,
  );

  const euler = explicitEulerIntegratorStep(initial, parameters, 0.1);
  assert.deepEqual(euler, {
    state: { position: 1, velocity: -0.4, elapsed: 0.1 },
    forceEvaluations: 1,
  });
  const verlet = velocityVerletIntegratorStep(initial, parameters, 0.1);
  assert.ok(Math.abs(verlet.state.position - 0.98) < 1e-12);
  assert.ok(Math.abs(verlet.state.velocity + 0.396) < 1e-12);
  assert.equal(verlet.forceEvaluations, 2);
  const rk4 = rungeKutta4IntegratorStep(initial, parameters, 0.1);
  assert.equal(rk4.forceEvaluations, 4);
  const exact = analyticIntegratorState(initial, parameters, 0.1);
  assert.ok(
    Math.abs(rk4.state.position - exact.position) < Math.abs(euler.state.position - exact.position),
  );

  const eulerTrace = traceExplicitEulerStep(initial, parameters, 0.1);
  assert.equal(eulerTrace.accelerationStart, -4);
  assert.deepEqual(eulerTrace.next, euler.state);

  const verletTrace = traceVelocityVerletStep(initial, parameters, 0.1);
  assert.equal(verletTrace.accelerationStart, -4);
  assert.ok(Math.abs(verletTrace.positionEnd - 0.98) < 1e-12);
  assert.ok(Math.abs(verletTrace.accelerationEnd + 3.92) < 1e-12);
  assert.deepEqual(verletTrace.next, verlet.state);

  const rk4Trace = traceRungeKutta4Step(initial, parameters, 0.1);
  assert.deepEqual(rk4Trace.next, rk4.state);
  assert.deepEqual(rk4Trace.k1, { positionRate: 0, velocityRate: -4 });
  assert.equal(rk4Trace.stage2State.elapsed, 0.05);
  assert.equal(rk4Trace.stage4State.elapsed, 0.1);
});

test("Integrator race stays lockstep and fixed stepping ignores render-frame splits", () => {
  let race = makeIntegratorRaceState(initial);
  for (let step = 0; step < 120; step += 1) {
    race = stepIntegratorRaceState(race, parameters, 1 / 60);
  }
  assert.equal(race.stepCount, 120);
  assert.ok(race.lanes.every((lane) => Math.abs(lane.state.elapsed - 2) < 1e-12));
  assert.equal(race.lanes[0].forceEvaluations, 120);
  assert.equal(race.lanes[1].forceEvaluations, 240);
  assert.equal(race.lanes[2].forceEvaluations, 480);

  const countSteps = (frames) => {
    let remainder = 0;
    let count = 0;
    for (const frame of frames) {
      const plan = planIntegratorFixedSteps(remainder, frame, 1 / 60, 16, 0.25);
      remainder = plan.remainder;
      count += plan.steps;
    }
    return count;
  };
  assert.equal(countSteps(Array(120).fill(1 / 120)), 60);
  assert.equal(countSteps(Array(30).fill(1 / 30)), 60);
});

test("Integrator convergence, cost and long-run energy behavior remain visible", () => {
  const error = (kind, dt) => {
    const run = runIntegratorSimulation(kind, initial, parameters, 2, dt);
    return measureIntegratorState(run.state, initial, parameters).phaseSpaceError;
  };
  const eulerRatio = error("euler", 1 / 20) / error("euler", 1 / 40);
  const verletRatio = error("verlet", 1 / 20) / error("verlet", 1 / 40);
  const rk4Ratio = error("rk4", 1 / 20) / error("rk4", 1 / 40);
  assert.ok(eulerRatio > 1.7);
  assert.ok(verletRatio > 3.5);
  assert.ok(rk4Ratio > 12);

  const eulerLong = runIntegratorSimulation("euler", initial, parameters, 20, 1 / 20);
  const verletLong = runIntegratorSimulation("verlet", initial, parameters, 20, 1 / 20);
  assert.ok(measureIntegratorState(eulerLong.state, initial, parameters).relativeEnergyDrift > 20);
  assert.ok(
    Math.abs(measureIntegratorState(verletLong.state, initial, parameters).relativeEnergyDrift) <
      0.01,
  );
  assert.equal(eulerLong.forceEvaluations, eulerLong.steps);
  assert.equal(verletLong.forceEvaluations, verletLong.steps * 2);

  const noSpringMetrics = measureIntegratorState(
    { position: 2, velocity: 1, elapsed: 1 },
    initial,
    { mass: 1, stiffness: 0 },
  );
  assert.ok(Number.isNaN(noSpringMetrics.phaseSpaceError));
});

const near = (a, b, epsilon = 1e-9) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= epsilon, `${a} != ${b}`);
test("P23 rejects invalid state, overflows and unbounded work without a partially advanced race", () => {
  for (const trace of [traceExplicitEulerStep, traceVelocityVerletStep, traceRungeKutta4Step]) {
    assert.equal(trace({ position: 1e308, velocity: 1e308, elapsed: 0 }, parameters, 10), null);
  }
  for (const kind of math.INTEGRATOR_KINDS) {
    for (const dt of [0, -1, NaN, Infinity])
      assert.equal(math.stepIntegratorByKind(kind, initial, parameters, dt).forceEvaluations, 0);
    assert.equal(
      math.stepIntegratorByKind(kind, { ...initial, position: NaN }, parameters, 0.1)
        .forceEvaluations,
      0,
    );
    assert.equal(
      math.stepIntegratorByKind(kind, initial, { mass: 0, stiffness: 4 }, 0.1).forceEvaluations,
      0,
    );
    assert.equal(
      math.stepIntegratorByKind(kind, initial, { mass: 1, stiffness: Infinity }, 0.1)
        .forceEvaluations,
      0,
    );
    assert.equal(math.runIntegratorSimulation(kind, initial, parameters, Infinity, 0.1).steps, 0);
    assert.equal(math.runIntegratorSimulation(kind, initial, parameters, 2, 1e-300).steps, 0);
  }
  const race = math.makeIntegratorRaceState(initial);
  race.lanes[2].state.velocity = NaN;
  assert.equal(math.stepIntegratorRaceState(race, parameters, 0.1), race);
  assert.equal(race.lanes[0].state.velocity, 0);
  assert.equal(math.planIntegratorFixedSteps(0, 1, 1e-300, 16, 0.1).steps, 0);
  assert.equal(math.planIntegratorFixedSteps(0, 1, 0.1, Infinity, 0.1).steps, 0);
  assert.ok(
    Number.isNaN(
      math.measureIntegratorState(
        { position: 0, velocity: 0, elapsed: 0 },
        { position: 0, velocity: 0, elapsed: 0 },
        parameters,
      ).relativeEnergyDrift,
    ),
  );
  const free = math.analyticIntegratorState(
    { position: 1, velocity: 2, elapsed: 3 },
    { mass: 1, stiffness: 0 },
    2,
  );
  assert.deepEqual(free, { position: 5, velocity: 2, elapsed: 5 });
});
test("P23 stage gating, per-physics-step history, frame partitions and runtime lane choices", () => {
  const first = model.stepIntegratorScene(model.makeIntegratorScene(1));
  assert.equal(first.race.stepCount, 0);
  near(first.elapsed, 1 / 30);
  const second = model.stepIntegratorScene(model.makeIntegratorScene(2));
  assert.deepEqual(
    second.race.lanes.map((lane) => lane.forceEvaluations),
    [1, 0, 0],
  );
  const third = model.stepIntegratorScene(model.makeIntegratorScene(3));
  assert.deepEqual(
    third.race.lanes.map((lane) => lane.forceEvaluations),
    [1, 2, 0],
  );
  const run = (dt, n) => {
    let s = model.editIntegratorSetting(model.makeIntegratorScene(), "dtIndex", 4);
    s = { ...s, paused: false };
    for (let i = 0; i < n; i++) s = model.advanceIntegratorFrame(s, dt);
    return s;
  };
  const fast = run(1 / 120, 120),
    slow = run(1 / 30, 30);
  assert.equal(fast.race.stepCount, 60);
  assert.equal(slow.race.stepCount, 60);
  assert.deepEqual(fast.race, slow.race);
  assert.deepEqual(fast.history, slow.history);
  assert.equal(fast.history.length, 61);
  let s = model.stepIntegratorScene(model.makeIntegratorScene());
  s = model.editIntegratorLane(s, 1, "euler");
  s = model.editIntegratorLane(s, 2, "euler");
  assert.equal(s.race.stepCount, 0);
  assert.equal(s.history.length, 1);
  s = model.stepIntegratorScene(s);
  assert.deepEqual(s.race.lanes[0].state, s.race.lanes[1].state);
  assert.deepEqual(
    s.race.lanes.map((lane) => lane.forceEvaluations),
    [1, 1, 1],
  );
  assert.equal(model.editIntegratorSetting(s, "mass", NaN), s);
  s = model.editIntegratorSetting(s, "dtIndex", 5);
  s = model.requestIntegratorFast(s);
  for (let frame = 0; frame < 50 && s.fastRemaining > 0; frame++)
    s = model.advanceIntegratorFrame(s, 0);
  near(s.elapsed, 20);
  assert.equal(s.fastRemaining, 0);
  assert.equal(s.history.length, model.INTEGRATOR_HISTORY_LIMIT);
  near(s.history.at(-1).time, 20);
  let stress = model.requestIntegratorFast(model.integratorPreset(8, 2));
  for (let frame = 0; frame < 50 && stress.fastRemaining > 0; frame++)
    stress = model.advanceIntegratorFrame(stress, 0);
  assert.ok(stress.warning);
  assert.equal(stress.fastRemaining, 0);
  assert.ok(
    stress.race.lanes[0].state.position > 1e6 ||
      Math.abs(stress.race.lanes[0].state.velocity) > 1e6,
    "physical divergence is preserved, not clamped",
  );
});

function independentMatrixState(kind, dt, n) {
  const q = 2 * dt;
  let matrix = [1, dt, -4 * dt, 1];
  if (kind === "verlet")
    matrix = [1 - (q * q) / 2, dt, -4 * dt * (1 - (q * q) / 4), 1 - (q * q) / 2];
  if (kind === "rk4")
    matrix = [
      1 - (q * q) / 2 + q ** 4 / 24,
      dt * (1 - (q * q) / 6),
      -4 * dt * (1 - (q * q) / 6),
      1 - (q * q) / 2 + q ** 4 / 24,
    ];
  const multiply = (a, b) => [
    a[0] * b[0] + a[1] * b[2],
    a[0] * b[1] + a[1] * b[3],
    a[2] * b[0] + a[3] * b[2],
    a[2] * b[1] + a[3] * b[3],
  ];
  let product = [1, 0, 0, 1];
  for (let power = n; power > 0; power = Math.floor(power / 2)) {
    if (power % 2) product = multiply(product, matrix);
    matrix = multiply(matrix, matrix);
  }
  return { x: product[0], v: product[2] };
}
test("P23 benchmark runs equal deterministic work, measures a fake clock independently and yields each batch", () => {
  const config = { initial, parameters, dt: 0.1, repetitions: 16, samples: 5 };
  for (const kind of math.INTEGRATOR_KINDS) {
    const actual = benchmark.integratorBenchmarkWork(kind, config, 16),
      expected = independentMatrixState(kind, 0.1, 20);
    assert.equal(actual.steps, 320);
    near(actual.checksum, 16 * (expected.x + 0.125 * expected.v));
  }
  assert.equal(benchmark.integratorBenchmarkWork("verlet", config, 16).forceEvaluations, 640);
  assert.equal(benchmark.integratorBenchmarkWork("rk4", config, 10000).valid, false);
  near(benchmark.integratorMedian([3, 1, 2]), 2);
  assert.ok(Number.isNaN(benchmark.integratorMedian([NaN])));
  let now = 0,
    job = benchmark.makeIntegratorBenchmark(config, now),
    ticks = 0;
  const clock = () => {
    now += 0.1;
    return now;
  };
  while (job.running && ticks < 24) {
    const before = job.rows.length;
    job = benchmark.advanceIntegratorBenchmark(job, clock);
    assert.ok(job.rows.length - before <= 1);
    ticks++;
  }
  assert.equal(ticks, 18);
  assert.equal(job.failed, false);
  assert.equal(job.rows.length, 3);
  for (const row of job.rows) near(row.microsecondsPerStep, 0.3125);
  let expired = benchmark.makeIntegratorBenchmark(config, 0);
  expired = benchmark.advanceIntegratorBenchmark(expired, () => 5001);
  assert.equal(expired.failed, true);
  let s = model.requestIntegratorBenchmark(model.makeIntegratorScene(), 0);
  const snapshot = s.benchmark.config;
  s = model.editIntegratorSetting(s, "stiffness", 16);
  assert.equal(s.benchmark, null);
  assert.equal(snapshot.parameters.stiffness, 4);
});

async function handlerHarness(stage = 8) {
  const sceneRef = { current: model.makeIntegratorScene(stage) },
    drag = { current: null },
    captured = new Set();
  let capturing = false;
  const canvas = {
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 1100, height: 820 }),
    focus() {},
    setPointerCapture: (id) => captured.add(id),
    hasPointerCapture: (id) => captured.has(id),
    releasePointerCapture: (id) => captured.delete(id),
  };
  const layout = (size) => {
    const scale = Math.min(size.width / 1100, size.height / 820);
    return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 820 * scale) / 2 };
  };
  const point = await componentCallback("integrator-race-view.ts", "integratorPointFromEvent", {
    layout,
  });
  const env = {
    ...math,
    ...model,
    sceneRef,
    drag,
    canvasRef: { current: canvas },
    size: { width: 1100, height: 820, dpr: 2 },
    stage,
    reducedMotion: false,
    performance: { now: () => 0 },
    setCapturing: (value) => (capturing = value),
    commit: (next) => (sceneRef.current = next),
    integratorPointFromEvent: point,
    integratorScreenToPosition: (x) => (x - 560) / 100,
    integratorHitMass: (scene, p) => {
      for (let i = 0; i < 3; i++) {
        const position =
          i < Math.min(3, scene.stage - 1)
            ? scene.race.lanes[i].state.position
            : math.analyticIntegratorState(scene.initial, scene.parameters, scene.elapsed).position;
        const x = 560 + 100 * position;
        if (
          x >= 25 &&
          x <= 1075 &&
          Math.abs(p.x - x) <= 24 &&
          Math.abs(p.y - (140 + 110 * i)) <= 24
        )
          return x;
      }
      return null;
    },
  };
  for (const name of [
    "cancelDrag",
    "stop",
    "preset",
    "edit",
    "editLane",
    "setGraph",
    "toggleDebug",
    "togglePause",
    "step",
    "fast",
    "benchmark",
    "updateDrag",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onPointerCancel",
    "onKeyDown",
  ])
    env[name] = await componentCallback("integrator-race-lab.tsx", name, env);
  return {
    ...env,
    canvas,
    captured,
    capturing: () => capturing,
    event: (x, y, overrides = {}) => ({
      clientX: x + 10,
      clientY: y + 20,
      pointerId: 4,
      isPrimary: true,
      button: 0,
      buttons: 1,
      currentTarget: canvas,
      ...overrides,
    }),
  };
}
test("P23 actual pointer callbacks preserve grab offset, enforce owner, accept final up and clean capture", async () => {
  const h = await handlerHarness();
  h.onPointerDown(h.event(820, 140));
  assert.equal(h.drag.current.offset, 10);
  assert.equal(h.capturing(), true);
  near(h.sceneRef.current.initial.position, 2.5);
  h.onPointerMove(h.event(1000, 140, { pointerId: 9 }));
  near(h.sceneRef.current.initial.position, 2.5);
  h.onPointerMove(h.event(840, 140));
  near(h.sceneRef.current.initial.position, 2.7);
  h.onPointerUp(h.event(850, 140));
  near(h.sceneRef.current.initial.position, 2.8);
  assert.equal(h.captured.size, 0);
  assert.equal(h.capturing(), false);
  h.onPointerDown(h.event(100, 700));
  assert.equal(h.drag.current, null);
  h.onPointerDown(h.event(850, 140, { button: 2 }));
  assert.equal(h.drag.current, null);
  h.onPointerDown(h.event(850, 140));
  h.edit("stiffness", 9);
  assert.equal(h.drag.current, null);
  assert.equal(h.sceneRef.current.parameters.stiffness, 9);
  h.canvas.setPointerCapture = () => {
    throw Error("capture blocked");
  };
  h.onPointerDown(h.event(850, 140));
  assert.equal(h.drag.current, null);
});
test("P23 actual keyboard preserves browser shortcuts, rejects repeats and gates untaught solvers", async () => {
  const h = await handlerHarness(),
    key = (key, extra = {}) => ({ key, repeat: false, preventDefault() {}, ...extra });
  const before = h.sceneRef.current;
  for (const event of [key("Tab"), key("n", { ctrlKey: true }), key(" ", { repeat: true })])
    h.onKeyDown(event);
  assert.equal(h.sceneRef.current, before);
  h.onKeyDown(key("n"));
  assert.deepEqual(
    h.sceneRef.current.race.lanes.map((lane) => lane.forceEvaluations),
    [1, 2, 4],
  );
  h.onKeyDown(key("2"));
  assert.equal(h.sceneRef.current.race.stepCount, 0);
  assert.equal(h.sceneRef.current.kinds[1], "rk4");
  const early = await handlerHarness(2);
  early.onKeyDown(key("2"));
  assert.equal(early.sceneRef.current.kinds[1], "verlet");
  early.onKeyDown(key("n"));
  assert.deepEqual(
    early.sceneRef.current.race.lanes.map((lane) => lane.forceEvaluations),
    [1, 0, 0],
  );
});
test("P23 actual lifecycle/RAF cancels jobs and capture, caps stalled frames and ignores disposed callbacks", async () => {
  const h = await handlerHarness(),
    listeners = new Map();
  const window = {
    addEventListener: (key, fn) => listeners.set("w:" + key, fn),
    removeEventListener: (key) => listeners.delete("w:" + key),
  };
  const document = {
    hidden: true,
    addEventListener: (key, fn) => listeners.set("d:" + key, fn),
    removeEventListener: (key) => listeners.delete("d:" + key),
  };
  const cleanup = (
    await componentEffect("integrator-race-lab.tsx", "window.addEventListener", {
      ...h,
      window,
      document,
    })
  )();
  h.onPointerDown(h.event(810, 140));
  h.commit({ ...h.sceneRef.current, paused: false });
  listeners.get("w:blur")();
  assert.equal(h.drag.current, null);
  assert.equal(h.sceneRef.current.paused, true);
  cleanup();
  assert.equal(listeners.size, 0);
  let callback,
    id = 0,
    cancelled = 0;
  h.commit({ ...h.sceneRef.current, paused: false });
  const stop = (
    await componentEffect("integrator-race-lab.tsx", "const animate", {
      ...h,
      active: true,
      performance: { now: () => 0 },
      requestAnimationFrame: (cb) => {
        callback = cb;
        return ++id;
      },
      cancelAnimationFrame: (value) => (cancelled = value),
      advanceIntegratorBenchmark: benchmark.advanceIntegratorBenchmark,
    })
  )();
  callback(2000);
  near(h.sceneRef.current.elapsed, 0.1);
  assert.ok(h.sceneRef.current.droppedTime > 1.8);
  stop();
  assert.equal(cancelled, id);
  const after = h.sceneRef.current;
  callback(3000);
  assert.equal(h.sceneRef.current, after);
});

test("P23 moving focus to its pause button does not pause twice and restart motion", async () => {
  const h = await handlerHarness();
  const blur = await componentCallback("integrator-race-lab.tsx", "onCanvasBlur", h);
  const togglePause = await componentCallback("integrator-race-lab.tsx", "togglePause", h);
  h.commit({ ...h.sceneRef.current, paused: false });
  blur({ currentTarget: { parentElement: { contains: () => true } }, relatedTarget: {} });
  assert.equal(
    h.sceneRef.current.paused,
    false,
    "internal focus move preserves the pre-click state",
  );
  togglePause();
  assert.equal(h.sceneRef.current.paused, true);
  h.commit({ ...h.sceneRef.current, paused: false });
  blur({ currentTarget: { parentElement: { contains: () => false } }, relatedTarget: null });
  assert.equal(h.sceneRef.current.paused, true, "leaving the entire lab still pauses");
});

test("P23 actual view maps letterboxed CSS coordinates once and renders selected solvers in clean mode", async () => {
  const env = { ...math, ...model };
  for (const name of [
    "layout",
    "integratorPositionToScreen",
    "integratorScreenToPosition",
    "integratorLaneY",
    "integratorPointFromEvent",
    "integratorDisplayedPosition",
    "integratorHitMass",
  ])
    env[name] = await componentCallback("integrator-race-view.ts", name, env);
  const size = { width: 880, height: 700, dpr: 2 };
  const event = {
    clientX: 100 + 810 * 0.4,
    clientY: 50 + (22 + 140 * 0.8) * 0.5,
    currentTarget: {
      getBoundingClientRect: () => ({ left: 100, top: 50, width: 440, height: 350 }),
    },
  };
  const point = env.integratorPointFromEvent(event, size);
  near(point.x, 810);
  near(point.y, 140);
  assert.equal(env.integratorHitMass(model.makeIntegratorScene(), point), 810);
  const text = [],
    lines = [],
    fills = [];
  env.setupCanvas = () => {};
  env.drawLine = (...args) => lines.push(args);
  env.drawPhaseInspector = () => {};
  env.COLORS = ["red", "green", "purple"];
  env.GRID = "grid";
  env.EXACT = "white";
  for (const name of [
    "spring",
    "historyValue",
    "integratorGraphScale",
    "drawHistory",
    "drawIntegratorRace",
  ])
    env[name] = await componentCallback("integrator-race-view.ts", name, env);
  const ctx = new Proxy(
    {},
    {
      get: (target, key) =>
        target[key] ??
        (key === "fillText"
          ? (s) => text.push(s)
          : key === "fillRect"
            ? (...args) => fills.push(args)
            : () => {}),
      set: (target, key, value) => {
        target[key] = value;
        return true;
      },
    },
  );
  let scene = model.editIntegratorLane(model.makeIntegratorScene(), 0, "rk4");
  scene = { ...model.stepIntegratorScene(scene), debug: false, graph: "error" };
  env.drawIntegratorRace(ctx, size, scene);
  assert.ok(text.some((s) => s === "Làn 1: RK4"));
  assert.ok(text.some((s) => s.includes("Sai số trạng thái, m")));
  assert.ok(
    lines.length > 3 && fills.length >= 6,
    "clean mode retains three springs/masses and graph",
  );
  text.length = 0;
  env.drawIntegratorRace(ctx, size, model.makeIntegratorScene(2));
  assert.ok(text.some((s) => s === "Làn 1: Explicit Euler"));
  assert.ok(text.some((s) => s === "Làn 2: nghiệm chính xác, chưa có solver"));
});
