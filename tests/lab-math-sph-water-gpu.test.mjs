import test from "node:test";
import assert from "node:assert/strict";
import * as w from "../lib/labs/sph-water-gpu.ts";
import { forceFixture } from "../lib/labs/sph-water-gpu/fixtures.ts";
const near = (a, b, t = 1e-9) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) < t, `${a} != ${b}`);

test("Lesson6 fixtures expose pressure and viscosity without advancing particles", () => {
  const plan = w.makePlan(4);
  const compressed = forceFixture(plan, "compressed");
  const before = structuredClone(compressed);
  const report = w.evaluate(plan, compressed, w.defaultSettings, 6);
  assert.ok(Math.max(...report.pressure) > 0);
  assert.ok(Math.max(...report.acceleration.map(w.length)) > 0);
  const stronger = w.evaluate(plan, compressed, { ...w.defaultSettings, soundSpeed: 20 }, 6);
  near(stronger.pressure[0] / report.pressure[0], (20 / 12) ** 2);
  assert.deepEqual(compressed, before);
  const approaching = forceFixture(plan, "approaching");
  const on = w.evaluate(plan, approaching, w.defaultSettings, 6);
  assert.ok(on.acceleration[0].x < 0 && on.acceleration[1].x > 0);
  assert.ok(on.pressure.every((p) => p === 0));
  for (const [particles, settings] of [
    [approaching, { ...w.defaultSettings, alpha: 0 }],
    [forceFixture(plan, "separating"), w.defaultSettings],
  ]) {
    assert.ok(
      w.evaluate(plan, particles, settings, 6).acceleration.every((a) => w.length(a) === 0),
    );
  }
});
test("SPH3D volume kernel, odd gradient and finite-difference oracle agree", () => {
  const plan = w.makePlan();
  let integral = 0;
  const dr = plan.support / 10000;
  for (let i = 0; i < 10000; i++) {
    const r = (i + 0.5) * dr;
    integral += 4 * Math.PI * r * r * w.kernel(r, plan.h) * dr;
  }
  near(integral, 1, 1e-6);
  assert.equal(w.kernel(plan.support, plan.h), 0);
  assert.deepEqual(w.gradient({ x: 0, y: 0, z: 0 }, plan.h), { x: 0, y: 0, z: 0 });
  const d = { x: 0.03, y: 0.02, z: 0.04 },
    g = w.gradient(d, plan.h),
    opposite = w.gradient({ x: -d.x, y: -d.y, z: -d.z }, plan.h),
    epsilon = 1e-6;
  for (const axis of ["x", "y", "z"]) {
    near(g[axis], -opposite[axis]);
    const lo = { ...d, [axis]: d[axis] - epsilon },
      hi = { ...d, [axis]: d[axis] + epsilon };
    near(
      g[axis],
      (w.kernel(w.length(hi), plan.h) - w.kernel(w.length(lo), plan.h)) / (2 * epsilon),
      0.001,
    );
  }
});
test("SPH3D plans keep64kg, exact buffer budgets and bounded CPU workloads", () => {
  for (const side of [4, 8, 32, 48, 100]) {
    const plan = w.makePlan(side);
    near(plan.mass * plan.count, 64);
    assert.ok(plan.residentBytes < 192 * 1024 ** 2);
    assert.equal(plan.levels.at(-1).groups, 1);
    assert.equal(w.cellId(plan, { x: 1, y: 1, z: 1 }), plan.cells - 1);
  }
  assert.throws(() => w.makeParticles(w.makePlan(100)), RangeError);
  for (const side of [0, 101, 8.5, NaN]) assert.throws(() => w.makePlan(side), RangeError);
});
test("SPH3D CSR ranges, permutation and27cell search match all-pairs", () => {
  const plan = w.makePlan(4),
    particles = w.makeParticles(plan),
    grid = w.neighbors(plan, particles, true),
    brute = w.neighbors(plan, particles, false);
  assert.deepEqual(grid.lists, brute.lists);
  assert.equal(new Set(grid.csr.indices).size, particles.length);
  assert.equal(
    grid.csr.counts.reduce((a, b) => a + b, 0),
    particles.length,
  );
  let total = 0;
  for (let cell = 0; cell < plan.cells; cell++) {
    assert.equal(grid.csr.offsets[cell], total);
    total += grid.csr.counts[cell];
    for (let slot = grid.csr.offsets[cell]; slot < total; slot++)
      assert.equal(w.cellId(plan, particles[grid.csr.indices[slot]].position), cell);
  }
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: plan.support, y: 0, z: 0 },
    { x: 0.01, y: 0.01, z: plan.support - 0.001 },
    { x: 1, y: 1, z: 1 },
  ].map((position) => ({ position, velocity: { x: 0, y: 0, z: 0 } }));
  assert.deepEqual(w.neighbors(plan, points, true).lists, w.neighbors(plan, points, false).lists);
  const concentrated = Array.from({ length: 4097 }, () => ({
    position: { x: 0.5, y: 0.5, z: 0.5 },
    velocity: { x: 0, y: 0, z: 0 },
  }));
  assert.throws(() => w.neighbors(plan, concentrated, true), /budget/);
});
test("SPH3D density includes self, staged force/integration and grid are consistent", () => {
  const plan = w.makePlan(4),
    particles = w.makeParticles(plan);
  const single = [{ position: { x: 0.5, y: 0.5, z: 0.5 }, velocity: { x: 0, y: 0, z: 0 } }];
  near(w.evaluate(plan, single).density[0], plan.mass * w.kernel(0, plan.h));
  const grid = w.evaluate(plan, particles, w.defaultSettings),
    brute = w.evaluate(plan, particles, { ...w.defaultSettings, grid: false });
  assert.deepEqual(grid.density, brute.density);
  assert.deepEqual(grid.acceleration, brute.acceleration);
  assert.equal(w.step(plan, particles, w.defaultSettings, 6).particles, particles);
  const position = { x: -0.1, y: 0.5, z: 0.5 },
    velocity = { x: -2, y: 3, z: 4 };
  const next = w.integrate(plan, [{ position, velocity }], [{ x: 0, y: 0, z: 0 }], 0.0005)[0];
  near(next.position.x, plan.spacing / 2);
  near(next.velocity.x, 0.2);
  near(next.velocity.y, 3);
  near(next.velocity.z, 4);
  const invalid = structuredClone(particles);
  invalid[0].velocity.z = NaN;
  assert.throws(() => w.evaluate(plan, invalid), RangeError);
});
test("SPH3D pair viscosity conserves momentum and dissipates relative energy", () => {
  const plan = w.makePlan(),
    d = { x: -0.06, y: 0, z: 0 },
    v = { x: 0.6, y: 0, z: 0 },
    pi = w.viscosity(d, v, 1100, 1200, plan.h, 12, 0.15);
  assert.ok(pi > 0);
  assert.equal(w.viscosity(d, { x: -0.6, y: 0, z: 0 }, 1100, 1200, plan.h, 12, 0.15), 0);
  const forceA = -(plan.mass ** 2) * pi * w.gradient(d, plan.h).x,
    forceB = -forceA;
  near(forceA + forceB, 0);
  assert.ok(0.3 * forceA - 0.3 * forceB < 0);
});
test("SPH3D compressed fixture has repulsive pressure and balanced internal force", () => {
  const plan = w.makePlan();
  const particles = Array.from({ length: 12 }, (_, i) => ({
    position: { x: 0.4 + i * 0.001, y: 0.45 + i * 0.0006, z: 0.5 + i * 0.0008 },
    velocity: { x: 0, y: 0, z: 0 },
  }));
  const report = w.evaluate(plan, particles, { ...w.defaultSettings, gravity: 0, alpha: 0 });
  assert.ok(report.pressure.every((p) => p > 0));
  assert.ok(report.acceleration[0].x < 0 && report.acceleration.at(-1).x > 0);
  for (const axis of ["x", "y", "z"])
    near(
      report.acceleration.reduce((sum, a) => sum + plan.mass * a[axis], 0),
      0,
      1e-8,
    );
});
test("SPH3D active timestep bounds and nonfinite input are independently checked", () => {
  const plan = w.makePlan(100),
    particles = [{ position: { x: 0.5, y: 0.5, z: 0.5 }, velocity: { x: 0, y: 0, z: 0 } }];
  const acoustic = w.chooseDt(plan, particles, [{ x: 0, y: 0, z: 0 }], 20);
  near(acoustic, (0.25 * plan.h) / 20);
  assert.ok(acoustic < w.maxDt);
  near(w.chooseDt(plan, particles, [{ x: 1e6, y: 0, z: 0 }], 12), 0.25 * Math.sqrt(plan.h / 1e6));
  for (const x of [1e12, NaN, Infinity])
    assert.throws(() => w.chooseDt(plan, particles, [{ x, y: 0, z: 0 }], 12), RangeError);
});
