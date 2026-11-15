import assert from "node:assert/strict";
import test from "node:test";
import {
  makeGrid,
  makeScene,
  sample,
  rms,
  fixedDt,
  backtrace,
  advectSmoke,
  advectSmokeDetailed,
  advectVelocity,
  divergence,
  enforceWalls,
  preparePressure,
  pressureResidual,
  jacobiIteration,
  project,
  parametersForStage,
  paintDisk,
  paintStroke,
  impulseAt,
  confineVorticity,
  diffuseVelocity,
  diagnose,
  planSteps,
  step,
  validate,
  FluidSession,
  fromScreen,
  viewport,
} from "../lib/labs/stable-fluids.ts";
const near = (a, b, t = 1e-10) => assert.ok(Math.abs(a - b) <= t, `${a} != ${b}`);
test("P49 allocates actual MAC work at 128 and 256, rejects malformed sizes", () => {
  for (const n of [128, 256]) {
    const g = makeGrid(n);
    assert.equal(g.density.length, n * n);
    assert.equal(g.u.length + g.v.length, 2 * n * (n + 1));
  }
  for (const n of [0, 24, 129, 512, NaN, 8.5]) assert.throws(() => makeGrid(n));
});
test("P49 bilinear affine oracle on three sample offsets and constant extension", () => {
  const g = makeGrid(16);
  for (const offset of [
    { x: 0.5, y: 0.5 },
    { x: 0, y: 0.5 },
    { x: 0.5, y: 0 },
  ]) {
    const values = Float64Array.from(
      { length: 256 },
      (_, i) => 2 * ((i % 16) + offset.x) * g.h - 3 * (Math.floor(i / 16) + offset.y) * g.h + 4,
    );
    near(sample(g, values, 16, 16, offset, { x: 0.37, y: 0.63 }), 2 * 0.37 - 3 * 0.63 + 4);
    near(sample(g, values, 16, 16, offset, { x: -5, y: -5 }), values[0]);
  }
  assert.throws(() => sample(g, g.density, 16, 16, { x: 0.5, y: 0.5 }, { x: NaN, y: 0 }));
});
test("P49 midpoint backtrace sign and independent affine translation", () => {
  const g = makeGrid(16);
  g.u.fill(0.18);
  near(backtrace(g, { x: 0.5, y: 0.5 }, fixedDt).x, 0.497);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) g.density[y * 16 + x] = x * g.h;
  advectSmoke(g);
  near(g.density[8 * 16 + 8], 0.5 - 0.18 * fixedDt);
});
test("P49 first-order and limited MacCormack preserve a constant and extrema", () => {
  for (const method of [advectSmoke, advectSmokeDetailed]) {
    const g = makeScene(32, "vortex");
    g.density.fill(0.4);
    method(g);
    for (const v of g.density) near(v, 0.4, 1e-12);
    const q = makeScene(32, "vortex"),
      max = Math.max(...q.density);
    method(q);
    for (const v of q.density) assert.ok(v >= 0 && v <= max + 1e-12);
  }
});
test("P49 velocity advection reads both components from old state", () => {
  const g = makeScene(16, "vortex"),
    old = structuredClone(g);
  advectVelocity(g);
  for (let y = 1; y < 16; y++)
    for (let x = 0; x < 16; x++) {
      const p = { x: (x + 0.5) * g.h, y: y * g.h };
      near(
        g.v[y * 16 + x],
        sample(old, old.v, 16, 17, { x: 0.5, y: 0 }, backtrace(old, p, fixedDt)),
      );
    }
});
test("P49 divergence telescopes, streamfunction is div-free and walls are normal zero", () => {
  const g = makeScene(32, "compression");
  near(
    g.divergence.reduce((a, b) => a + b, 0),
    0,
    1e-10,
  );
  assert.ok(rms(g.divergence) > 1);
  const v = makeScene(32, "vortex");
  assert.ok(divergence(v) < 1e-12);
  for (let y = 0; y < 32; y++) {
    assert.equal(v.u[y * 33], 0);
    assert.equal(v.u[y * 33 + 32], 0);
  }
});
test("P49 fixed Jacobi 8x8 two-round hand oracle and true residual", () => {
  const g = makeScene(8, "jacobi");
  preparePressure(g, true);
  near(g.rhs[27], 64);
  near(g.rhs[28], -64);
  jacobiIteration(g);
  near(g.pressure[27], 0.1875);
  near(g.pressure[28], -0.1875);
  near(pressureResidual(g), Math.sqrt(14));
  jacobiIteration(g);
  near(g.pressure[27], 0.19921875);
  near(g.rhs[27], 64);
  assert.equal(g.tick, 0);
});
test("P49 reference projection fixture agrees with C++ and reports unconverged Jacobi truthfully", () => {
  const r = validate();
  assert.equal(r.pass, true);
  assert.equal(r.small.converged, false);
  near(r.large.after, 0.00010725079495922615, 1e-10);
  near(r.large.after, fixedDt * r.large.residual, 1e-9);
});
test("P49 independent Neumann eigenmode pressure oracle for CG and PCG", () => {
  for (const method of ["cg", "pcg"]) {
    const n = 32,
      g = makeGrid(n),
      exact = Float64Array.from(
        { length: n * n },
        (_, i) =>
          Math.cos((Math.PI * ((i % n) + 0.5)) / n) *
          Math.cos((2 * Math.PI * (Math.floor(i / n) + 0.5)) / n),
      );
    const lambda =
      (4 * Math.sin(Math.PI / (2 * n)) ** 2 + 4 * Math.sin(Math.PI / n) ** 2) / (g.h * g.h);
    for (let y = 0; y < n; y++)
      for (let x = 1; x < n; x++)
        g.u[y * (n + 1) + x] = (fixedDt * (exact[y * n + x] - exact[y * n + x - 1])) / g.h;
    for (let y = 1; y < n; y++)
      for (let x = 0; x < n; x++)
        g.v[y * n + x] = (fixedDt * (exact[y * n + x] - exact[(y - 1) * n + x])) / g.h;
    preparePressure(g, false);
    for (let i = 0; i < exact.length; i++) near(g.rhs[i], lambda * exact[i], 1e-10);
    const r = project(g, { ...parametersForStage(), method });
    assert.equal(r.converged, true);
    for (let i = 0; i < exact.length; i++) near(g.pressure[i], exact[i], 5e-5);
  }
});
test("P49 projection leaves divergence-free flow unchanged and retains last-solve parameters", () => {
  const g = makeScene(16, "vortex"),
    u = g.u.slice(),
    p = parametersForStage();
  project(g, p);
  for (let i = 0; i < u.length; i++) near(g.u[i], u[i]);
  p.method = "jacobi";
  p.pressureBudget = 40;
  assert.equal(g.projection.method, "pcg");
  assert.equal(g.projection.budget, 384);
});
test("P49 viscosity source is fixed, nu=0 identity, implicit equation and energy oracle", () => {
  const g = makeScene(16, "vortex"),
    old = g.u.slice(),
    energy = diagnose(g).energy;
  diffuseVelocity(g, 0);
  assert.deepEqual(g.u, old);
  diffuseVelocity(g, 0.003);
  assert.ok(diagnose(g).energy < energy);
  const a = (0.003 * fixedDt) / (g.h * g.h);
  for (let y = 1; y < 15; y++)
    for (let x = 1; x < 16; x++) {
      const i = y * 17 + x;
      near(
        (1 + 4 * a) * g.u[i] - a * (g.u[i - 1] + g.u[i + 1] + g.u[i - 17] + g.u[i + 17]),
        old[i],
      );
    }
});
test("P49 confinement is a force from curl, epsilon=0 identity, no random image animation", () => {
  const g = makeScene(16, "vortex"),
    u = g.u.slice();
  confineVorticity(g, 0);
  assert.deepEqual(g.u, u);
  confineVorticity(g, 8);
  assert.notDeepEqual(g.u, u);
  for (const v of g.u) assert.ok(Number.isFinite(v));
  for (let y = 0; y < 16; y++) assert.equal(g.u[y * 17], 0);
  assert.throws(() => confineVorticity(g, 21));
});
test("P49 brush is idempotent, stroke connected, malformed ink does not corrupt state", () => {
  const g = makeScene(32, "empty");
  paintStroke(g, { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }, 2, false);
  for (let x = 7; x < 25; x++) assert.equal(g.density[16 * 32 + x], 1);
  const old = g.density.slice();
  paintStroke(g, { x: 0.2, y: 0.5 }, { x: 0.8, y: 0.5 }, 2, false);
  assert.deepEqual(g.density, old);
  paintDisk(g, { x: 0.5, y: 0.5 }, 2, false, { r: NaN, g: 1, b: 1 });
  assert.deepEqual(g.density, old);
});
test("P49 impulse invalidates old RHS/report but not scalar", () => {
  const g = makeScene(16, "vortex");
  project(g, parametersForStage());
  const d = g.density.slice();
  impulseAt(g, { x: 0.5, y: 0.5 }, { x: 0.05, y: 0 });
  assert.equal(g.projection, null);
  assert.equal(g.pressureReady, false);
  assert.deepEqual(g.density, d);
});
test("P49 invalid parameters and NaN are rejected before mutation", () => {
  const g = makeScene(16, "vortex"),
    old = g.density.slice();
  assert.equal(step(g, { ...parametersForStage(), viscosity: NaN }, "vortex"), false);
  assert.deepEqual(g.density, old);
  assert.throws(() => project(g, { ...parametersForStage(), method: "invented" }));
  g.density[0] = NaN;
  assert.equal(step(g, parametersForStage(), "vortex"), false);
});
test("P49 fixed timestep schedules 15/30/120 FPS and bounded catch-up", () => {
  for (const fps of [15, 30, 120]) {
    let accumulator = 0,
      ticks = 0;
    for (let i = 0; i < fps; i++) {
      const p = planSteps(accumulator, 1 / fps);
      ticks += p.steps;
      accumulator = p.remainder;
    }
    assert.equal(ticks, 60);
    near(accumulator, 0, 1e-9);
  }
  const p = planSteps(0, 10);
  assert.equal(p.steps, 4);
  assert.ok(p.dropped > 9.9);
  assert.ok(p.remainder < fixedDt);
});
test("P49 session click adds smoke, drag only stirs, cancelled/probe strokes do nothing", () => {
  const s = new FluidSession();
  s.chooseScene("empty");
  s.beginStroke({ x: 0.5, y: 0.5 });
  s.endStroke();
  assert.ok(diagnose(s.grid).mass > 0);
  s.reset();
  s.beginStroke({ x: 0.3, y: 0.5 });
  s.moveStroke({ x: 0.7, y: 0.5 });
  s.endStroke();
  near(diagnose(s.grid).mass, 0);
  assert.ok(rms(s.grid.u) > 0);
  s.reset();
  s.beginStroke({ x: 0.5, y: 0.5 });
  s.endStroke(false);
  near(diagnose(s.grid).mass, 0);
  s.tool = "probe";
  s.beginStroke({ x: 0.3, y: 0.5 });
  s.moveStroke({ x: 0.7, y: 0.5 });
  s.endStroke();
  near(rms(s.grid.u), 0);
  near(diagnose(s.grid).mass, 0);
});
test("P49 session reset keeps scene/size/settings, finite frame budget and dispose stop work", () => {
  const s = new FluidSession(15);
  s.rebuild(16, "vortex");
  s.parameters.viscosity = 0.0005;
  s.reset();
  assert.equal(s.grid.n, 16);
  assert.equal(s.scene, "vortex");
  assert.equal(s.parameters.viscosity, 0.0005);
  s.mount();
  s.paused = false;
  let now = 0;
  s.advance(0.2, 12, () => {
    now += 10;
    return now;
  });
  assert.equal(s.grid.tick, 1);
  assert.ok(s.dropped > 0);
  s.dispose();
  s.advance(1);
  assert.equal(s.grid.tick, 1);
  assert.equal(s.mounted, false);
});
test("P49 logical pointer transform is independent of DPR and rejects letterbox", () => {
  const v = viewport(800, 600);
  near(fromScreen(800, 600, { x: v.x + v.size * 0.3, y: v.y + v.size * 0.6 }).x, 0.3);
  near(fromScreen(800, 600, { x: v.x + v.size * 0.3, y: v.y + v.size * 0.6 }).y, 0.4);
  assert.equal(fromScreen(800, 600, { x: 0, y: 0 }), null);
});
test("P49 rejects nonfinite warm start and future-stage solvers without crashing the session", () => {
  const grid = makeScene(16, "empty");
  grid.pressure[0] = NaN;
  assert.equal(step(grid, parametersForStage(), "empty"), false);
  const early = makeScene(16, "empty");
  assert.equal(step(early, parametersForStage(), "empty", 5), false);
  const session = new FluidSession();
  session.grid.pressure[0] = NaN;
  assert.equal(session.singleStep(), false);
  assert.equal(session.paused, true);
  assert.ok(session.error);
});
test("P49 finite extreme inputs cannot report infinity <= infinity as convergence", () => {
  const grid = makeGrid(16);
  grid.u.fill(1e308);
  assert.throws(() => project(grid, parametersForStage()), /overflow/);
  assert.equal(grid.projection, null);
  const session = new FluidSession();
  session.grid.u.fill(1e308);
  assert.equal(session.singleStep(), false);
  assert.equal(session.paused, true);
  assert.match(session.error, /overflow/);
});
