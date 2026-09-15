import assert from "node:assert/strict";
import test from "node:test";
import * as particles from "../lib/labs/five-million-particle-fountain.ts";

test("five-million dispatch and storage budget are exact", () => {
  const plan = particles.makeDispatchPlan(5_000_000, 256);
  assert.equal(plan.workgroupCount, 19_532);
  assert.equal(plan.launchedInvocations, 5_000_192);
  assert.equal(plan.unusedInvocations, 192);
  assert.equal(particles.particleStorageBytes(5_000_000), 160_000_000);
});

test("particle initialization is deterministic and index-dependent", () => {
  const first = particles.makeInitialParticle(3817, 99);
  const repeated = particles.makeInitialParticle(3817, 99);
  const different = particles.makeInitialParticle(3818, 99);
  assert.deepEqual(first, repeated);
  assert.notDeepEqual(first, different);
  assert.ok(first.positionAge.w < first.velocityLife.w);
  assert.ok(first.velocityLife.w > 0);
});

test("semi-implicit Euler uses the updated velocity", () => {
  const input = {
    positionAge: { x: 1, y: 2, z: 0, w: 0.25 },
    velocityLife: { x: 3, y: 10, z: 0, w: 4 },
  };
  const output = particles.stepParticle(input, 7, 0.1, -10, 1);
  assert.ok(Math.abs(output.velocityLife.y - 9) < 1e-6);
  assert.ok(Math.abs(output.positionAge.x - 1.3) < 1e-6);
  assert.ok(Math.abs(output.positionAge.y - 2.9) < 1e-6);
  assert.ok(Math.abs(output.positionAge.w - 0.35) < 1e-6);
});

test("expired particle respawns with a valid lifecycle", () => {
  const input = particles.makeSpawnParticle(8, 0);
  input.positionAge.w = input.velocityLife.w;
  const output = particles.stepParticle(input, 8, 0.01, -9.81, 19);
  assert.equal(output.positionAge.w, 0);
  assert.ok(output.velocityLife.y > 0);
  assert.ok(output.velocityLife.w > 0);
});

test("capability gate chooses the largest supported preset", () => {
  assert.equal(particles.chooseLargestSupportedCount(particles.LARGE_GPU), 5_000_000);
  assert.equal(particles.chooseLargestSupportedCount(particles.LIMITED_GPU), 1_000_000);
  const report = particles.validateCapabilities(
    particles.LIMITED_GPU,
    particles.makeDispatchPlan(5_000_000),
  );
  assert.equal(report.storageBlockLargeEnough, false);
});

test("frame-time selection handles clamp, pause and single step", () => {
  assert.equal(particles.selectSimulationDt(1, false, false), 1 / 30);
  assert.equal(particles.selectSimulationDt(0.01, true, false), 0);
  assert.equal(particles.selectSimulationDt(1, true, true), 1 / 120);
});

test("compute-to-draw barrier is selected by vertex SSBO consumer", () => {
  assert.equal(particles.barrierStatus("shader-storage").visible, true);
  assert.equal(particles.barrierStatus("buffer-update").visible, false);
  assert.equal(particles.barrierStatus("missing").visible, false);
});

test("query ring exposes pending and available slots without blocking", () => {
  const slots = particles.queryRingSnapshot(7, 2, 4);
  assert.equal(slots.length, 4);
  assert.ok(slots.some((slot) => slot.pending));
  assert.ok(slots.some((slot) => slot.available));
});

test("particle validator catches large error and NaN", () => {
  const expected = [particles.makeInitialParticle(11)];
  const actual = structuredClone(expected);
  assert.equal(particles.validateParticles(expected, actual).mismatchCount, 0);
  actual[0].positionAge.x += 0.1;
  assert.equal(particles.validateParticles(expected, actual).mismatchCount, 1);
  actual[0].positionAge.x = Number.NaN;
  assert.equal(particles.validateParticles(expected, actual).allFinite, false);
});

test("named Project 38 contract covers resident update and render", () => {
  const report = particles.validateFiveMillionParticleContract();
  assert.ok(Object.values(report).every(Boolean), JSON.stringify(report));
});
