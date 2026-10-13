import test from "node:test";
import assert from "node:assert/strict";
import * as fluid from "../lib/labs/stable-fluids.ts";
const near = (actual, expected, tolerance = 1e-10) =>
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) < tolerance,
    `${actual} != ${expected}`,
  );
const wallsZero = (grid) => {
  for (let y = 0; y < grid.n; y++) {
    near(grid.u[y * (grid.n + 1)], 0);
    near(grid.u[y * (grid.n + 1) + grid.n], 0);
  }
  for (let x = 0; x < grid.n; x++) {
    near(grid.v[x], 0);
    near(grid.v[grid.n * grid.n + x], 0);
  }
};
test("fluid MAC dimensions, cell-center positions and brush boundaries stay explicit", () => {
  const grid = fluid.makeGrid(16, "empty");
  assert.equal(grid.density.length, 256);
  assert.equal(grid.u.length, 272);
  assert.equal(grid.v.length, 272);
  near(grid.h, 1 / 16);
  for (const n of [7, 33, NaN, 16.5]) assert.throws(() => fluid.makeGrid(n));
  fluid.paintStroke(grid, { x: 0, y: 0.5 }, { x: 1, y: 0.5 }, 1, 1);
  for (let x = 0; x < 16; x++) near(grid.density[7 * 16 + x], 1);
  const before = grid.density.slice();
  fluid.paintDisk(grid, { x: NaN, y: 0.5 }, 1, 1);
  assert.deepEqual(grid.density, before);
});
test("fluid sampler reproduces affine data on each MAC lattice and uses constant edge extension", () => {
  const grid = fluid.makeGrid(8, "empty");
  for (const [values, w, h, offset] of [
    [grid.density, 8, 8, { x: 0.5, y: 0.5 }],
    [grid.u, 9, 8, { x: 0, y: 0.5 }],
    [grid.v, 8, 9, { x: 0.5, y: 0 }],
  ]) {
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++)
        values[y * w + x] = 2 * (x + offset.x) * grid.h - 3 * (y + offset.y) * grid.h + 1;
    near(fluid.sample(grid, values, w, h, offset, { x: 0.41, y: 0.37 }), 2 * 0.41 - 3 * 0.37 + 1);
    near(fluid.sample(grid, values, w, h, offset, { x: -1, y: -1 }), values[0]);
  }
});
test("fluid scalar backtrace has the correct sign and preserves constants and maximum bounds", () => {
  const grid = fluid.makeGrid(8, "empty");
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) grid.density[y * 8 + x] = (x + 0.5) / 8;
  fluid.advectDensity(grid, true);
  near(grid.density[3 * 8 + 4], 4.5 / 8 - fluid.dt * 0.2);
  const constant = fluid.makeGrid(8, "empty");
  constant.density.fill(0.4);
  constant.u.fill(3);
  constant.v.fill(-2);
  fluid.advectDensity(constant);
  for (const value of constant.density) near(value, 0.4);
  const smoke = fluid.makeGrid(16);
  const before = fluid.measure(smoke);
  fluid.advectDensity(smoke, true);
  const after = fluid.measure(smoke);
  assert.ok(after.minimum >= before.minimum - 1e-12 && after.maximum <= before.maximum + 1e-12);
});
test("fluid MAC divergence telescopes over a closed box and streamfunction velocity is divergence-free", () => {
  const grid = fluid.makeGrid(16, "compressing");
  fluid.computeDivergence(grid);
  near(
    grid.div.reduce((sum, value) => sum + value, 0),
    0,
  );
  const vortex = fluid.makeGrid(16, "vortex");
  near(fluid.computeDivergence(vortex), 0);
  wallsZero(vortex);
});
test("fluid pressure solve reduces an independently computed equation residual without changing velocity", () => {
  const grid = fluid.makeGrid(16, "compressing"),
    beforeU = grid.u.slice(),
    beforeV = grid.v.slice();
  const low = fluid.solvePressure(grid, 20),
    high = fluid.solvePressure(grid, 160);
  assert.ok(high < low / 20);
  assert.deepEqual(grid.u, beforeU);
  assert.deepEqual(grid.v, beforeV);
  let residualSquared = 0;
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const i = y * 16 + x;
      let lap = 0;
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ])
        if (nx >= 0 && nx < 16 && ny >= 0 && ny < 16)
          lap += grid.pressure[ny * 16 + nx] - grid.pressure[i];
      const r = -lap / grid.h ** 2 - grid.rhs[i];
      residualSquared += r * r;
    }
  near(Math.sqrt(residualSquared / 256), high);
  near(grid.pressure.reduce((sum, value) => sum + value, 0) / 256, 0);
});
test("fluid single Jacobi rounds match the numerical lesson and do not advance the simulation", () => {
  const grid = fluid.makeGrid(8, "dipole"),
    u = grid.u.slice(),
    v = grid.v.slice(),
    density = grid.density.slice();
  assert.throws(() => fluid.jacobiIteration(grid), RangeError);
  fluid.beginPressure(grid);
  near(grid.rhs[27], 64);
  near(grid.rhs[28], -64);
  near(fluid.pressureResidual(grid), Math.sqrt(128));
  const first = fluid.jacobiIteration(grid, 3, 3);
  assert.equal(first.count, 4);
  near(first.sum, 0);
  near(first.candidate, 0.25);
  near(first.gauge, 0);
  near(first.result, 0.1875);
  near(grid.pressure[28], -0.1875);
  near(fluid.pressureResidual(grid), Math.sqrt(14));
  const second = fluid.jacobiIteration(grid, 3, 3);
  near(second.sum, -0.1875);
  near(second.candidate, 0.203125);
  near(second.result, 0.19921875);
  assert.equal(fluid.inspectJacobiCell(grid, 0, 0).count, 2);
  assert.equal(fluid.inspectJacobiCell(grid, 0, 3).count, 3);
  assert.deepEqual(grid.u, u);
  assert.deepEqual(grid.v, v);
  assert.deepEqual(grid.density, density);
  assert.equal(grid.tick, 0);
  fluid.beginPressure(grid);
  assert.equal(grid.pressureIterations, 0);
  near(grid.pressure[27], 0);
  for (let i = 0; i < 160; i++) fluid.jacobiIteration(grid);
  assert.throws(() => fluid.jacobiIteration(grid), RangeError);
});
test("fluid projection couples divergence and pressure residual, preserves walls and does not increase the velocity norm", () => {
  const grid = fluid.makeGrid(16, "compressing"),
    energy = fluid.measure(grid).energy;
  const report = fluid.project(grid, 160);
  assert.ok(report.after < report.before * 0.08);
  near(report.after, fluid.dt * report.residual);
  assert.ok(fluid.measure(grid).energy < energy);
  wallsZero(grid);
  const vortex = fluid.makeGrid(16, "vortex"),
    before = vortex.u.slice();
  fluid.project(vortex, 160);
  for (let i = 0; i < before.length; i++) near(vortex.u[i], before[i]);
});
test("fluid velocity advection reads both old components and agrees with a reverse-traversal oracle", () => {
  const grid = fluid.makeGrid(8, "vortex"),
    expectedU = grid.u.slice(),
    expectedV = grid.v.slice(),
    n = grid.n;
  for (let y = n - 1; y >= 0; y--)
    for (let x = n; x >= 0; x--) {
      const p = { x: x * grid.h, y: (y + 0.5) * grid.h },
        v = fluid.velocity(grid, p);
      expectedU[y * (n + 1) + x] = fluid.sample(
        grid,
        grid.u,
        n + 1,
        n,
        { x: 0, y: 0.5 },
        { x: p.x - fluid.dt * v.x, y: p.y - fluid.dt * v.y },
      );
    }
  for (let y = n; y >= 0; y--)
    for (let x = n - 1; x >= 0; x--) {
      const p = { x: (x + 0.5) * grid.h, y: y * grid.h },
        v = fluid.velocity(grid, p);
      expectedV[y * n + x] = fluid.sample(
        grid,
        grid.v,
        n,
        n + 1,
        { x: 0.5, y: 0 },
        { x: p.x - fluid.dt * v.x, y: p.y - fluid.dt * v.y },
      );
    }
  fluid.advectVelocity(grid);
  for (let y = 0; y < n; y++)
    for (let x = 1; x < n; x++) near(grid.u[y * (n + 1) + x], expectedU[y * (n + 1) + x]);
  for (let y = 1; y < n; y++)
    for (let x = 0; x < n; x++) near(grid.v[y * n + x], expectedV[y * n + x]);
  wallsZero(grid);
});
test("fluid implicit viscosity preserves zero viscosity and reduces energy with a small equation residual", () => {
  const grid = fluid.makeGrid(16, "vortex"),
    sourceU = grid.u.slice(),
    sourceV = grid.v.slice(),
    energy = fluid.measure(grid).energy;
  fluid.diffuseVelocity(grid, 0);
  assert.deepEqual(grid.u, sourceU);
  fluid.diffuseVelocity(grid, 0.003);
  assert.ok(fluid.measure(grid).energy < energy);
  wallsZero(grid);
  const a = (0.003 * fluid.dt) / grid.h ** 2;
  for (let y = 0; y < 16; y++)
    for (let x = 1; x < 16; x++) {
      const i = y * 17 + x;
      let lap = grid.u[i - 1] + grid.u[i + 1] - 2 * grid.u[i];
      if (y > 0) lap += grid.u[i - 17] - grid.u[i];
      if (y < 15) lap += grid.u[i + 17] - grid.u[i];
      near(grid.u[i] - a * lap, sourceU[i], 1e-10);
    }
  for (let y = 1; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const i = y * 16 + x;
      let lap = grid.v[i - 16] + grid.v[i + 16] - 2 * grid.v[i];
      if (x > 0) lap += grid.v[i - 1] - grid.v[i];
      if (x < 15) lap += grid.v[i + 1] - grid.v[i];
      near(grid.v[i] - a * lap, sourceV[i], 1e-10);
    }
});
test("fluid mouse impulse is a displacement increment while buoyancy is integrated with dt", () => {
  const grid = fluid.makeGrid(8, "empty");
  grid.density.fill(1);
  fluid.addBuoyancy(grid, 0.8);
  near(grid.v[3 * 8 + 3], fluid.dt * 0.8);
  wallsZero(grid);
  const a = fluid.makeGrid(8, "empty"),
    b = fluid.makeGrid(8, "empty");
  fluid.addImpulse(a, { x: 0.5, y: 0.5 }, { x: 0.1, y: -0.2 });
  fluid.addImpulse(b, { x: 0.5, y: 0.5 }, { x: 0.05, y: -0.1 });
  fluid.addImpulse(b, { x: 0.5, y: 0.5 }, { x: 0.05, y: -0.1 });
  assert.deepEqual(a.u, b.u);
  assert.deepEqual(a.v, b.v);
  wallsZero(a);
});
test("fluid staged pipeline and invalid settings cannot silently change earlier lessons or partial state", () => {
  const grid = fluid.makeGrid(8, "compressing"),
    u = grid.u.slice(),
    d = grid.density.slice();
  assert.equal(fluid.step(grid, { ...fluid.defaultSettings, iterations: 0 }), false);
  assert.deepEqual(grid.u, u);
  assert.deepEqual(grid.density, d);
  assert.equal(grid.tick, 0);
  const pressureOnly = fluid.makeGrid(8, "compressing");
  const before = pressureOnly.u.slice();
  fluid.step(pressureOnly, fluid.defaultSettings, 5);
  assert.deepEqual(pressureOnly.u, before);
  assert.equal(pressureOnly.projection, null);
  const projected = fluid.makeGrid(8, "compressing");
  fluid.step(projected, fluid.defaultSettings, 6);
  assert.ok(projected.projection.after < projected.projection.before);
});
test("fluid fixed steps agree across render schedules and cap stalled-frame work", () => {
  const settings = { ...fluid.defaultSettings, iterations: 40, buoyancy: 0 },
    reference = fluid.makeGrid(8, "vortex");
  for (let i = 0; i < 60; i++) fluid.step(reference, settings);
  for (const fps of [15, 30, 120]) {
    const grid = fluid.makeGrid(8, "vortex");
    let accumulator = 0;
    for (let frame = 0; frame < fps; frame++) {
      const plan = fluid.planSteps(accumulator, 1 / fps);
      accumulator = plan.remainder;
      for (let i = 0; i < plan.steps; i++) fluid.step(grid, settings);
    }
    assert.equal(grid.tick, 60);
    assert.deepEqual(grid.density, reference.density);
    assert.deepEqual(grid.u, reference.u);
  }
  const hitch = fluid.planSteps(0, 10);
  assert.equal(hitch.steps, 4);
  assert.ok(hitch.dropped > 9.9);
  assert.ok(hitch.remainder >= 0 && hitch.remainder < fluid.dt);
});
test("fluid bounded standard validation reports independent numerical invariants", () => {
  const report = fluid.validateFluid();
  assert.equal(report.passed, true);
  assert.ok(report.report.before > 1 && report.report.after < 0.02);
  near(report.constantError, 0);
});
