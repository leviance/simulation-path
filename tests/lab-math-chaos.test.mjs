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
