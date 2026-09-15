import assert from "node:assert/strict";
import test from "node:test";
import {
  addLennardJonesPoint,
  assessLennardJonesExperiment,
  lennardJonesDragCondition,
  appendLennardJonesHistory,
  evaluateLennardJonesPair,
  lennardJonesCenterOfMass,
  lennardJonesCenterOfMassVelocity,
  lennardJonesEquilibriumDistance,
  lennardJonesMomentum,
  lennardJonesRelativeEnergyDrift,
  lengthLennardJonesPoint,
  makeLennardJonesPair,
  measureLennardJonesSystem,
  planLennardJonesFixedSteps,
  runLennardJonesPair,
  sampleLennardJonesPotential,
  subtractLennardJonesPoint,
  traceLennardJonesVelocityVerletStep,
  validLennardJonesPairState,
  validateLennardJonesModel,
} from "../lib/labs/lennard-jones-pair.ts";

const parameters = { epsilon: 1, sigma: 1 };

test("dragging through the origin retains a usable direction and valid mass", () => {
  const previousDirection = { x: 0.6, y: 0.8 };
  const condition = lennardJonesDragCondition({ x: 0, y: 0 }, previousDirection, 1);
  assert.deepEqual(condition.direction, previousDirection);
  assert.equal(condition.separationRatio, 0.82);
  const state = makeLennardJonesPair(condition.separationRatio, 1, condition.direction);
  assert.ok(validLennardJonesPairState(state));
  assert.equal(state.atomA.mass, 1);
});

test("reference PASS cannot hide an inaccurate selected repulsive experiment", () => {
  const selectedParameters = { epsilon: 2, sigma: 0.8 };
  const initial = makeLennardJonesPair(0.82 * 0.8, 0.5);
  const before = structuredClone(initial);
  assert.ok(validateLennardJonesModel(selectedParameters, 0.5).passed);
  const report = assessLennardJonesExperiment(initial, selectedParameters, 0.004);
  assert.ok(report.valid);
  assert.equal(report.steps, 1_000);
  assert.ok(report.maximumEnergyDrift > 0.15);
  assert.equal(report.stable, false);
  assert.deepEqual(initial, before);
  assert.equal(assessLennardJonesExperiment(initial, selectedParameters, 0.004, 2001).valid, false);
});

test("Lennard-Jones potential preserves sigma, equilibrium and singularity landmarks", () => {
  const equilibrium = lennardJonesEquilibriumDistance(parameters);
  assert.ok(Math.abs(equilibrium - 2 ** (1 / 6)) < 1e-12);
  assert.ok(Math.abs(sampleLennardJonesPotential(1, parameters).potential) < 1e-12);
  assert.ok(Math.abs(sampleLennardJonesPotential(equilibrium, parameters).potential + 1) < 1e-12);
  assert.equal(sampleLennardJonesPotential(0, parameters).valid, false);
});

test("pair construction rejects invalid separation direction and mass", () => {
  assert.equal(validLennardJonesPairState(makeLennardJonesPair(-1)), false);
  assert.equal(validLennardJonesPairState(makeLennardJonesPair(1, 0)), false);
  assert.equal(validLennardJonesPairState(makeLennardJonesPair(1, Number.NaN)), false);
  assert.equal(validLennardJonesPairState(makeLennardJonesPair(1, 1, { x: 0, y: 0 })), false);
});

test("potential slope matches the numerical derivative and sets the force direction", () => {
  const distance = 1.35;
  const h = 1e-6;
  const interaction = evaluateLennardJonesPair(makeLennardJonesPair(distance), parameters);
  const numericalDerivative =
    (sampleLennardJonesPotential(distance + h, parameters).potential -
      sampleLennardJonesPotential(distance - h, parameters).potential) /
    (2 * h);
  assert.ok(Math.abs(interaction.potentialSlope - numericalDerivative) < 1e-7);
  assert.ok(evaluateLennardJonesPair(makeLennardJonesPair(0.95), parameters).potentialSlope < 0);
  assert.ok(evaluateLennardJonesPair(makeLennardJonesPair(1.5), parameters).potentialSlope > 0);
});

test("one pair evaluation enforces equal and opposite forces", () => {
  const interaction = evaluateLennardJonesPair(
    makeLennardJonesPair(1.4, 1, { x: 2, y: 1 }),
    parameters,
  );
  assert.equal(interaction.valid, true);
  assert.ok(
    lengthLennardJonesPoint(addLennardJonesPoint(interaction.forceOnA, interaction.forceOnB)) <
      1e-12,
  );
  const delta = { x: 2, y: 1 };
  const cross = interaction.forceOnA.x * delta.y - interaction.forceOnA.y * delta.x;
  assert.ok(Math.abs(cross) < 1e-10);
});

