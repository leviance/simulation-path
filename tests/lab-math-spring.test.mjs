import assert from "node:assert/strict";
import test from "node:test";
import {
  accumulateSpringForces,
  estimateSpringReleaseVelocity,
  integrateSpringParticle,
  makeSpringChain,
  measureSpringChain,
  nearestDynamicSpringParticle,
  planSpringFixedSteps,
  sampleDampedSpring,
  sampleElasticSpring,
  springAdd,
  springLength,
  springStabilityIndex,
  stepSpringChain,
} from "../lib/labs/spring-chain.ts";

const nearlyEqual = (first, second, tolerance = 1e-9) => Math.abs(first - second) <= tolerance;

test("Spring scene preserves topology, rest length and fixed anchor", () => {
  const chain = makeSpringChain(18, { x: 0, y: 3.6 }, 0.42, 0.25, 0.1, 120, 1.6);
  assert.equal(chain.particles.length, 18);
  assert.equal(chain.springs.length, 17);
  assert.equal(chain.particles[0].inverseMass, 0);
  assert.equal(chain.particles[1].inverseMass, 4);
  for (const spring of chain.springs) {
    const sample = sampleElasticSpring(chain, spring);
    assert.equal(sample.valid, true);
    assert.ok(nearlyEqual(sample.stretch, 0));
  }
  const stepped = stepSpringChain(chain, {
    deltaSeconds: 1 / 240,
    gravity: { x: 0, y: -9.81 },
    gravityEnabled: true,
    dampingEnabled: true,
  });
  assert.deepEqual(stepped.particles[0].position, { x: 0, y: 3.6 });
  assert.deepEqual(stepped.particles[0].velocity, { x: 0, y: 0 });
});

test("Spring Hooke, force pairs and axial damping match the C++ formulas", () => {
  const chain = makeSpringChain(2, { x: 0, y: 0 }, 1, 2, 0.1, 100, 4);
  chain.particles[1].position = { x: 1.2, y: 0 };
  let sample = sampleElasticSpring(chain, chain.springs[0]);
  assert.ok(nearlyEqual(sample.stretch, 0.2));
  assert.ok(nearlyEqual(sample.forceOnFirst.x, 20));

  chain.particles[0].inverseMass = 0.5;
  accumulateSpringForces(chain, { x: 0, y: 0 }, false, false);
  assert.ok(nearlyEqual(springAdd(chain.particles[0].force, chain.particles[1].force).x, 0));

  chain.particles[1].position = { x: 1, y: 0 };
  chain.particles[1].velocity = { x: 2, y: 3 };
  sample = sampleDampedSpring(chain, chain.springs[0]);
  assert.ok(nearlyEqual(sample.relativeSpeed, 2));
  assert.ok(nearlyEqual(sample.forceOnFirst.x, 8));
  assert.ok(nearlyEqual(sample.forceOnFirst.y, 0));
});

test("Spring integration, fixed steps and drag helpers stay deterministic", () => {
  const particle = {
    position: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    force: { x: 4, y: 0 },
    inverseMass: 0.5,
    radius: 0.1,
  };
  integrateSpringParticle(particle, 0.5);
  assert.ok(nearlyEqual(particle.velocity.x, 1));
  assert.ok(nearlyEqual(particle.position.x, 0.5));

  const countSteps = (frames) => {
    let remainder = 0;
    let steps = 0;
    for (const frame of frames) {
      const plan = planSpringFixedSteps(remainder, frame, 1 / 120, 16, 0.25);
      remainder = plan.remainder;
      steps += plan.steps;
    }
    return steps;
  };
  assert.equal(countSteps(Array(120).fill(1 / 120)), 120);
  assert.equal(countSteps(Array(30).fill(1 / 30)), 120);

  const chain = makeSpringChain(5, { x: 0, y: 2 }, 0.5, 0.25, 0.1, 120, 1.6);
  assert.equal(nearestDynamicSpringParticle(chain, chain.particles[3].position, 0.2), 3);
  assert.equal(nearestDynamicSpringParticle(chain, chain.particles[0].position, 0.05), -1);
  const release = estimateSpringReleaseVelocity({ x: 0, y: 0 }, { x: 4, y: 3 }, 0.01, 6);
  assert.ok(springLength(release) <= 6 + 1e-12);
});

