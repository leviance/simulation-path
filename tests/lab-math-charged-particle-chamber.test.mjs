import assert from "node:assert/strict";
import test from "node:test";
import * as m from "../lib/labs/charged-particle-chamber/math.ts";
import {
  ChamberController,
  selectedError,
} from "../lib/labs/charged-particle-chamber/controller.ts";

function evolve(initial, settings, dt, steps, integrator = m.stepBoris) {
  const result = m.cloneParticle(initial);
  for (let i = 0; i < steps; ++i) assert.equal(integrator(result, settings.fields, dt), true);
  return result;
}
const distance = (a, b) => m.length(m.sub(a, b));
const capable = {
  major: 4,
  minor: 3,
  maximumBlockBytes: 256 * 1024 ** 2,
  maximumGroupsX: 65535,
  maximumLocalX: 1024,
  maximumInvocations: 1024,
  storageBindings: 8,
  computeStorageBlocks: 8,
};

test("independent straight and constant-E references match full-time x/v", () => {
  for (const preset of ["straight", "electric"]) {
    const settings = m.presetSettings(preset);
    const initial = m.initialParticle(0, settings);
    const evolved = evolve(initial, settings, 0.01, 400);
    const exact = m.analyticState(initial, settings.fields, 4);
    assert.ok(distance(m.position(evolved), exact.position) < 1e-10);
    assert.ok(distance(m.velocity(evolved), exact.velocity) < 1e-10);
  }
});
test("Boris reverses curvature with q, preserves speed and B-parallel velocity", () => {
  const settings = m.presetSettings("helix"),
    axis = m.normalize(settings.fields.magnetic);
  for (const id of [0, 1]) {
    const initial = m.initialParticle(id, settings),
      result = evolve(initial, settings, 1 / 240, 1200);
    assert.ok(Math.abs(m.length(m.velocity(initial)) - m.length(m.velocity(result))) < 1e-11);
    assert.ok(Math.abs(m.dot(m.velocity(initial), axis) - m.dot(m.velocity(result), axis)) < 1e-11);
    assert.ok(
      distance(m.position(result), m.analyticState(initial, settings.fields, 5).position) < 1e-4,
    );
  }
  const circle = m.presetSettings("circle");
  const positive = evolve(m.initialParticle(0, circle), circle, 0.01, 100);
  const negative = evolve(m.initialParticle(1, circle), circle, 0.01, 100);
  assert.ok(positive.positionCharge.z > 0 && negative.positionCharge.z < 0);
});
test("same observation time exposes phase error even when speed is conserved", () => {
  const settings = m.presetSettings("helix"),
    initial = m.initialParticle(0, settings);
  const coarse = evolve(initial, settings, 1 / 30, 240),
    fine = evolve(initial, settings, 1 / 60, 480);
  const exact = m.analyticState(initial, settings.fields, 8);
  const ratio =
    distance(m.velocity(coarse), exact.velocity) / distance(m.velocity(fine), exact.velocity);
  assert.ok(ratio > 3.99 && ratio < 4.01);
  assert.ok(
    distance(m.position(fine), exact.position) < distance(m.position(coarse), exact.position),
  );
  const euler = evolve(initial, settings, 1 / 30, 240, m.stepEuler);
  assert.ok(m.length(m.velocity(euler)) > m.length(m.velocity(initial)) * 1.1);
});
test("crossed fields, zero fields, v=0 and neutral charge avoid axis shortcuts and divisions by zero", () => {
  const settings = m.presetSettings("helix");
  settings.fields.electric = { x: 0.2, y: -0.1, z: 0.3 };
  const initial = m.initialParticle(0, settings);
  assert.ok(
    distance(
      m.position(evolve(initial, settings, 0.002, 2000)),
      m.analyticState(initial, settings.fields, 4).position,
    ) < 1e-5,
  );
  settings.fields.chargeScale = 0;
  const neutral = evolve(initial, settings, 0.01, 100);
  assert.ok(distance(m.position(neutral), m.add(m.position(initial), m.velocity(initial))) < 1e-10);
  settings.fields = {
    electric: { x: 0, y: 0, z: 0 },
    magnetic: { x: 0, y: 1, z: 0 },
    chargeScale: 1,
  };
  initial.velocityMass = { x: 0, y: 0, z: 0, w: 1 };
  assert.deepEqual(evolve(initial, settings, 0.01, 100), initial);
});
test("invalid particle/field/dt is rejected transactionally; NaN cannot pass comparison", () => {
  const settings = m.presetSettings();
  const initial = m.initialParticle(0, settings);
  for (const invalidDt of [0, -1, NaN, Infinity]) {
    const copy = m.cloneParticle(initial);
    assert.equal(m.stepBoris(copy, settings.fields, invalidDt), false);
    assert.deepEqual(copy, initial);
  }
  for (const mass of [0, -1, NaN, Infinity]) {
    const invalid = m.cloneParticle(initial);
    invalid.velocityMass.w = mass;
    assert.equal(m.stepBoris(invalid, settings.fields, 0.01), false);
  }
  const copy = m.cloneParticle(initial);
  settings.fields.electric.x = NaN;
  assert.equal(m.stepBoris(copy, settings.fields, 0.01), false);
  assert.deepEqual(copy, initial);
});
test("seeded prefix and prepared phase are reproducible, with ID zero/one at the same origin", () => {
  const s = m.presetSettings();
  assert.deepEqual(m.snapshotParticle(7919, s), m.snapshotParticle(7919, s));
  assert.notDeepEqual(m.snapshotParticle(7919, s), m.initialParticle(7919, s));
  const prefix = m.snapshotParticle(7919, s);
  s.count = 5_000_000;
  assert.deepEqual(m.snapshotParticle(7919, s), prefix);
  for (const id of [0, 1]) assert.deepEqual(m.snapshotParticle(id, s), m.initialParticle(id, s));
  s.fields.electric.x = 0.1;
  assert.equal(m.preparedPhaseSpan(s), 0);
  assert.deepEqual(m.snapshotParticle(9, s), m.initialParticle(9, s));
});
test("conceptual preflight guards odd tail, memory and invalid settings without claiming real GPU support", () => {
  const s = m.presetSettings();
  s.count = 5_000_000;
  const budget = m.makeBudget(s, capable);
  assert.equal(budget.supported, true);
  assert.equal(budget.groups, 19532);
  assert.equal(budget.tailLanes, 192);
  assert.equal(budget.stateBytes, 160_000_000);
  assert.equal(m.makeBudget(s, { ...capable, maximumBlockBytes: 16 * 1024 ** 2 }).supported, false);
  s.count = 1_000_003;
  assert.equal(m.makeBudget(s, capable).tailLanes, 189);
  s.count = NaN;
  assert.equal(m.makeBudget(s, capable).supported, false);
  s.count = 1;
  s.fields.magnetic.x = Infinity;
  assert.notEqual(m.validateSettings(s), null);
});
test("clock pause/step and finite catch-up report discarded wall time", () => {
  const clock = m.emptyClock();
  assert.equal(m.advanceClock(clock, 10, 1 / 240, true, false), 0);
  assert.equal(m.advanceClock(clock, 10, 1 / 240, true, true), 1);
  const steps = m.advanceClock(clock, 10, 1 / 240, false, false);
  assert.equal(steps, 8);
  assert.ok(clock.discardedSeconds > 9.9);
  m.commitClock(clock, steps, 1 / 240);
  assert.equal(clock.simulatedSeconds, 8 / 240);
});
test("controller separates STAGED from ACTIVE, rejects invalid apply and keeps sample count explicit", () => {
  const c = new ChamberController();
  const initial = structuredClone(c.getSnapshot().particles);
  const staged = m.cloneSettings(c.getSnapshot().staged);
  staged.fields.magnetic.x = 99;
  c.stage(staged);
  assert.equal(c.apply(), false);
  assert.deepEqual(c.getSnapshot().particles, initial);
  assert.notEqual(c.getSnapshot().active.fields.magnetic.x, 99);
  c.preset("straight");
  assert.equal(c.getSnapshot().active.preset, "helix");
  assert.equal(c.apply(), true);
  assert.equal(c.getSnapshot().particles.length, 256);
  c.step();
  assert.equal(c.getSnapshot().clock.tick, 1);
  assert.ok(selectedError(c.getSnapshot()).position < 1e-12);
  c.reset();
  assert.equal(c.getSnapshot().clock.tick, 0);
});
test("camera and pointer ownership cannot mutate physical state; reset/cancel release capture owner", () => {
  const c = new ChamberController(),
    initial = structuredClone(c.getSnapshot().particles);
  assert.equal(c.beginPointer(7, true, 0, 10, 20), true);
  assert.equal(c.beginPointer(8, true, 0, 20, 30), false);
  c.movePointer(8, 100, 100);
  assert.equal(c.getSnapshot().camera.yaw, m.defaultCamera().yaw);
  c.movePointer(7, 100, 100);
  assert.notEqual(c.getSnapshot().camera.yaw, m.defaultCamera().yaw);
  assert.equal(c.endPointer(8), false);
  assert.equal(c.getSnapshot().pointer, 7);
  c.endPointer(7);
  c.zoomCamera(2);
  c.moveCamera(12, 10, true);
  assert.deepEqual(c.getSnapshot().particles, initial);
  c.resetCamera();
  assert.deepEqual(c.getSnapshot().camera, m.defaultCamera());
  c.beginPointer(9, true, 2, 0, 0);
  c.reset();
  assert.equal(c.getSnapshot().pointer, null);
});
test("bounded reference job freezes input, compares at same T and never passes cancel/timeout", () => {
  const c = new ChamberController();
  c.startComparison(0);
  const staged = m.cloneSettings(c.getSnapshot().staged);
  staged.fields.magnetic.x = 4;
  c.stage(staged);
  for (let i = 0; i < 100 && c.getSnapshot().comparison.status === "running"; ++i) c.tick(0, i);
  const result = c.getSnapshot().comparison;
  assert.equal(result.status, "complete");
  assert.equal(result.completedSteps, result.totalSteps);
  assert.ok(result.finePositionError < result.coarsePositionError);
  assert.ok(result.fineVelocityError < result.coarseVelocityError);
  c.startComparison(0);
  c.tick(0, 8000);
  assert.equal(c.getSnapshot().comparison.status, "timeout");
  assert.equal(c.getSnapshot().comparison.finePositionError, null);
  c.startComparison(0);
  c.cancelComparison();
  assert.equal(c.getSnapshot().comparison.status, "cancelled");
  c.startComparison(0);
  c.apply();
  assert.equal(c.getSnapshot().comparison.status, "idle");
  c.startComparison(0);
  c.dispose();
  assert.equal(c.getSnapshot().comparison.status, "cancelled");
});
test("12-second preview and bounded trails remain finite, with no respawn", () => {
  const c = new ChamberController();
  c.resume();
  for (let i = 0; i < 600; ++i) c.tick(0.1, i * 100);
  assert.equal(c.getSnapshot().paused, true);
  assert.ok(c.getSnapshot().clock.simulatedSeconds <= 12 + 1e-9);
  assert.ok(c.getSnapshot().trails.every((trail) => trail.length <= 256));
  assert.equal(c.getSnapshot().trails.length, 17);
  const saved = structuredClone(c.getSnapshot().particles);
  c.pause();
  c.tick(10, 100000);
  assert.deepEqual(c.getSnapshot().particles, saved);
});