test("Velocity Verlet keeps a symmetric pair centered with zero momentum", () => {
  const initial = makeLennardJonesPair(1.45);
  const trace = traceLennardJonesVelocityVerletStep(initial, parameters, 1 / 1000);
  assert.equal(trace.valid, true);
  assert.equal(trace.next.elapsed, 1 / 1000);
  assert.ok(lengthLennardJonesPoint(lennardJonesCenterOfMass(trace.next)) < 1e-12);
  assert.ok(lengthLennardJonesPoint(lennardJonesMomentum(trace.next)) < 1e-12);
  assert.notDeepEqual(trace.accelerationA0, trace.accelerationA1);
});

test("a non-zero total momentum moves the center of mass at constant velocity", () => {
  const initial = makeLennardJonesPair(1.45, 1.5);
  initial.atomA.velocity = { x: 0.25, y: -0.1 };
  initial.atomB.velocity = { x: 0.25, y: -0.1 };
  const centerBefore = lennardJonesCenterOfMass(initial);
  const centerVelocity = lennardJonesCenterOfMassVelocity(initial);
  const run = runLennardJonesPair(initial, parameters, 1, 1 / 1000, 2_000);
  const expected = addLennardJonesPoint(centerBefore, centerVelocity);
  assert.equal(run.valid, true);
  assert.ok(
    lengthLennardJonesPoint(
      subtractLennardJonesPoint(lennardJonesCenterOfMass(run.state), expected),
    ) < 1e-9,
  );
});

test("fixed-step planning ignores render splits until the explicit guard is reached", () => {
  const oneFrame = planLennardJonesFixedSteps(0, 0.016, 0.001, 32, 0.05);
  const firstHalf = planLennardJonesFixedSteps(0, 0.007, 0.001, 32, 0.05);
  const secondHalf = planLennardJonesFixedSteps(firstHalf.remainder, 0.009, 0.001, 32, 0.05);
  assert.equal(oneFrame.steps, firstHalf.steps + secondHalf.steps);
  assert.ok(Math.abs(oneFrame.remainder - secondHalf.remainder) < 1e-12);
  const guarded = planLennardJonesFixedSteps(0, 0.2, 0.001, 32, 0.05);
  assert.equal(guarded.steps, 32);
  assert.ok(guarded.droppedTime > 0.16);
});

test("bounded attractive run keeps energy momentum and center-of-mass drift small", () => {
  const initial = makeLennardJonesPair(1.45);
  const initialMetrics = measureLennardJonesSystem(initial, parameters);
  const run = runLennardJonesPair(initial, parameters, 20, 1 / 1000, 25_000);
  const finalMetrics = measureLennardJonesSystem(run.state, parameters);
  assert.equal(run.valid, true);
  assert.equal(finalMetrics.valid, true);
  assert.ok(
    Math.abs(
      lennardJonesRelativeEnergyDrift(finalMetrics.totalEnergy, initialMetrics.totalEnergy),
    ) < 0.002,
  );
  assert.ok(lengthLennardJonesPoint(finalMetrics.momentum) < 1e-9);
  assert.ok(lengthLennardJonesPoint(finalMetrics.center) < 1e-9);
});

test("history is bounded and the named validation covers the complete Project 41 contract", () => {
  const state = makeLennardJonesPair(1.45);
  const initialEnergy = measureLennardJonesSystem(state, parameters).totalEnergy;
  let history = [];
  for (let index = 0; index < 20; index += 1) {
    history = appendLennardJonesHistory(history, state, parameters, initialEnergy, 8);
  }
  assert.equal(history.length, 8);
  const validation = validateLennardJonesModel(parameters);
  assert.deepEqual(validation, {
    landmarks: true,
    forceDirections: true,
    newtonThirdLaw: true,
    finiteRun: true,
    momentum: true,
    centerOfMass: true,
    energy: true,
    passed: true,
  });
});

test("validation covers the complete parameter and mass range exposed by the lab", () => {
  for (const epsilon of [0.5, 1, 2]) {
    for (const sigma of [0.8, 1, 1.2]) {
      for (const mass of [0.5, 1, 2]) {
        assert.equal(validateLennardJonesModel({ epsilon, sigma }, mass).passed, true);
      }
    }
  }
});