test("Spring stability metric and long damped stress run remain finite", () => {
  assert.ok(nearlyEqual(springStabilityIndex(100, 4, 0.02), 0.1));
  let chain = makeSpringChain(18, { x: 0, y: 3.6 }, 0.42, 0.25, 0.1, 120, 1.6);
  chain.particles[10].position.x += 1.2;
  const settings = {
    deltaSeconds: 1 / 240,
    gravity: { x: 0, y: -9.81 },
    gravityEnabled: true,
    dampingEnabled: true,
  };
  for (let step = 0; step < 4800; step += 1) chain = stepSpringChain(chain, settings);
  const metrics = measureSpringChain(chain, settings.gravity, true);
  assert.equal(metrics.finite, true);
  assert.ok(metrics.anchorError <= 1e-12);
  assert.ok(metrics.maximumStretch < 0.4);
  assert.ok(metrics.maximumSpeed < 4);
});

import {
  makeSpringScene,
  editSpringScene,
  presetSpringScene,
  stepSpringScene,
  advanceSpringFrame,
  requestSpringFast,
  stopSpringScene,
  beginSpringDrag,
  moveSpringDrag,
  endSpringDrag,
  cancelSpringDrag,
  nudgeSpringNode,
  SPRING_STEPS,
} from "../lib/labs/spring-scene.ts";
import {
  validSpringChain,
  cloneSpringChain,
  trySpringStep,
  totalSpringMechanicalEnergy,
  springSubtract,
  springDot,
  finiteSpringVector,
} from "../lib/labs/spring-chain.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";

