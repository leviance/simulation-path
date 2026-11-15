import assert from "node:assert/strict";
import test from "node:test";
import * as w from "../lib/labs/sph-water.ts";
const close = (a, b, t = 1e-9) =>
  assert.ok(
    Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) <= t,
    `${a} != ${b} ± ${t}`,
  );
const empty = () => {
  const s = w.makeState("empty");
  s.walls = [];
  return s;
};

test("P50 actual scale: 1000/5000/10000, bounded capacity and stage gating", () => {
  for (const n of [1000, 5000, 10000]) assert.equal(w.makeState("dam", n).particles.length, n);
  assert.equal(w.makeState("dam", 1000, 0).particles.length, 0);
  assert.equal(new w.WaterSession(1).state.particles.length, 1000);
  assert.equal(new w.WaterSession(12).state.particles.length, 5000);
  for (const n of [-1, 384, 5001, Infinity]) assert.throws(() => w.makeState("dam", n));
});
test("P50 independent radial normalization and gradient finite differences", () => {
  let integral = 0;
  const dr = w.support / 10000;
  for (let i = 0; i < 10000; i++) {
    const r = (i + 0.5) * dr;
    integral += 2 * Math.PI * r * w.kernel(r) * dr;
  }
  close(integral, 1, 1e-6);
  for (const q of [0.3, 0.8, 1.2, 1.8]) {
    const x = q * w.h,
      e = 1e-6 * w.h,
      d = (w.kernel(x + e) - w.kernel(x - e)) / (2 * e);
    close(w.gradient(x, 0).x, d, 1e-5 * Math.max(1, Math.abs(d)));
  }
  assert.equal(w.kernel(w.support), 0);
  assert.deepEqual(w.gradient(0, 0), { x: 0, y: 0 });
  close(w.gradient(w.h, 0.02).x, -w.gradient(-w.h, -0.02).x);
});
test("P50 self contribution and walls have actual 2D mass units", () => {
  const s = empty();
  s.particles = [w.particle(2, 2)];
  w.computeDensity(s, w.buildNeighbors(s));
  close(s.particles[0].density, (w.mass * 10) / (7 * Math.PI * w.h * w.h));
  const walls = w.makeState("empty").walls;
  assert.equal(walls.length, 1764);
  assert.equal(new Set(walls.map((p) => `${p.x},${p.y}`)).size, walls.length);
  assert.ok(walls.every((p) => p.x < 0 || p.x > w.width || p.y < 0 || p.y > w.height));
});
test("P50 nonzero pair pressure and viscosity match independent C++ numeric oracle", () => {
  const value = w.inspectPair();
  close(value.pressureA, 40000);
  close(value.pressureB, 80000);
  close(value.pressureForce, -962.899070255326, 1e-8);
  close(value.power, -224.529475242557, 1e-8);
  const s = empty();
  s.particles = [w.particle(2, 2, 1), w.particle(2 + w.h, 2, -1)];
  s.particles[0].density = 1100;
  s.particles[1].density = 1200;
  const settings = { ...w.defaultSettings, gravity: 0, alpha: 0 },
    search = w.buildNeighbors(s, false);
  w.computePressure(s, settings);
  w.computeForces(s, search, settings);
  close(w.mass * s.particles[0].ax, value.pressureForce, 1e-8);
  close(w.mass * (s.particles[0].ax + s.particles[1].ax), 0, 1e-8);
  const separate = w.inspectPair({ ...w.defaultPair, approaching: false });
  assert.equal(separate.pi, 0);
  assert.equal(separate.power, 0);
  close(separate.pressureForce, value.pressureForce);
});
test("P50 pressure clamp and alpha zero do not add hidden attraction or damping", () => {
  assert.equal(w.pressure(900, 20), 0);
  assert.equal(
    w.artificialViscosity(-w.h, 0, 2, 0, 1100, 1200, { ...w.defaultSettings, alpha: 0 }),
    0,
  );
  assert.equal(w.artificialViscosity(-w.h, 0, -2, 0, 1100, 1200, w.defaultSettings), 0);
});
test("P50 grid exactly matches all-pairs at negative cells, corners and cutoff", () => {
  const s = empty();
  s.particles = [
    w.particle(0.1, 0.1),
    w.particle(0.1 + w.support, 0.1),
    w.particle(0.1 + w.support - 1e-8, 0.1),
    w.particle(-0.03, 0.1),
  ];
  s.walls = [w.particle(-0.035, -0.035)];
  assert.deepEqual(w.buildNeighbors(s, true).lists, w.buildNeighbors(s, false).lists);
  const grid = new w.Grid();
  assert.throws(() => grid.cell(1e300, 0));
  assert.throws(() => grid.cell(NaN, 0));
  assert.throws(() => w.buildNeighbors(w.makeState(), false));
});
test("P50 search keeps density pressure force and trajectory of a perturbed fixture", () => {
  const a = empty();
  a.walls = w.makeState("empty").walls;
  for (let y = 0; y < 5; y++)
    for (let x = 0; x < 8; x++)
      a.particles.push(
        w.particle(
          0.03 + x * w.spacing,
          0.03 + y * w.spacing,
          0.1 * Math.sin(x + y),
          0.1 * Math.cos(x - y),
        ),
      );
  const b = structuredClone(a),
    grid = w.buildNeighbors(a, true),
    all = w.buildNeighbors(b, false);
  assert.deepEqual(grid.lists, all.lists);
  assert.ok(grid.candidates < all.candidates);
  for (const [s, search] of [
    [a, grid],
    [b, all],
  ]) {
    w.computeDensity(s, search);
    w.computePressure(s, w.defaultSettings);
    w.computeForces(s, search, w.defaultSettings);
  }
  for (let i = 0; i < a.particles.length; i++)
    for (const key of ["density", "pressure", "ax", "ay"])
      close(a.particles[i][key], b.particles[i][key], 1e-9);
  for (let k = 0; k < 40; k++) {
    w.step(a);
    w.step(b, { ...w.defaultSettings, useGrid: false });
  }
  for (let i = 0; i < a.particles.length; i++) {
    close(a.particles[i].x, b.particles[i].x, 1e-9);
    close(a.particles[i].y, b.particles[i].y, 1e-9);
  }
});
test("P50 early gravity checkpoint has analytic semi-implicit discrete trajectory", () => {
  const s = empty();
  s.particles = [w.particle(5, 5)];
  for (let i = 0; i < 10; i++) w.step(s, w.defaultSettings, 2);
  close(s.time, 0.1, 1e-12);
  close(s.particles[0].vy, -0.981, 1e-12);
  close(s.particles[0].y, 5 - 0.053955, 1e-12);
});
test("P50 equilibrium reference is independent and does not mutate a session", () => {
  const session = new w.WaterSession(12),
    before = structuredClone(session.state);
  const result = session.verify();
  assert.equal(result.passed, true);
  close(result.integral, 1, 1e-6);
  assert.ok(result.equilibriumDrift < 1e-4);
  assert.deepEqual(session.state, before);
});
test("P50 dam and pool update all 5000 particles and report density distribution/leakage", () => {
  for (const preset of ["dam", "pool"]) {
    const s = w.makeState(preset);
    for (let k = 0; k < 8; k++) w.step(s);
    w.inspectCurrent(s);
    const metrics = w.measure(s);
    assert.equal(s.particles.length, 5000);
    assert.equal(s.updated, 5000);
    assert.equal(s.tick, 8);
    assert.equal(metrics.leaked, 0);
    assert.ok(metrics.minimum > 0 && metrics.median > 0.95 && metrics.maximum < 1.5);
    assert.ok(s.dt > 0 && s.dt <= w.maxDt);
  }
});
test("P50 acoustic and force timestep bounds are independently active", () => {
  const s = empty();
  s.particles = [w.particle(2, 2)];
  const settings = { ...w.defaultSettings, soundSpeed: 40 };
  close(w.chooseDt(s, settings), (0.25 * w.h) / 43, 1e-12);
  s.particles[0].ax = 1e8;
  close(w.chooseDt(s, settings), 0.25 * Math.sqrt(w.h / 1e8), 1e-12);
  s.particles[0].ax = 1e20;
  assert.throws(() => w.chooseDt(s, settings));
  s.particles[0].ax = NaN;
  assert.throws(() => w.chooseDt(s, settings));
});
test("P50 invalid inputs fail without pretending finite overflow is success", () => {
  const s = empty();
  s.particles = [w.particle(2, 2)];
  const before = structuredClone(s);
  assert.throws(() => w.step(s, { ...w.defaultSettings, soundSpeed: Infinity }));
  assert.deepEqual(s, before);
  s.particles[0].vx = Infinity;
  assert.throws(() => w.step(s));
  assert.throws(() => w.emitBurst(before, { x: NaN, y: 1 }));
  assert.throws(() => w.targetPaddle(before, Infinity, 1));
});
test("P50 emission conserves explicit mass, rejects overlap and never evicts at capacity", () => {
  const s = empty();
  assert.equal(w.emitBurst(s, { x: 8.6, y: 6.5 }), 7);
  close(w.mass * s.particles.length, 34.3, 1e-10);
  assert.equal(w.emitBurst(s, { x: 8.6, y: 6.5 }), 0);
  assert.equal(s.emitted, 7);
  assert.equal(s.rejected, 7);
  while (s.particles.length < w.capacity) s.particles.push(w.particle(1, 1));
  const first = s.particles[0];
  assert.equal(w.emitBurst(s, { x: 4, y: 4 }), 0);
  assert.equal(s.particles.length, w.capacity);
  assert.equal(s.particles[0], first);
});
test("P50 four walls preserve inward velocity and reflect only outward normals", () => {
  const s = empty(),
    p = w.particle(-1, 1, 2, 3);
  w.collide(s, p);
  assert.equal(p.vx, 2);
  assert.equal(p.vy, 3);
  p.x = -1;
  p.vx = -2;
  w.collide(s, p);
  close(p.vx, 0.1);
  assert.equal(p.vy, 3);
});
test("P50 kinematic target is not teleport, sample velocity and center collision are finite", () => {
  const s = empty();
  s.paddle.enabled = true;
  const x = s.paddle.x;
  w.targetPaddle(s, x + 2, s.paddle.y);
  assert.equal(s.paddle.x, x);
  w.movePaddle(s, 0.001);
  close(s.paddle.x - x, 0.003, 1e-12);
  const p = w.particle(s.paddle.x, s.paddle.y);
  w.collide(s, p);
  assert.ok(
    Math.hypot(p.x - s.paddle.x, p.y - s.paddle.y) >= s.paddle.radius + w.spacing / 2 - 1e-10,
  );
  assert.ok(w.samples(s).every((p) => Number.isFinite(p.x) && Number.isFinite(p.vx)));
});
test("P50 surface consumes all particles and never changes solver data", () => {
  const s = w.makeState(),
    before = structuredClone(s),
    surface = new w.WaterSurface();
  surface.reconstruct(s);
  surface.shade();
  assert.equal(surface.drawn, 5000);
  assert.equal(surface.rgba.length, 720 * 432 * 4);
  assert.ok(surface.coverage.some((v) => v > 0.5));
  assert.deepEqual(s, before);
  s.particles = [];
  surface.reconstruct(s);
  assert.equal(surface.drawn, 0);
  assert.ok(surface.coverage.every((v) => v === 0));
});
test("P50 session budgets work, N pauses running, reset retains chosen configuration, dispose stops", () => {
  const s = new w.WaterSession(12);
  s.chooseScene("empty");
  s.state.particles = [w.particle(3, 3)];
  s.resume();
  let clock = 0;
  s.advance(0.5, 0, () => ++clock);
  assert.ok(s.state.tick <= 1);
  assert.ok(s.dropped > 0.45);
  s.singleStep();
  assert.equal(s.paused, true);
  s.chooseCount(1000);
  s.parameter({ soundSpeed: 28 });
  s.reset();
  assert.equal(s.preset, "empty");
  assert.equal(s.count, 1000);
  assert.equal(s.settings.soundSpeed, 28);
  assert.equal(s.state.time, 0);
  s.dispose();
  const time = s.state.time;
  s.resume();
  s.advance(0.02);
  assert.equal(s.state.time, time);
  assert.equal(s.paused, true);
  assert.throws(() => s.advance(NaN));
});
test("P50 session mouse and keyboard preserve model time until physics runs", () => {
  const s = new w.WaterSession(12);
  s.chooseScene("empty");
  s.beginStroke({ x: 8.6, y: 6.5 });
  s.moveStroke({ x: 9, y: 6.5 });
  s.endStroke();
  assert.equal(s.state.emitted, 7);
  assert.equal(s.state.time, 0);
  s.tool = "paddle";
  s.state.paddle.enabled = true;
  const x = s.state.paddle.x;
  s.beginStroke({ x: 8, y: 2 });
  s.endStroke();
  assert.equal(s.state.paddle.x, x);
  assert.equal(s.state.paddle.targetX, 8);
  s.singleStep();
  assert.ok(s.state.paddle.x > x);
});
