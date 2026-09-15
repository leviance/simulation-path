import assert from "node:assert/strict";
import test from "node:test";
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
  assert.ok(Math.abs(race.euler.state.elapsed - 2) < 1e-12);
  assert.equal(race.euler.forceEvaluations, 120);
  assert.equal(race.verlet.forceEvaluations, 240);
  assert.equal(race.rk4.forceEvaluations, 480);

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
