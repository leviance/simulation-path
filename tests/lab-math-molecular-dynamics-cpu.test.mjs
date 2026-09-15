import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_PARAMETERS,
  accumulatePairForces,
  assignThermalVelocities,
  createLatticeParticles,
  createMolecularSystem,
  forceShiftedEquilibrium,
  kineticEnergy,
  makeWallExperiment,
  measureMolecularRun,
  measureSystem,
  length,
  linearMomentum,
  makeBoxForDensity,
  planFixedSteps,
  reflectCoordinate,
  relativeEnergyDrift,
  runBoundedSimulation,
  sampleForceShiftedPair,
  temperature,
  unorderedPairCount,
  validateMolecularDynamics,
  velocityVerletStep,
} from "../lib/labs/molecular-dynamics-cpu.ts";

test("one thousand particles imply exactly 499500 unordered pairs", () => {
  assert.equal(unorderedPairCount(1_000), 499_500);
  assert.equal(unorderedPairCount(1), 0);
  assert.equal(unorderedPairCount(-1), 0);
});

test("lattice initialization is deterministic, in bounds and free of close overlap", () => {
  const box = makeBoxForDensity(1_000, 0.7);
  const first = createLatticeParticles(1_000, box, 42);
  const second = createLatticeParticles(1_000, box, 42);
  assert.deepEqual(first, second);
  assert.equal(first.length, 1_000);
  assert.ok(
    first.every(
      (particle) =>
        particle.position.x > 0 &&
        particle.position.x < box.width &&
        particle.position.y > 0 &&
        particle.position.y < box.height,
    ),
  );

  let minimumNeighborDistance = Number.POSITIVE_INFINITY;
  for (let index = 1; index < first.length; index += 1) {
    const dx = first[index].position.x - first[index - 1].position.x;
    const dy = first[index].position.y - first[index - 1].position.y;
    minimumNeighborDistance = Math.min(minimumNeighborDistance, Math.hypot(dx, dy));
  }
  assert.ok(minimumNeighborDistance > 0.8);
});

test("thermal velocity assignment removes center-of-mass motion and reaches target temperature", () => {
  const box = makeBoxForDensity(64, 0.55);
  const particles = createLatticeParticles(64, box, 3);
  const thermal = assignThermalVelocities(particles, 0.4, 9);
  assert.ok(length(linearMomentum(thermal)) < 1e-10);
  assert.ok(Math.abs(temperature(thermal) - 0.4) < 1e-12);
});

test("force-shifted Lennard-Jones potential and slope reach zero at the cutoff", () => {
  const justInside = sampleForceShiftedPair(DEFAULT_PARAMETERS.cutoff - 1e-5);
  const atCutoff = sampleForceShiftedPair(DEFAULT_PARAMETERS.cutoff);
  assert.equal(justInside.valid, true);
  assert.equal(justInside.active, true);
  assert.ok(Math.abs(justInside.potential) < 1e-8);
  assert.ok(Math.abs(justInside.potentialSlope) < 1e-5);
  assert.deepEqual(atCutoff, {
    valid: true,
    active: false,
    potential: 0,
    potentialSlope: 0,
  });
});

test("all-pairs accumulation visits i<j once and preserves internal force balance", () => {
  const system = createMolecularSystem(49, 0.2, 12, 0.55);
  const evaluation = accumulatePairForces(system.particles, system.parameters);
  assert.equal(evaluation.valid, true);
  assert.equal(evaluation.evaluatedPairs, unorderedPairCount(49));
  const totalForce = evaluation.forces.reduce(
    (sum, force) => ({ x: sum.x + force.x, y: sum.y + force.y }),
    { x: 0, y: 0 },
  );
  assert.ok(length(totalForce) < 1e-9);

  system.particles[0].mass = 0;
  assert.equal(accumulatePairForces(system.particles, system.parameters).valid, false);
});

test("reflective walls mirror overshoot and reverse only the normal velocity", () => {
  assert.deepEqual(reflectCoordinate(-0.25, -2, 10), {
    valid: true,
    position: 0.25,
    velocity: 2,
  });
  assert.deepEqual(reflectCoordinate(10.4, 3, 10), {
    valid: true,
    position: 9.6,
    velocity: -3,
  });
  assert.equal(reflectCoordinate(1, 1, Number.NaN).valid, false);
});

