import assert from "node:assert/strict";
import test from "node:test";
import {
  advancePipeline,
  auditPipeline,
  buildGrid,
  cancelPipeline,
  createPipeline,
  initialSystem,
  maxDisplacement,
  memoryPlan,
  neighborCellIds,
  ownForces,
} from "../lib/labs/molecular-lab-gpu.ts";

test("P45 estimates every buffer and the largest SSBO without allocating large state", () => {
  for (const count of [64, 257, 100000, 500000, 1000000, 5000000]) {
    const p = memoryPlan(count);
    assert.equal(p.residentBytes, 112 * count + 68 * p.cells + 32 * Math.ceil(count / 256) + 16);
    assert.ok(p.largestBlock <= 128 * 1024 * 1024);
    assert.ok(p.residentBytes < 1024 ** 3);
    assert.ok(p.width / p.cellsX >= 2.9);
    const stride = Math.ceil(count / 100000);
    assert.ok((Math.ceil(count / stride) - 1) * stride < count);
  }
  assert.throws(() => memoryPlan(5000001));
  assert.throws(() => memoryPlan(NaN));
  assert.throws(() => initialSystem(100000));
});

test("P45 directed ownership preserves forces and counts each pair potential once", () => {
  for (const count of [64, 144]) {
    const model = createPipeline(count);
    const report = auditPipeline(model);
    assert.ok(report.forceError < 1e-10);
    assert.ok(report.potentialError < 1e-9);
    assert.ok(report.gridChecks < report.bruteChecks);
    const velocity = model.system.particles.reduce(
      (v, p) => ({ x: v.x + p.velocity.x, y: v.y + p.velocity.y }),
      { x: 0, y: 0 },
    );
    assert.deepEqual(velocity, { x: 0, y: 0 });
  }
});

test("P45 bucket overflow is rejected, not truncated", () => {
  const system = initialSystem();
  system.particles.forEach((p) => {
    p.position = { x: 0.5, y: 0.5 };
  });
  const grid = buildGrid(system);
  assert.equal(grid.maximumOccupancy, 64);
  assert.equal(grid.valid, false);
  assert.throws(() => ownForces(system, grid), /16/);
});

test("P45 deduplicates wrapped cells when an axis has only two cells", () => {
  const system = initialSystem();
  const grid = buildGrid(system);
  grid.cellsX = 2;
  grid.cellsY = 2;
  const cells = neighborCellIds(grid, system.box, { x: 0, y: 0 });
  assert.equal(cells.length, 4);
  assert.equal(new Set(cells).size, 4);
});

test("P45 cached reference stencil keeps neighbors after sub-half-skin displacement", () => {
  const system = initialSystem();
  const grid = buildGrid(system);
  system.particles.forEach((p, i) => {
    const dx = i % 2 ? 0.19 : -0.19;
    p.unwrapped.x += dx;
    p.position.x = (p.position.x + dx + system.box.width) % system.box.width;
  });
  assert.ok(maxDisplacement(system, grid) < 0.2);
  const cached = ownForces(system, grid);
  const reference = ownForces(system);
  cached.forces.forEach((f, i) =>
    assert.ok(Math.hypot(f.x - reference.forces[i].x, f.y - reference.forces[i].y) < 1e-10),
  );
  assert.ok(Math.abs(cached.potential - reference.potential) < 1e-9);
});

test("P45 only commits after all five phases and cancellation preserves physical state", () => {
  const model = createPipeline();
  const before = structuredClone(model.system);
  for (let phase = 0; phase < 4; phase += 1) {
    advancePipeline(model);
    assert.equal(model.bank, 0);
    assert.deepEqual(model.system, before);
  }
  cancelPipeline(model);
  assert.equal(model.phase, 0);
  assert.equal(model.steps, 0);
  assert.deepEqual(model.system, before);
  for (let phase = 0; phase < 5; phase += 1) advancePipeline(model);
  assert.equal(model.steps, 1);
  assert.equal(model.bank, 1);
  assert.equal(model.system.elapsed, 0.001);
});

test("P45 cache and rebuild-every-step agree over a bounded trajectory", () => {
  const cached = createPipeline();
  const rebuilt = createPipeline();
  for (let phase = 0; phase < 100; phase += 1) {
    advancePipeline(cached, true);
    advancePipeline(rebuilt, false);
  }
  assert.equal(cached.error, "");
  assert.equal(rebuilt.error, "");
  assert.ok(cached.rebuilds < rebuilt.rebuilds);
  cached.system.particles.forEach((p, i) => {
    const q = rebuilt.system.particles[i];
    assert.ok(Math.hypot(p.position.x - q.position.x, p.position.y - q.position.y) < 1e-10);
  });
  assert.ok(auditPipeline(cached).forceError < 1e-10);
});

test("P45 invalid candidate never changes the committed bank", () => {
  const model = createPipeline();
  model.system.particles[0].velocity.x = 1000;
  const before = structuredClone(model.system);
  advancePipeline(model);
  assert.match(model.error, /Drift/);
  assert.equal(model.steps, 0);
  assert.equal(model.bank, 0);
  assert.deepEqual(model.system, before);
});
