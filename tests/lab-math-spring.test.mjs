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