test("P25 all four product sizes finish a bounded 20-second job with a complete 60-Hz energy trace", () => {
  for (const n of [20, 32, 64, 100]) {
    let s = editSpringScene(makeSpringScene(8), "count", n);
    assert.equal(s.chain.particles.length, n);
    assert.equal(s.chain.springs.length, n - 1);
    s = requestSpringFast(s);
    let frames = 0;
    while (s.fastRemaining > 0 && frames++ < 1000) {
      s = advanceSpringFrame(s, 0.016);
      assert.ok(s.substeps <= 32);
    }
    assert.equal(s.steps, 9600);
    assert.equal(s.elapsed, 20);
    assert.equal(s.fastRemaining, 0);
    assert.equal(s.metrics.finite, true);
    assert.equal(s.metrics.anchorError, 0);
    assert.equal(s.history.length, 1201);
    assert.equal(s.history[0].time, 0);
    assert.equal(s.history.at(-1).time, 20);
  }
});
test("P25 rejects invalid/oversized topology and nonfinite settings before mutation or allocation", () => {
  for (const n of [NaN, Infinity, 101, 1e9, 2.5, -1])
    assert.equal(makeSpringChain(n, { x: 0, y: 0 }, 0.2, 1, 0.1, 120, 0.24).particles.length, 0);
  for (const bad of [NaN, Infinity])
    assert.equal(makeSpringChain(32, { x: 0, y: 0 }, 0.2, bad, 0.1, 120, 0.24).particles.length, 0);
  const source = makeSpringChain(4, { x: 0, y: 0 }, 0.2, 1, 0.1, 120, 0.24);
  const broken = cloneSpringChain(source);
  broken.springs[1] = { ...broken.springs[0] };
  assert.equal(validSpringChain(broken), false);
  const settings = {
    deltaSeconds: NaN,
    gravity: { x: 0, y: -9.81 },
    gravityEnabled: true,
    dampingEnabled: true,
  };
  const saved = structuredClone(source),
    failed = trySpringStep(source, settings);
  assert.equal(failed.accepted, false);
  assert.strictEqual(failed.chain, source);
  assert.deepEqual(source, saved);
  assert.equal(planSpringFixedSteps(1, 0.05, 1e-300, 32, 0.05).steps, 0);
  assert.equal(planSpringFixedSteps(0, 0.05, 0.01, Infinity, 0.05).steps, 0);
  assert.deepEqual(estimateSpringReleaseVelocity({ x: NaN, y: 0 }, { x: 0, y: 0 }, 0.01, 6), {
    x: 0,
    y: 0,
  });
  const s = makeSpringScene(8);
  assert.strictEqual(editSpringScene(s, "count", 18), s);
  assert.strictEqual(editSpringScene(s, "dtIndex", 99), s);
  assert.strictEqual(editSpringScene(s, "mass", Infinity), s);
});
test("P25 uses an analytic oscillator and hanging-equilibrium oracles, not only a finite-state test", () => {
  let chain = makeSpringChain(2, { x: 0, y: 0 }, 1, 1, 0.1, 100, 4);
  chain.particles[1].position = { x: 1.2, y: 0 };
  chain.particles[1].velocity = { x: 2, y: 3 };
  const elastic = sampleElasticSpring(chain, chain.springs[0]),
    damped = sampleDampedSpring(chain, chain.springs[0]);
  const dampingForce = springSubtract(damped.forceOnFirst, elastic.forceOnFirst);
  assert.ok(
    nearlyEqual(
      springDot(
        dampingForce,
        springSubtract(chain.particles[0].velocity, chain.particles[1].velocity),
      ),
      -16,
    ),
  );
  chain.particles[1].velocity = { x: 0, y: 0 };
  for (let i = 0; i < 960; i++)
    chain = stepSpringChain(chain, {
      deltaSeconds: 1 / 1920,
      gravity: { x: 0, y: 0 },
      gravityEnabled: false,
      dampingEnabled: false,
    });
  assert.ok(Math.abs(chain.particles[1].position.x - (1 + 0.2 * Math.cos(5))) < 0.001);
  assert.ok(Math.abs(chain.particles[1].velocity.x - -2 * Math.sin(5)) < 0.005);
  const equilibrium = makeSpringChain(4, { x: 0, y: 0 }, 0.5, 0.25, 0.1, 120, 0.24);
  for (let i = 1; i < 4; i++)
    equilibrium.particles[i].position.y =
      equilibrium.particles[i - 1].position.y - 0.5 - (0.25 * (4 - i) * 9.81) / 120;
  assert.ok(accumulateSpringForces(equilibrium, { x: 0, y: -9.81 }, true, true));
  for (let i = 1; i < 4; i++) assert.ok(springLength(equilibrium.particles[i].force) < 1e-11);
  assert.ok(nearlyEqual(equilibrium.particles[0].force.y, -3 * 0.25 * 9.81));
  const coincident = cloneSpringChain(equilibrium);
  coincident.particles[1].position = { ...coincident.particles[0].position };
  assert.equal(sampleElasticSpring(coincident, coincident.springs[0]).valid, false);
  assert.equal(measureSpringChain(coincident, { x: 0, y: 0 }, false).finite, true);
  assert.equal(
    trySpringStep(coincident, {
      deltaSeconds: 0.01,
      gravity: { x: 0, y: 0 },
      gravityEnabled: false,
      dampingEnabled: false,
    }).accepted,
    false,
  );
});
test("P25 local force accumulation propagates a perturbation only through neighboring springs", () => {
  let chain = makeSpringChain(32, { x: 0, y: 0 }, 0.22, 0.04, 0.1, 120, 0);
  chain.particles[16].position.x = 0.35;
  const config = {
    deltaSeconds: 1 / 480,
    gravity: { x: 0, y: 0 },
    gravityEnabled: false,
    dampingEnabled: false,
  };
  chain = stepSpringChain(chain, config);
  assert.equal(chain.particles[18].velocity.x, 0);
  assert.notEqual(chain.particles[17].velocity.x, 0);
  chain = stepSpringChain(chain, config);
  assert.notEqual(chain.particles[18].velocity.x, 0);
  assert.equal(chain.particles[31].velocity.x, 0);
});
test("P25 undamped drift converges with dt while axial damping dissipates mechanical energy", () => {
  const errors = [];
  for (const dtIndex of [1, 0]) {
    let s = editSpringScene(presetSpringScene(8, 1), "dtIndex", dtIndex),
      error = 0;
    const E0 = totalSpringMechanicalEnergy(s.metrics),
      steps = Math.round(2 / SPRING_STEPS[dtIndex]);
    for (let i = 0; i < steps; i++) {
      s = stepSpringScene(s);
      error = Math.max(error, Math.abs(totalSpringMechanicalEnergy(s.metrics) - E0));
    }
    errors.push(error);
    assert.ok(error / E0 < (dtIndex === 1 ? 0.09 : 0.05));
  }
  assert.ok(errors[1] < 0.6 * errors[0]);
  let s = presetSpringScene(8, 2),
    E0 = totalSpringMechanicalEnergy(s.metrics);
  for (let i = 0; i < 4800; i++) s = stepSpringScene(s);
  assert.ok(totalSpringMechanicalEnergy(s.metrics) < 0.15 * E0);
});
test("P25 frame partitions, trace ordering, invalid dt and unstable guard keep accepted time explicit", () => {
  const run = (frames) => {
    let s = { ...makeSpringScene(4), paused: false };
    for (const frame of frames) s = advanceSpringFrame(s, frame);
    return s;
  };
  const a = run(Array(120).fill(1 / 120)),
    b = run(Array(30).fill(1 / 30));
  assert.equal(a.steps, 480);
  assert.equal(b.steps, 480);
  assert.deepEqual(a.chain, b.chain);
  const one = stepSpringScene(makeSpringScene(4)),
    trace = one.trace,
    dt = 1 / 480;
  assert.ok(nearlyEqual(trace.velocityAfter.x, trace.velocityBefore.x + trace.acceleration.x * dt));
  assert.ok(
    nearlyEqual(trace.positionAfter.x, trace.positionBefore.x + trace.velocityAfter.x * dt),
  );
  const guarded = advanceSpringFrame({ ...makeSpringScene(4), paused: false }, 2);
  assert.equal(guarded.substeps, 24);
  assert.ok(nearlyEqual(guarded.droppedTime, 1.95));
  let bad = presetSpringScene(8, 3),
    attempts = 0;
  while (!bad.message && attempts++ < 20) bad = stepSpringScene(bad);
  assert.ok(bad.message.includes("đã dừng"));
  assert.equal(bad.steps, 1);
  assert.equal(bad.paused, true);
  const unchanged = stepSpringScene({ ...makeSpringScene(8), dtIndex: 99 });
  assert.equal(unchanged.steps, 0);
  assert.ok(unchanged.message);
});
test("P25 kinematic grab preserves offset, uses final sample and rebases external interventions", () => {
  const s = makeSpringScene(8),
    original = { ...s.chain.particles[16].position };
  let drag = beginSpringDrag(s, { x: original.x + 0.02, y: original.y + 0.01 }, 0.1);
  assert.deepEqual(drag.chain.particles[16].position, original);
  drag = moveSpringDrag(drag, { x: original.x + 0.32, y: original.y + 0.01 }, 0.02);
  assert.ok(nearlyEqual(drag.chain.particles[16].position.x, original.x + 0.3));
  assert.ok(springLength(drag.drag.releaseVelocity) <= 6 + 1e-12);
  const moving = advanceSpringFrame({ ...drag, paused: false }, 0.02);
  assert.deepEqual(moving.chain.particles[16].position, moving.drag.target);
  drag = moveSpringDrag(drag, { x: original.x + 0.32, y: original.y + 0.01 }, 0.5);
  assert.equal(springLength(drag.drag.releaseVelocity), 0);
  const released = endSpringDrag(drag);
  assert.equal(released.elapsed, 0);
  assert.equal(released.history.length, 1);
  assert.equal(released.drag, null);
  assert.strictEqual(endSpringDrag(released), released);
  const cancelled = cancelSpringDrag(moving);
  assert.equal(cancelled.drag, null);
  assert.equal(cancelled.paused, true);
  assert.deepEqual(cancelled.chain.particles[16].velocity, { x: 0, y: 0 });
  assert.equal(beginSpringDrag(s, s.chain.particles[0].position, 0.05), null);
  const nudge = nudgeSpringNode({ ...s, elapsed: 2, steps: 960 }, { x: 0.08, y: 0 });
  assert.equal(nudge.steps, 0);
  assert.equal(nudge.history[0].time, 0);
});
test("P25 staged modes do not advance early fixtures or expose later algorithms", () => {
  const first = makeSpringScene(1);
  assert.equal(first.chain.particles.length, 32);
  assert.equal(first.chain.springs.length, 31);
  assert.strictEqual(stepSpringScene(first), first);
  assert.strictEqual(editSpringScene(first, "count", 100), first);
  const pair = makeSpringScene(2);
  assert.equal(pair.chain.particles.length, 2);
  assert.equal(pair.selected, 1);
  assert.ok(nearlyEqual(sampleElasticSpring(pair.chain, pair.chain.springs[0]).forceOnFirst.x, 24));
  for (const stage of [1, 2, 3, 4, 5, 6, 7]) assert.equal(makeSpringScene(stage).history.length, 0);
  const job = requestSpringFast(makeSpringScene(8)),
    firstFrame = advanceSpringFrame(job, 0);
  assert.equal(firstFrame.steps, 32);
  assert.equal(stopSpringScene(firstFrame).fastRemaining, 0);
});
async function actualSpringView() {
  const file = "spring-view.ts";
  const springWorldView = await componentCallback(file, "springWorldView", {});
  const springScreenToWorld = await componentCallback(file, "springScreenToWorld", {});
  const springWorldToScreen = await componentCallback(file, "springWorldToScreen", {});
  const springBoardLayout = await componentCallback(file, "springBoardLayout", {});
  const springEventPoint = await componentCallback(file, "springEventPoint", {
    springBoardLayout,
    finiteSpringVector,
  });
  const springInsideViewport = await componentCallback(file, "springInsideViewport", {});
  const springBoundedPointer = await componentCallback(file, "springBoundedPointer", {
    springScreenToWorld,
    springWorldView,
  });
  return {
    springWorldView,
    springScreenToWorld,
    springWorldToScreen,
    springBoardLayout,
    springEventPoint,
    springInsideViewport,
    springBoundedPointer,
  };
}
async function springHandlerHarness() {
  const view = await actualSpringView(),
    captures = new Set(),
    sceneRef = { current: makeSpringScene(8) },
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
    focus: () => {},
  };
  const size = { width: 1100, height: 820, dpr: 2 };
  const env = {
    ...view,
    stage: 8,
    canvasRef: { current: canvas },
    sceneRef,
    ownerRef,
    size,
    setScene: () => {},
    clearCapture: null,
    commit: null,
    stop: null,
    makeSpringScene,
    editSpringScene,
    presetSpringScene,
    stopSpringScene,
    stepSpringScene,
    requestSpringFast,
    advanceSpringFrame,
    beginSpringDrag,
    moveSpringDrag,
    endSpringDrag,
    cancelSpringDrag,
    nudgeSpringNode,
    reducedMotion: false,
  };
  env.clearCapture = await componentCallback("spring-chain-lab.tsx", "clearCapture", env);
  env.commit = await componentCallback("spring-chain-lab.tsx", "commit", env);
  env.stop = await componentCallback("spring-chain-lab.tsx", "stop", env);
  for (const name of ["reset", "preset", "step", "togglePause", "fast", "toggleDebug"])
    env[name] = await componentCallback("spring-chain-lab.tsx", name, env);
  const callbacks = {};
  for (const name of [
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onPointerCancel",
    "onLostPointerCapture",
    "onKeyDown",
  ])
    callbacks[name] = await componentCallback("spring-chain-lab.tsx", name, env);
  const event = (point, extra = {}) => ({
    currentTarget: canvas,
    clientX: 10 + point.x / 2,
    clientY: 20 + point.y / 2,
    pointerId: 1,
    isPrimary: true,
    button: 0,
    buttons: 1,
    timeStamp: 100,
    preventDefault() {
      this.prevented = true;
    },
    ...extra,
  });
  const pointOf = (index) =>
    view.springWorldToScreen(
      sceneRef.current.chain.particles[index].position,
      view.springWorldView(sceneRef.current),
    );
  return {
    env,
    callbacks,
    event,
    pointOf,
    captures,
    sceneRef,
    ownerRef,
    view,
    setThrow: (value) => (throwCapture = value),
  };
}
test("P25 actual pointer callbacks own capture, keep grab offset and accept a final up without motion", async () => {
  const h = await springHandlerHarness(),
    { callbacks: c, sceneRef: s, event: e } = h,
    point = h.pointOf(16);
  const original = structuredClone(s.current.chain.particles[16].position);
  h.setThrow(true);
  c.onPointerDown(e(point));
  assert.equal(h.ownerRef.current, null);
  assert.equal(s.current.drag, null);
  h.setThrow(false);
  c.onPointerDown(e({ x: point.x + 1, y: point.y }));
  assert.equal(h.ownerRef.current.id, 1);
  assert.ok(h.captures.has(1));
  assert.deepEqual(s.current.chain.particles[16].position, original);
  const saved = s.current;
  c.onPointerMove(e({ x: point.x + 30, y: point.y }, { pointerId: 2, timeStamp: 110 }));
  assert.strictEqual(s.current, saved);
  c.onPointerUp(e({ x: point.x + 31, y: point.y }, { timeStamp: 120, buttons: 0 }));
  assert.equal(h.ownerRef.current, null);
  assert.equal(h.captures.size, 0);
  assert.equal(s.current.drag, null);
  const worldShift = 30 / h.view.springWorldView(saved).scale;
  assert.ok(nearlyEqual(s.current.chain.particles[16].position.x, original.x + worldShift));
  assert.ok(springLength(s.current.chain.particles[16].velocity) <= 6 + 1e-12);
  const released = s.current;
  c.onPointerUp(e(point, { timeStamp: 130, buttons: 0 }));
  assert.strictEqual(s.current, released);
});
test("P25 actual cancelled/lost-button/reset gestures cannot apply a late release", async () => {
  for (const method of ["onPointerCancel", "onLostPointerCapture", "buttons", "reset"]) {
    const h = await springHandlerHarness(),
      p = h.pointOf(16),
      c = h.callbacks,
      e = h.event;
    c.onPointerDown(e(p));
    c.onPointerMove(e({ x: p.x + 20, y: p.y }, { timeStamp: 110 }));
    if (method === "buttons") c.onPointerMove(e(p, { buttons: 0, timeStamp: 120 }));
    else if (method === "reset") h.env.reset();
    else c[method](e(p, { timeStamp: 120 }));
    assert.equal(h.ownerRef.current, null);
    assert.equal(h.captures.size, 0);
    const saved = h.sceneRef.current;
    c.onPointerUp(e({ x: p.x + 100, y: p.y }, { timeStamp: 130, buttons: 0 }));
    assert.strictEqual(h.sceneRef.current, saved);
  }
});
test("P25 actual keyboard and internal focus do not double-toggle pause or trap modifiers", async () => {
  const h = await springHandlerHarness(),
    key = (value, extra = {}) => ({
      key: value,
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
    inside = new Node();
  const onBlur = await componentCallback("spring-chain-lab.tsx", "onBlur", {
    ...h.env,
    Node,
    containerRef: { current: { contains: (target) => target === inside } },
  });
  h.sceneRef.current = { ...h.sceneRef.current, paused: false };
  onBlur({ relatedTarget: inside });
  assert.equal(h.sceneRef.current.paused, false);
  h.env.togglePause();
  assert.equal(h.sceneRef.current.paused, true);
  const tab = key("Tab");
  h.callbacks.onKeyDown(tab);
  assert.equal(tab.prevented, undefined);
  const old = h.sceneRef.current;
  h.callbacks.onKeyDown(key("r", { ctrlKey: true }));
  assert.strictEqual(h.sceneRef.current, old);
  h.callbacks.onKeyDown(key(" ", { repeat: true }));
  assert.strictEqual(h.sceneRef.current, old);
  h.callbacks.onKeyDown(key("ArrowRight"));
  assert.ok(h.sceneRef.current.message.includes("bàn phím"));
  const reduced = await componentCallback("spring-chain-lab.tsx", "togglePause", {
    ...h.env,
    reducedMotion: true,
  });
  reduced();
  assert.equal(h.sceneRef.current.paused, true);
});
test("P25 actual lifecycle/RAF disposes callbacks and bounds even a fast job", async () => {
  const h = await springHandlerHarness(),
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
  const effect = await componentEffect("spring-chain-lab.tsx", "requestAnimationFrame", {
    ...h.env,
    window,
    document,
    requestAnimationFrame: (f) => {
      frames.set(++id, f);
      return id;
    },
    cancelAnimationFrame: (n) => frames.delete(n),
  });
  h.sceneRef.current = requestSpringFast(h.sceneRef.current);
  const dispose = effect(),
    tick = frames.get(1);
  tick(0);
  assert.equal(h.sceneRef.current.steps, 32);
  windows.get("blur")();
  assert.equal(h.sceneRef.current.fastRemaining, 0);
  assert.equal(h.sceneRef.current.paused, true);
  document.hidden = true;
  docs.get("visibilitychange")();
  dispose();
  const before = id;
  tick(100000);
  assert.equal(id, before);
  assert.equal(windows.size, 0);
  assert.equal(docs.size, 0);
});
test("P25 actual graph uses energy units/time, while DPR input maps only CSS once and zero force has no arrow", async () => {
  const view = await actualSpringView(),
    s = makeSpringScene(8),
    p = { x: 0.4, y: -2.2 };
  const screen = view.springWorldToScreen(p, view.springWorldView(s));
  const roundTrip = view.springScreenToWorld(screen, view.springWorldView(s));
  assert.ok(nearlyEqual(roundTrip.x, p.x, 1e-12) && nearlyEqual(roundTrip.y, p.y, 1e-12));
  const fake = { getBoundingClientRect: () => ({ left: 10, top: 20, width: 550, height: 410 }) };
  const event = { currentTarget: fake, clientX: 10 + screen.x / 2, clientY: 20 + screen.y / 2 };
  const a = view.springEventPoint(event, { width: 1100, height: 820, dpr: 1 }),
    b = view.springEventPoint(event, { width: 1100, height: 820, dpr: 3 });
  assert.deepEqual(a, b);
  const segments = [],
    texts = [],
    drawLine = (ctx, from, to, color) => segments.push({ from, to, color });
  const render = await componentCallback("spring-view.ts", "drawSpringEnergy", { drawLine });
  const ctx = { strokeRect() {}, fillText: (t) => texts.push(t) };
  render(ctx, {
    ...s,
    history: [
      { time: 0, kinetic: 1, elastic: 0, gravity: 0, total: 1 },
      { time: 1, kinetic: 0, elastic: 3, gravity: -1, total: 2 },
    ],
  });
  const white = segments.find((x) => x.color === "#ffffff");
  assert.equal(white.to.x, 1060);
  assert.equal(white.to.y, 497.5);
  assert.ok(texts.some((t) => t.includes("J")));
  const arrow = await componentCallback("spring-view.ts", "arrow", {
    drawLine,
    springLength,
    springSubtract,
  });
  const before = segments.length;
  arrow(ctx, { x: 2, y: 2 }, { x: 2, y: 2 }, "red");
  assert.equal(segments.length, before);
});
