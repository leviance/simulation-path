import assert from "node:assert/strict";
import test from "node:test";
import {
  add,
  evaluate,
  fixedStepPlan,
  imagePositions,
  kineticEnergy,
  length,
  makeFreeParticle,
  makeGas,
  makePair,
  minimumComponent,
  minimumImage,
  momentum,
  shiftedPair,
  subtract,
  validateRun,
  verletStep,
  wrapCoordinate,
  wrapPosition,
} from "../lib/labs/periodic-molecular-box.ts";

const near = (a, b, tolerance = 1e-9) =>
  assert.ok(
    Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= tolerance,
    `${a} != ${b}`,
  );

test("P43 wrap handles negatives, exact endpoints, multiple crossings and invalid lengths", () => {
  near(wrapCoordinate(-0.25, 12), 11.75);
  near(wrapCoordinate(12, 12), 0);
  near(wrapCoordinate(36.25, 12), 0.25);
  near(wrapCoordinate(-36.25, 12), 11.75);
  assert.ok(Number.isNaN(wrapCoordinate(1, 0)));
  assert.ok(Number.isNaN(wrapCoordinate(Infinity, 12)));
  for (let i = -200; i <= 200; i += 1) {
    const value = i * 0.37;
    const result = wrapCoordinate(value, 7.3);
    assert.ok(result >= 0 && result < 7.3);
    near(wrapCoordinate(result, 7.3), result);
    near(wrapCoordinate(value + 3 * 7.3, 7.3), result);
  }
});

test("P43 minimum image matches an independent nine-image oracle in a rectangular box", () => {
  const box = { width: 12, height: 8 };
  near(minimumComponent(6, 12), -6);
  near(minimumComponent(-6, 12), -6);
  near(minimumImage({ x: 10.8, y: -7.5 }, box).x, -1.2);
  for (let x = -11; x <= 11; x += 1)
    for (let y = -7; y <= 7; y += 1) {
      let nearest = Infinity;
      for (let ix = -1; ix <= 1; ix += 1)
        for (let iy = -1; iy <= 1; iy += 1)
          nearest = Math.min(nearest, Math.hypot(x + ix * box.width, y + iy * box.height));
      near(length(minimumImage({ x, y }, box)), nearest);
    }
});

test("P43 force uses the seam direction and agrees with minus the potential gradient", () => {
  const system = makePair();
  const result = evaluate(system);
  assert.equal(result.valid, true);
  assert.equal(result.activePairs, 1);
  assert.equal(result.evaluatedPairs, 1);
  assert.ok(result.forces[0].x < 0);
  near(length(add(result.forces[0], result.forces[1])), 0);
  const plus = structuredClone(system);
  const minus = structuredClone(system);
  plus.particles[0].position.x += 1e-5;
  minus.particles[0].position.x -= 1e-5;
  near(-(evaluate(plus).potential - evaluate(minus).potential) / 2e-5, result.forces[0].x, 1e-6);
});

test("P43 forces and potential are invariant under whole-system translation and wrap", () => {
  const system = makeGas(36);
  const result = evaluate(system);
  for (const particle of system.particles)
    particle.position = wrapPosition(add(particle.position, { x: 7.1, y: -2.3 }), system.box);
  const shifted = evaluate(system);
  assert.ok(shifted.valid);
  near(result.potential, shifted.potential);
  result.forces.forEach((force, i) => {
    near(force.x, shifted.forces[i].x);
    near(force.y, shifted.forces[i].y);
  });
});

test("P43 rejects half-box cutoff and periodic overlap; force-shifted cutoff remains continuous", () => {
  const system = makePair();
  system.parameters.cutoff = 6;
  assert.equal(evaluate(system).valid, false);
  system.parameters.cutoff = 2.5;
  const edge = shiftedPair(2.5, system.parameters);
  const inside = shiftedPair(2.5 - 1e-8, system.parameters);
  near(edge.potential, 0);
  near(edge.slope, 0);
  near(inside.potential, 0, 1e-8);
  near(inside.slope, 0, 1e-8);
  system.particles[1].position = add(system.particles[0].position, { x: 12, y: 0 });
  assert.equal(evaluate(system).valid, false);
});

