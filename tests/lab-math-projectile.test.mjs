import assert from "node:assert/strict";
import test from "node:test";
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
