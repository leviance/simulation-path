import assert from "node:assert/strict";
import test from "node:test";
import { componentCallback, canvasCallback } from "./lab-handler-support.mjs";
import {
  advanceProjectileFlight,
  createProjectileFlight,
  projectileDefaults,
  projectileMeanError,
  projectileView,
  stepProjectileFlight,
} from "../lib/labs/projectile-flight.ts";
import {
  PROJECTILE_GRAVITY,
  analyticProjectilePosition,
  compareProjectileState,
  explicitEulerProjectileStep,
  explicitEulerProjectileStepToGround,
  launchProjectileState,
  planProjectileFixedSteps,
  projectileAimFromScreenDrag,
  projectileAngleFromVelocity,
  projectileScreenToWorld,
  projectileSpeedFromVelocity,
  projectileVelocityFromPolar,
  projectileWorldToScreen,
  sampleAnalyticProjectile,
  solveProjectileGroundImpactTime,
} from "../lib/labs/projectile.ts";

function integrateFor(launch, duration, step) {
  let state = launchProjectileState(launch);
  const count = Math.round(duration / step);
  for (let index = 0; index < count; index += 1) {
    state = explicitEulerProjectileStep(state, launch.acceleration, step);
  }
  return state;
}

test("Projectile Canvas math preserves units, coordinate conversion and analytic motion", () => {
  const view = { screenOrigin: { x: 80, y: 620 }, pixelsPerMeter: 8 };
  const world = { x: 12.5, y: 7.25 };
  const screen = projectileWorldToScreen(world, view);
  assert.deepEqual(projectileScreenToWorld(screen, view), world);

  const aim = projectileAimFromScreenDrag(
    { x: 100, y: 300 },
    { x: 200, y: 200 },
    5,
    4,
    32,
    (5 * Math.PI) / 180,
    (85 * Math.PI) / 180,
  );
  assert.equal(aim.valid, true);
  assert.ok(Math.abs(aim.velocity.x - 20) < 1e-9);
  assert.ok(Math.abs(aim.velocity.y - 20) < 1e-9);
  assert.equal(
    projectileAimFromScreenDrag({ x: 1, y: 1 }, { x: 1, y: 1 }, 5, 4, 32, 0, Math.PI / 2).valid,
    false,
  );

  const velocity = projectileVelocityFromPolar(30, Math.PI / 3);
  assert.ok(Math.abs(projectileSpeedFromVelocity(velocity) - 30) < 1e-9);
  assert.ok(Math.abs(projectileAngleFromVelocity(velocity) - Math.PI / 3) < 1e-9);

  const launch = {
    position: { x: 0, y: 1.2 },
    velocity: { x: 10, y: 20 },
    acceleration: { x: 0, y: PROJECTILE_GRAVITY },
  };
  const atTwo = analyticProjectilePosition(launch, 2);
  assert.ok(Math.abs(atTwo.x - 20) < 1e-9);
  assert.ok(Math.abs(atTwo.y - 21.58) < 1e-9);
  const samples = sampleAnalyticProjectile(launch, 2, 10);
  assert.equal(samples.length, 11);
  assert.deepEqual(samples[0], launch.position);
  assert.deepEqual(samples.at(-1), atTwo);
});

test("Projectile accumulator and impact math match the C++ invariants", () => {
  const countSteps = (frameTimes) => {
    let accumulator = 0;
    let total = 0;
    for (const frameTime of frameTimes) {
      const plan = planProjectileFixedSteps(accumulator, frameTime, 1 / 60, 16, 0.25);
      accumulator = plan.remainder;
      total += plan.steps;
    }
    return total;
  };
  assert.equal(countSteps(Array(120).fill(1 / 120)), 60);
  assert.equal(countSteps(Array(30).fill(1 / 30)), 60);
  const guarded = planProjectileFixedSteps(0, 1, 1 / 60, 4, 0.1);
  assert.equal(guarded.steps, 4);
  assert.ok(guarded.droppedTime > 0.9);

  const launch = {
    position: { x: 0, y: 1.2 },
    velocity: { x: 10, y: 20 },
    acceleration: { x: 0, y: PROJECTILE_GRAVITY },
  };
  const impactTime = solveProjectileGroundImpactTime(launch, 0);
  assert.ok(impactTime && impactTime > 4);
  assert.ok(Math.abs(analyticProjectilePosition(launch, impactTime).y) < 1e-8);

  const crossing = {
    position: { x: 3, y: 0.1 },
    velocity: { x: 1, y: -2 },
    elapsed: 0.5,
    active: true,
  };
  const impact = explicitEulerProjectileStepToGround(crossing, { x: 0, y: 0 }, 0.1, 0);
  assert.equal(impact.impacted, true);
  assert.ok(Math.abs(impact.stepFraction - 0.5) < 1e-9);
  assert.deepEqual(impact.state.position, { x: 3.05, y: 0 });
  assert.equal(impact.state.active, false);

  const coarse = compareProjectileState(launch, integrateFor(launch, 1, 1 / 15)).error;
  const medium = compareProjectileState(launch, integrateFor(launch, 1, 1 / 60)).error;
  const fine = compareProjectileState(launch, integrateFor(launch, 1, 1 / 240)).error;
  assert.ok(coarse > medium && medium > fine);
  assert.ok(Math.abs(coarse / medium - 4) < 1e-8);
});