test("fixed-step planning is independent from render splits and has a hard guard", () => {
  const oneFrame = planFixedSteps(0, 0.016, 0.002, 16, 0.05);
  const twoFramesA = planFixedSteps(0, 0.007, 0.002, 16, 0.05);
  const twoFramesB = planFixedSteps(twoFramesA.remainder, 0.009, 0.002, 16, 0.05);
  assert.equal(oneFrame.steps, twoFramesA.steps + twoFramesB.steps);
  assert.ok(Math.abs(oneFrame.remainder - twoFramesB.remainder) < 1e-12);

  const guarded = planFixedSteps(0, 1, 0.002, 8, 0.05);
  assert.equal(guarded.steps, 8);
  assert.ok(guarded.droppedTime > 0.9);
  assert.ok(guarded.remainder < 0.002);
});

test("a bounded many-particle run remains finite with controlled energy drift", () => {
  const system = createMolecularSystem(36, 0.2, 123, 0.55);
  const initialEnergy = system.initialEnergy;
  assert.equal(runBoundedSimulation(system, 0.4, 0.001, 500), true);
  const finalEvaluation = accumulatePairForces(system.particles, system.parameters);
  const finalKinetic = system.particles.reduce(
    (sum, particle) =>
      sum +
      0.5 *
        particle.mass *
        (particle.velocity.x * particle.velocity.x + particle.velocity.y * particle.velocity.y),
    0,
  );
  assert.equal(finalEvaluation.valid, true);
  assert.ok(
    Math.abs(relativeEnergyDrift(finalKinetic + finalEvaluation.potentialEnergy, initialEnergy)) <
      0.01,
  );
});

test("named Project 42 validation covers initialization, dynamics and boundaries", () => {
  const report = validateMolecularDynamics();
  const { maximumEnergyDrift, wallEnergyDrift, wallEvents, ...checks } = report;
  assert.ok(maximumEnergyDrift > 0 && maximumEnergyDrift < 0.01);
  assert.ok(wallEnergyDrift > 0 && wallEnergyDrift < 0.01);
  assert.ok(wallEvents > 0);
  assert.deepEqual(checks, {
    deterministicInitialization: true,
    particlesInsideBox: true,
    momentumRemoved: true,
    exactPairCount: true,
    forceSumZero: true,
    cutoffContinuous: true,
    wallReflection: true,
    finiteRun: true,
    energyStable: true,
    passed: true,
  });
});

test("thermal initialization uses mass-weighted COM and temperature ignores a uniform boost", () => {
  const particles = createLatticeParticles(4, makeBoxForDensity(4, 0.2), 4);
  particles.forEach((particle, index) => {
    particle.mass = index + 1;
  });
  const thermal = assignThermalVelocities(particles, 0.4, 9);
  assert.ok(length(linearMomentum(thermal)) < 1e-10);
  assert.ok(Math.abs(temperature(thermal) - 0.4) < 1e-12);
  const boosted = thermal.map((particle) => ({
    ...particle,
    velocity: { x: particle.velocity.x + 3, y: particle.velocity.y - 2 },
  }));
  assert.ok(Math.abs(temperature(boosted) - 0.4) < 1e-12);
  assert.ok(kineticEnergy(boosted) > kineticEnergy(thermal));
  particles[0].mass = 0;
  assert.deepEqual(assignThermalVelocities(particles, 0.4, 9), []);
});

test("force shifting moves the equilibrium and the returned end-step forces match a fresh scan", () => {
  const oldRoot = 2 ** (1 / 6);
  const newRoot = forceShiftedEquilibrium(DEFAULT_PARAMETERS);
  assert.ok(newRoot > oldRoot);
  assert.ok(sampleForceShiftedPair(oldRoot).potentialSlope < 0);
  assert.ok(Math.abs(sampleForceShiftedPair(newRoot).potentialSlope) < 1e-10);
  const system = createMolecularSystem(9, 0.2, 1, 0.2);
  const output = {};
  assert.equal(velocityVerletStep(system, 0.001, output), true);
  assert.ok(output.evaluation.valid);
  assert.deepEqual(measureSystem(system, output.evaluation), measureSystem(system));
  const before = structuredClone(system);
  assert.equal(velocityVerletStep(system, Number.NaN, output), false);
  assert.equal(output.evaluation, undefined);
  assert.deepEqual(system, before);
});

test("the wall experiment actually collides and checks maximum drift, not just the last sample", () => {
  const system = makeWallExperiment();
  const report = measureMolecularRun(system, 0.0005, 200);
  assert.ok(report.valid);
  assert.ok(system.wallCollisions > 0);
  const lastDrift = Math.abs(
    relativeEnergyDrift(measureSystem(system).totalEnergy, system.initialEnergy),
  );
  assert.ok(report.maximumEnergyDrift >= lastDrift);
  assert.ok(report.maximumEnergyDrift < 0.01);
  const before = structuredClone(system);
  assert.equal(measureMolecularRun(system, 0.001, 2001).valid, false);
  assert.deepEqual(system, before);
});