test("P43 unwrapped retains actual displacement even across multiple boxes per step", () => {
  const system = makeFreeParticle();
  system.particles[0].velocity = { x: -35000, y: 26000 };
  const initial = structuredClone(system.particles[0]);
  for (let i = 0; i < 40; i += 1) {
    assert.ok(verletStep(system, 0.001));
    const particle = system.particles[0];
    assert.deepEqual(particle.velocity, initial.velocity);
    const wrapped = wrapPosition(particle.unwrapped, system.box);
    near(particle.position.x, wrapped.x);
    near(particle.position.y, wrapped.y);
  }
  near(system.particles[0].unwrapped.x, initial.position.x + initial.velocity.x * system.elapsed);
});

test("P43 failed second force evaluation rolls back position, velocity, unwrapped and time", () => {
  const system = makePair();
  system.particles[0].position = { x: 1, y: 6 };
  system.particles[1].position = { x: 4, y: 6 };
  system.particles[0].velocity = { x: 1500, y: 0 };
  system.particles[1].velocity = { x: -1500, y: 0 };
  const before = structuredClone(system);
  assert.equal(verletStep(system, 0.001), false);
  assert.deepEqual(system, before);
  assert.equal(verletStep(system, 0), false);
  assert.equal(verletStep(system, 1), false);
  assert.deepEqual(system, before);
});

test("P43 display images do not multiply state or pair count; seeded gas is deterministic", () => {
  const system = makeGas(1000);
  const before = structuredClone(system);
  assert.deepEqual(makeGas(1000), system);
  assert.notDeepEqual(makeGas(1000, 44).particles[0].velocity, system.particles[0].velocity);
  const images = imagePositions(system.particles[0].position, system.box);
  assert.equal(images.length, 9);
  assert.deepEqual(images[4], system.particles[0].position);
  assert.deepEqual(system, before);
  assert.equal(evaluate(system).evaluatedPairs, 499500);
  assert.ok(length(momentum(system)) < 1e-9);
});

test("P43 interacting particles conserve momentum and energy while actually crossing a seam", () => {
  const system = makePair();
  for (const particle of system.particles) {
    particle.position = wrapPosition(add(particle.position, { x: 0, y: -5.9 }), system.box);
    particle.unwrapped = { ...particle.position };
    particle.velocity = { x: 0, y: -1 };
  }
  const initialEnergy = kineticEnergy(system) + evaluate(system).potential;
  const initialMomentum = momentum(system);
  let maximumError = 0;
  for (let i = 0; i < 300; i += 1) {
    assert.ok(verletStep(system, 0.001));
    const energy = kineticEnergy(system) + evaluate(system).potential;
    maximumError = Math.max(
      maximumError,
      Math.abs(energy - initialEnergy) / Math.max(1, Math.abs(initialEnergy)),
    );
  }
  assert.ok(system.particles[0].unwrapped.y < 0 && system.particles[0].position.y > 11);
  assert.ok(maximumError < 0.01);
  assert.ok(length(subtract(momentum(system), initialMomentum)) < 1e-9);
  assert.ok(validateRun().passed);
});

test("P43 fixed-step playback has a finite budget and accounts for discarded time", () => {
  const plan = fixedStepPlan(0, 2, 0.001, 1);
  assert.equal(plan.steps, 1);
  assert.ok(plan.remainder >= 0 && plan.remainder < 0.001);
  near(plan.steps * 0.001 + plan.remainder + plan.droppedTime, 0.2);
  assert.throws(() => fixedStepPlan(0, 1, 0, 8), RangeError);
  assert.throws(() => fixedStepPlan(0, Infinity, 0.001, 8), RangeError);
  assert.throws(() => fixedStepPlan(0, 1, 0.001, 1000), RangeError);
});