test("P22 logged max and mean match independent arithmetic-series error through impact", () => {
  for (const gravity of [2.5, 9.81, 25])
    for (const fixedDt of [1 / 15, 1 / 60, 1 / 240]) {
      let shot = createProjectileFlight({ ...projectileDefaults(), gravity, fixedDt });
      for (let i = 0; i < 8000 && shot.projectile.active; i++) shot = stepProjectileFlight(shot);
      assert.equal(shot.projectile.active, false);
      assert.equal(shot.projectile.position.y, 0);
      assert.equal(shot.logLimitReached, false);
      let sum = 0,
        maximum = 0;
      for (const sample of shot.samples) {
        const n = Math.floor(sample.elapsed / fixedDt + 1e-8);
        const alpha = Math.max(0, sample.elapsed / fixedDt - n);
        const error = 0.5 * gravity * fixedDt ** 2 * (n + alpha ** 2);
        assert.ok(Math.abs(sample.error - error) < 1e-7);
        sum += error;
        maximum = Math.max(maximum, error);
      }
      assert.equal(shot.errors.count, shot.samples.length);
      assert.ok(Math.abs(shot.errors.maximum - maximum) < 1e-7);
      assert.ok(Math.abs(projectileMeanError(shot) - sum / shot.samples.length) < 1e-7);
      assert.equal(stepProjectileFlight(shot), shot, "no extra sample after impact");
    }
});

test("P22 fired configuration is immutable and frame partitions produce the same physics log", () => {
  const settings = projectileDefaults();
  const shot = createProjectileFlight(settings);
  settings.gravity = 25;
  settings.speed = 4;
  settings.fixedDt = 1 / 240;
  assert.equal(shot.launch.acceleration.y, -9.81);
  assert.equal(shot.fixedDt, 1 / 30);
  const run = (times) => times.reduce((state, t) => advanceProjectileFlight(state, t), shot);
  const a = run(Array(120).fill(1 / 120));
  const b = run(Array(20).fill(0.05));
  assert.deepEqual(a.samples, b.samples);
  assert.deepEqual(a.projectile, b.projectile);
  assert.ok(Math.abs(a.projectile.elapsed - 1) < 1e-9);
  for (const bad of [NaN, Infinity, -1, 0]) assert.equal(advanceProjectileFlight(a, bad), a);
  const slow = advanceProjectileFlight(shot, 5);
  assert.ok(slow.substeps <= 32);
  assert.ok(slow.droppedTime >= 4.9);
  const view = projectileView(600, 420, [
    shot.launch,
    createProjectileFlight({ ...settings, gravity: 2.5, speed: 32, angleDegrees: 85 }).launch,
  ]);
  assert.ok(view.pixelsPerMeter > 0 && Number.isFinite(view.pixelsPerMeter));
});

test("P22 actual fire callback preserves the previous shot even when React defers its updater", async () => {
  const saved = stepProjectileFlight(createProjectileFlight(projectileDefaults()));
  const current = { current: saved };
  const pending = [];
  let paused = false;
  const fire = await componentCallback("projectile-lab.tsx", "fire", {
    cancel() {},
    current,
    setHistory(fn) {
      pending.push(fn);
    },
    commit(next) {
      current.current = next;
    },
    createProjectileFlight,
    settings: { ...projectileDefaults(), gravity: 3 },
    reducedMotion: true,
    setPaused(value) {
      paused = value;
    },
  });
  fire();
  assert.equal(current.current.launch.acceleration.y, -3);
  const history = pending[0]([]);
  assert.equal(history[0], saved);
  assert.equal(history[0].launch.acceleration.y, -9.81);
  assert.equal(paused, true);
});

