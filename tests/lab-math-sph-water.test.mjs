import assert from "node:assert/strict";
import test from "node:test";
import * as w from "../lib/labs/sph-water.ts";
const close = (actual, expected, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test("SPH kernel is normalized in 2D, compact and has an odd analytic gradient", () => {
  assert.equal(w.kernel(w.support), 0);
  assert.equal(w.kernel(3 * w.h), 0);
  close(w.kernel(0), 10 / (7 * Math.PI * w.h ** 2));
  let integral = 0;
  const dr = w.support / 5000;
  for (let i = 0; i < 5000; i++) {
    const r = (i + 0.5) * dr;
    integral += 2 * Math.PI * r * w.kernel(r) * dr;
  }
  close(integral, 1, 1e-7);
  assert.deepEqual(w.gradient({ x: 0, y: 0 }), { x: 0, y: 0 });
  for (const x of [0.01, w.h, 0.08]) {
    const d = { x, y: 0.015 },
      epsilon = 1e-6;
    const finiteDifference =
      (w.kernel(w.length({ x: x + epsilon, y: d.y })) -
        w.kernel(w.length({ x: x - epsilon, y: d.y }))) /
      (2 * epsilon);
    close(w.gradient(d).x, finiteDifference, 1e-4);
    close(w.gradient(d).x, -w.gradient({ x: -x, y: -d.y }).x);
  }
});
test("SPH density includes self, walls and a directly summed lattice oracle", () => {
  const state = w.makeState("dam"),
    neighbors = w.buildNeighbors(state, false);
  w.computeDensity(state, neighbors);
  const i = 35,
    point = state.particles[i].position;
  let oracle = 0;
  for (const p of [...state.particles.map((v) => v.position), ...state.walls])
    oracle += w.mass * w.kernel(Math.hypot(point.x - p.x, point.y - p.y));
  close(state.particles[i].density, oracle);
  const isolated = w.makeState("empty");
  isolated.walls = [];
  isolated.particles.push(w.particle({ x: 0.5, y: 0.5 }));
  w.computeDensity(isolated, w.buildNeighbors(isolated, true));
  close(isolated.particles[0].density, w.mass * w.kernel(0));
  const withoutWalls = structuredClone(state);
  withoutWalls.walls = [];
  w.computeDensity(withoutWalls, w.buildNeighbors(withoutWalls, false));
  assert.ok(state.particles[0].density > withoutWalls.particles[0].density);
});
test("SPH grid equals all-pairs including negative wall cells, corners and support cutoff", () => {
  for (const preset of ["dam", "pool", "pair", "empty"]) {
    const state = w.makeState(preset);
    const brute = w.buildNeighbors(state, false),
      grid = w.buildNeighbors(state, true);
    assert.deepEqual(grid.lists, brute.lists);
    if (state.particles.length) assert.ok(grid.candidates < brute.candidates);
  }
  const state = w.makeState("empty");
  state.walls = [];
  state.particles = [
    w.particle({ x: 0, y: 0 }),
    w.particle({ x: w.support, y: 0 }),
    w.particle({ x: -0.001, y: 0 }),
  ];
  assert.deepEqual(w.buildNeighbors(state, true).lists, [[0, 2], [1], [0, 2]]);
});
test("SPH pressure and artificial viscosity give opposite pair forces and dissipative power", () => {
  const state = w.makeState("pair");
  state.walls = [];
  state.particles[0].density = 1100;
  state.particles[1].density = 1200;
  w.computePressure(state, 12);
  close(state.particles[0].pressure, 14400);
  const settings = { ...w.defaultSettings, gravity: 0, alpha: 0 },
    neighbors = w.buildNeighbors(state, false);
  const pressure = w.accelerations(state, neighbors, settings, 6);
  assert.ok(pressure[0].x < 0 && pressure[1].x > 0);
  close(pressure[0].x + pressure[1].x, 0);
  const viscous = w.accelerations(state, neighbors, { ...settings, alpha: 0.15 }, 6);
  close(viscous[0].x + viscous[1].x, 0);
  const power = state.particles.reduce(
    (sum, p, i) => sum + w.mass * w.dot(p.velocity, w.subtract(viscous[i], pressure[i])),
    0,
  );
  assert.ok(power < 0);
  assert.equal(w.artificialViscosity({ x: 0.1, y: 0 }, { x: 1, y: 0 }, 1000, 1000, 12, 0.15), 0);
  state.particles[0].density = 900;
  w.computePressure(state, 12);
  assert.equal(state.particles[0].pressure, 0);
});
test("SPH integration reads all old forces and collision reflects only an outward normal", () => {
  const state = w.makeState("empty");
  state.particles = [w.particle({ x: 0.5, y: 0.5 })];
  state.walls = [];
  w.integrate(state, [{ x: 0, y: -9.81 }], 0.001);
  close(state.particles[0].velocity.y, -0.00981);
  close(state.particles[0].position.y, 0.49999019);
  const position = { x: -0.2, y: 0.4 },
    velocity = { x: -2, y: 3 };
  w.collide(position, velocity);
  close(position.x, w.spacing / 2);
  close(velocity.x, 0.2);
  close(velocity.y, 3);
  const inward = { x: 2, y: 0 };
  w.collide({ x: -1, y: 0.4 }, inward);
  close(inward.x, 2);
});
test("SPH isolated pair inspector matches the lesson without solving density or advancing time", () => {
  const report = w.inspectPair();
  assert.deepEqual(
    report.state.particles.map((p) => p.density),
    [1100, 1200],
  );
  assert.deepEqual(
    report.state.particles.map((p) => p.pressure),
    [14400, 28800],
  );
  assert.equal(report.state.walls.length, 0);
  assert.equal(report.state.time, 0);
  close(report.gradient.x, 1617.2744726384344, 1e-9);
  close(report.pressureForce[0].x, -211.56105354248845, 1e-9);
  close(report.pressureForce[1].x, 211.56105354248845, 1e-9);
  close(report.pi, 0.0009070297226124577);
  close(report.viscosityPower, -3.609163493617516, 1e-9);
  close(report.netForce.x, 0);
  close(report.netForce.y, 0);
  const separated = w.inspectPair({ ...w.defaultPair, approaching: false });
  assert.equal(separated.pi, 0);
  close(separated.viscosityPower, 0);
  assert.deepEqual(separated.pressureForce, report.pressureForce);
  const noViscosity = w.inspectPair(w.defaultPair, { ...w.defaultSettings, alpha: 0 });
  close(noViscosity.viscosityPower, 0);
  const lowDensity = w.inspectPair({ ...w.defaultPair, densityA: 900, densityB: 900 });
  assert.ok(lowDensity.pressureForce.every((f) => f.x === 0 && f.y === 0));
  const stiffer = w.inspectPair(w.defaultPair, { ...w.defaultSettings, soundSpeed: 20 });
  close(stiffer.pressureForce[0].x / report.pressureForce[0].x, 20 ** 2 / 12 ** 2);
  assert.throws(() => w.inspectPair({ ...w.defaultPair, densityA: NaN }), RangeError);
});
test("SPH emitter conserves fixed mass, rejects overlap/nonfinite and respects capacity", () => {
  const state = w.makeState("empty");
  assert.equal(w.pour(state, { x: 0.5, y: 0.7 }), true);
  close(w.measure(state).mass, w.mass);
  assert.equal(w.pour(state, { x: 0.5, y: 0.7 }), false);
  assert.equal(w.pour(state, { x: NaN, y: 0.7 }), false);
  state.particles = Array.from({ length: w.capacity }, () => w.particle({ x: 0.1, y: 0.1 }));
  assert.equal(w.pour(state, { x: 0.5, y: 0.7 }), false);
  assert.equal(state.particles.length, w.capacity);
});
test("SPH timestep respects acoustic/force bounds and limits stalled frames", () => {
  const state = w.makeState("pair");
  state.walls = [];
  const settings = { ...w.defaultSettings, gravity: 0 };
  const acceleration = [
    { x: 100, y: 0 },
    { x: -100, y: 0 },
  ];
  const dt = w.chooseDt(state, acceleration, settings);
  assert.ok(dt <= (0.25 * w.h) / (12 + 0.3));
  assert.ok(dt <= 0.25 * Math.sqrt(w.h / 100));
  assert.ok(dt <= w.maxDt);
  const plan = w.advanceFrame(state, settings, 0, 2, false, { x: 0.6, y: 0.7 });
  assert.ok(plan.steps <= 64);
  assert.ok(plan.dropped >= 1.95);
  assert.throws(() => w.advanceFrame(state, settings, 0, -1, false, { x: 0, y: 0 }), RangeError);
  assert.throws(() => w.prepare(state, { ...settings, soundSpeed: Infinity }), RangeError);
});
test("SPH acoustic and force timestep limits each become active independently", () => {
  const state = w.makeState("pair");
  state.walls = [];
  for (const p of state.particles) p.velocity = { x: 0, y: 0 };
  const zero = state.particles.map(() => ({ x: 0, y: 0 }));
  const acoustic = w.chooseDt(state, zero, { ...w.defaultSettings, soundSpeed: 20 });
  close(acoustic, (0.25 * w.h) / 20);
  assert.ok(acoustic < w.maxDt);
  const forcing = state.particles.map(() => ({ x: 1e6, y: 0 }));
  const force = w.chooseDt(state, forcing, w.defaultSettings);
  close(force, 0.25 * Math.sqrt(w.h / 1e6));
  assert.ok(force < acoustic);
  close(w.chooseDt(state, zero, w.defaultSettings), w.maxDt);
  for (const magnitude of [1e12, NaN, Infinity])
    assert.throws(
      () =>
        w.chooseDt(
          state,
          state.particles.map(() => ({ x: magnitude, y: 0 })),
          w.defaultSettings,
        ),
      RangeError,
    );
  assert.throws(() => w.chooseDt(state, [], w.defaultSettings), RangeError);
  state.particles[0].velocity.x = 1e9;
  assert.throws(() => w.chooseDt(state, zero, w.defaultSettings), RangeError);
});
test("SPH simulation is deterministic across 30/60/120 frame schedules when no time is discarded", () => {
  const runs = [30, 60, 120].map((fps) => {
    const state = w.makeState("pair");
    state.walls = [];
    let accumulator = 0,
      discarded = 0;
    for (let frame = 0; frame < fps; frame++) {
      const plan = w.advanceFrame(
        state,
        { ...w.defaultSettings, gravity: 0 },
        accumulator,
        1 / fps,
        false,
        { x: 0.6, y: 0.7 },
      );
      accumulator = plan.remainder;
      discarded += plan.dropped;
    }
    close(discarded, 0);
    return state;
  });
  for (const state of runs) {
    close(state.time, 1, 1e-9);
    close(state.particles[0].position.x, runs[0].particles[0].position.x, 1e-9);
  }
});
test("SPH finite dam fixture stays in bounds and grid matches the brute solver", () => {
  const grid = w.makeState(),
    brute = structuredClone(grid);
  for (let i = 0; i < 150; i++) {
    w.step(grid);
    w.step(brute, { ...w.defaultSettings, useGrid: false });
  }
  assert.deepEqual(grid, brute);
  assert.ok(w.finiteState(grid));
  assert.ok(
    grid.particles.every(
      (p) =>
        p.position.x >= w.spacing / 2 &&
        p.position.x <= 1 - w.spacing / 2 &&
        p.position.y >= w.spacing / 2 &&
        p.position.y <= 0.8 - w.spacing / 2,
    ),
  );
  assert.ok(w.validateWater().every((result) => result.pass));
});