test("P22 actual pointer callbacks include final sample and ignore other pointers/capture failures", async () => {
  const drag = { current: null };
  let captured = false,
    capturing = false,
    focused = false,
    points = [];
  const canvas = {
    focus() {
      focused = true;
    },
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
  const canvasRef = { current: canvas };
  const setCapturing = (value) => {
    capturing = value;
  };
  const cancel = await componentCallback("projectile-lab.tsx", "cancel", {
    drag,
    canvasRef,
    setCapturing,
  });
  const aim = (event) => {
    if (drag.current?.id === event.pointerId) points.push(event.clientX);
  };
  const down = await componentCallback("projectile-lab.tsx", "pointerDown", {
    drag,
    cancel,
    aim,
    setCapturing,
    projectileWorldToScreen,
    preview: { position: { x: 0, y: 1.2 } },
    view: { screenOrigin: { x: 48, y: 350 }, pixelsPerMeter: 5 },
  });
  const move = await componentCallback("projectile-lab.tsx", "pointerMove", { drag, cancel, aim });
  const up = await componentCallback("projectile-lab.tsx", "pointerUp", { drag, cancel, aim });
  const event = {
    currentTarget: canvas,
    pointerId: 7,
    button: 0,
    buttons: 1,
    clientX: 100,
    preventDefault() {},
  };
  down(event);
  assert.ok(focused && captured && capturing);
  down({ ...event, pointerId: 8 });
  move({ ...event, pointerId: 8, clientX: 300 });
  up({ ...event, pointerId: 8, clientX: 300 });
  assert.equal(drag.current.id, 7);
  up({ ...event, buttons: 0, clientX: 200 });
  assert.deepEqual(points, [100, 200]);
  assert.equal(drag.current, null);
  assert.ok(!captured && !capturing);
  down(event);
  const onCancel = await canvasCallback("projectile-lab.tsx", "onPointerCancel", { drag, cancel });
  onCancel({ pointerId: 8 });
  assert.ok(drag.current);
  onCancel({ pointerId: 7 });
  assert.equal(drag.current, null);
  canvas.setPointerCapture = () => {
    throw Error("not active");
  };
  assert.doesNotThrow(() => down(event));
  assert.equal(drag.current, null);
});

test("P22 actual keyboard handler respects Tab, modifiers, stage gating and reduced motion", async () => {
  for (const stage of [1, 3, 4, 5, 7]) {
    let prevented = 0,
      fired = 0,
      stepped = 0,
      paused = true,
      settings = projectileDefaults();
    const key = await componentCallback("projectile-lab.tsx", "keyDown", {
      stage,
      cancel() {},
      reset() {},
      fire() {
        fired++;
      },
      step() {
        stepped++;
      },
      preset() {},
      setDebug() {},
      setPaused(fn) {
        paused = fn(paused);
      },
      setSettings(fn) {
        settings = fn(settings);
      },
      current: { current: { projectile: { active: true } } },
      reducedMotion: true,
    });
    const event = {
      key: "Tab",
      ctrlKey: false,
      altKey: false,
      metaKey: false,
      repeat: false,
      preventDefault() {
        prevented++;
      },
    };
    key(event);
    key({ ...event, key: "Enter", ctrlKey: true });
    assert.equal(prevented, 0);
    key({ ...event, key: "Enter" });
    assert.equal(fired, stage >= 4 ? 1 : 0);
    key({ ...event, key: "Enter", repeat: true });
    assert.equal(fired, stage >= 4 ? 1 : 0);
    key({ ...event, key: "n" });
    assert.equal(stepped, stage >= 4 ? 1 : 0);
    key({ ...event, key: " " });
    assert.equal(paused, true);
    key({ ...event, key: "h" });
    assert.equal(settings.gravity, stage >= 3 ? 10.31 : 9.81);
    key({ ...event, key: "]" });
    assert.equal(settings.fixedDt, stage >= 5 ? 1 / 60 : 1 / 30);
  }
});
