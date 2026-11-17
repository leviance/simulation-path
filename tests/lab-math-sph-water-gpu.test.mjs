import test from "node:test";
import assert from "node:assert/strict";
import * as w from "../lib/labs/sph-water-gpu.ts";
import { WallNeighborhood } from "../lib/labs/sph-water-gpu/walls.ts";
import { WaterSession } from "../lib/labs/sph-water-gpu/session3d.ts";
import { WaterDepth } from "../lib/labs/sph-water-gpu/water-depth.ts";
import { shadeWater } from "../lib/labs/sph-water-gpu/water-shade.ts";
import { reconstructWaterSurface } from "../lib/labs/sph-water-gpu/water-surface.ts";
const near = (a, b, t = 1e-8) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) < t, a + " != " + b);

test("P51 surface reconstruction removes lattice-scale ripples in depth and thickness together", () => {
  const surface = new WaterDepth(80, 80);
  let beforeDepth = 0,
    beforeThickness = 0;
  for (let y = 0; y < 80; y++) {
    for (let x = 0; x < 80; x++) {
      const ripple = Math.cos((x * Math.PI) / 2) * Math.cos((y * Math.PI) / 2);
      const index = x + y * 80;
      surface.depth[index] = 2 + 0.015 * ripple;
      surface.thickness[index] = 0.12 + 0.04 * ripple;
      if (x >= 16 && x < 64 && y >= 16 && y < 64) {
        beforeDepth += (surface.depth[index] - 2) ** 2;
        beforeThickness += (surface.thickness[index] - 0.12) ** 2;
      }
    }
  }
  surface.smooth(0.05);
  let afterDepth = 0,
    afterThickness = 0;
  for (let y = 16; y < 64; y++)
    for (let x = 16; x < 64; x++) {
      const index = x + y * 80;
      afterDepth += (surface.depth[index] - 2) ** 2;
      afterThickness += (surface.thickness[index] - 0.12) ** 2;
    }
  assert.ok(afterDepth < beforeDepth * 0.01);
  assert.ok(afterThickness < beforeThickness * 0.01);
});

test("P51 joint filter preserves empty pixels, sharp depth separation and constant fields", () => {
  const surface = new WaterDepth(80, 80);
  for (let y = 8; y < 72; y++)
    for (let x = 8; x < 72; x++) {
      const index = x + y * 80;
      surface.depth[index] = x < 40 ? 2 : 4;
      surface.thickness[index] = (x + y) % 2 ? 0.1 : 0.3;
    }
  surface.smooth(0.05);
  for (const x of [24, 56]) {
    near(surface.depth[x + 40 * 80], x < 40 ? 2 : 4, 1e-5);
    near(surface.thickness[x + 40 * 80], 0.2, 1e-5);
  }
  near(surface.depth[39 + 40 * 80], 2, 1e-5);
  near(surface.depth[40 + 40 * 80], 4, 1e-5);
  near(surface.depth[4 + 40 * 80], 0);
  near(surface.thickness[4 + 40 * 80], 0);
  for (const spacing of [0, -1, NaN, Infinity])
    assert.throws(() => reconstructWaterSurface(surface, spacing));
});

test("P51 3D lattice, pool and scale preserve volume and total mass", () => {
  for (const side of [4, 8, 12, 16, 20])
    for (const preset of ["dam", "pool", "obstacle"]) {
      const s = w.makeFluid(side, preset);
      assert.equal(s.count, side ** 3);
      assert.equal(s.position.length, 3 * s.count);
      near(s.mass * s.count, 166.375);
      near(s.h, 1.3 * s.spacing);
      for (let i = 0; i < s.position.length; i++)
        assert.ok(s.position[i] > 0 && s.position[i] < w.tank[i % 3]);
      assert.equal(s.paddle.enabled, preset === "obstacle");
    }
  for (const side of [3, 21, 48, 100, NaN, Infinity]) assert.throws(() => w.makeFluid(side));
  assert.throws(() => w.makeFluid(8, "unknown"));
});
test("P51 normalization is an independent spherical integral; gradient matches finite difference", () => {
  const h = 0.07,
    dr = (2 * h) / 12000;
  let integral = 0;
  for (let i = 0; i < 12000; i++) {
    const r = (i + 0.5) * dr;
    integral += 4 * Math.PI * r * r * w.spline3(r, h) * dr;
  }
  near(integral, 1, 1e-7);
  assert.equal(w.spline3(2 * h, h), 0);
  assert.equal(w.spline3(3 * h, h), 0);
  assert.equal(w.splineGradientFactor(0, h), 0);
  for (const q of [0.2, 0.7, 1.2, 1.8]) {
    const r = q * h,
      e = 1e-7;
    const derivative = (w.spline3(r + e, h) - w.spline3(r - e, h)) / (2 * e);
    near(w.splineGradientFactor(r, h) * r, derivative, 1e-3);
  }
});
test("P51 CSR permutation and every support query match independent all-pairs in 3D", () => {
  const s = w.makeFluid(8),
    grid = new w.FluidGrid(s);
  grid.build(s);
  assert.equal(grid.offset[0], 0);
  assert.equal(grid.offset.at(-1), s.count);
  assert.deepEqual(
    [...grid.ids].sort((a, b) => a - b),
    Array.from({ length: s.count }, (_, i) => i),
  );
  for (let c = 0; c < grid.count.length; c++) assert.ok(grid.offset[c + 1] >= grid.offset[c]);
  for (let i = 0; i < s.count; i++) {
    const actual = [...grid.neighbors.subarray(0, grid.collect(s, i))].sort((a, b) => a - b),
      expected = [];
    for (let j = 0; j < s.count; j++) {
      let r2 = 0;
      for (let a = 0; a < 3; a++) r2 += (s.position[3 * i + a] - s.position[3 * j + a]) ** 2;
      if (r2 < 4 * s.h * s.h) expected.push(j);
    }
    assert.deepEqual(actual, expected);
  }
});
test("P51 concentrated cells do not truncate IDs and exact support cutoff is excluded", () => {
  const s = w.makeFluid(8),
    grid = new w.FluidGrid(s);
  for (let i = 0; i < s.count; i++) s.position.set([0.8, 0.4, 0.5], 3 * i);
  grid.build(s);
  assert.equal(grid.collect(s, 0), 512);
  // Zero origin avoids cancellation in (.8 + support) - .8 at the exact cutoff.
  s.position[0] = 0;
  s.position[3] = grid.size;
  grid.build(s);
  const n = grid.collect(s, 0);
  assert.ok(![...grid.neighbors.subarray(0, n)].includes(1));
});
test("P51 wall lattice supplies corner support without duplicate samples", () => {
  const s = w.makeFluid(12),
    walls = new WallNeighborhood();
  s.position.set([0.82, 0.4, 0.55], 0);
  assert.equal(walls.collect(s, 0), 0);
  s.position.set([s.spacing / 2, s.spacing / 2, 0.55], 0);
  const n = walls.collect(s, 0);
  assert.ok(n > 0);
  const keys = [];
  for (let j = 0; j < n; j++) keys.push([...walls.positions.subarray(3 * j, 3 * j + 3)].join(","));
  assert.equal(new Set(keys).size, n);
});
test("P51 interior pressure forces balance and artificial viscosity removes relative energy", () => {
  const s = w.makeFluid(4),
    p = { ...w.initialParameters, gravity: 0, alpha: 0 };
  for (let i = 0; i < s.count; i++)
    s.position.set(
      [
        0.79 + (i % 4) * 0.02,
        0.38 + (Math.floor(i / 4) % 4) * 0.02,
        0.52 + Math.floor(i / 16) * 0.02,
      ],
      3 * i,
    );
  for (let i = 0; i < s.count; i++) s.velocity[3 * i] = -(s.position[3 * i] - 0.82) * 2;
  const solver = new w.FluidSolver(s);
  solver.evaluate(s, p);
  assert.ok(Math.max(...s.pressure) > 0);
  const base = s.acceleration.slice();
  for (let axis = 0; axis < 3; axis++) {
    let sum = 0;
    for (let i = 0; i < s.count; i++) sum += s.acceleration[3 * i + axis];
    near(sum, 0, 1e-5);
  }
  solver.evaluate(s, { ...p, alpha: 0.5 });
  let power = 0;
  for (let k = 0; k < s.velocity.length; k++)
    power += s.mass * s.velocity[k] * (s.acceleration[k] - base[k]);
  assert.ok(power <= 1e-8);
});
test("P51 real 3D stepping conserves count/mass and closed-domain bounds", () => {
  const s = w.makeFluid(8),
    solver = new w.FluidSolver(s),
    mass = s.mass * s.count;
  for (let i = 0; i < 40; i++) solver.step(s, w.initialParameters);
  assert.equal(s.ticks, 40);
  assert.equal(s.updated, 512);
  assert.ok(s.time > 0);
  assert.equal(s.leakage, 0);
  near(s.mass * s.count, mass);
  for (let k = 0; k < s.position.length; k++)
    assert.ok(
      Number.isFinite(s.position[k]) && s.position[k] >= 0 && s.position[k] <= w.tank[k % 3],
    );
});
test("P51 nonfinite states/parameters fail, never silently continue", () => {
  const s = w.makeFluid(4),
    solver = new w.FluidSolver(s);
  s.velocity[0] = NaN;
  assert.throws(() => solver.step(s, w.initialParameters));
  for (const field of ["soundSpeed", "alpha", "gravity"])
    for (const invalid of [NaN, Infinity, -1])
      assert.throws(() => w.validateParameters({ ...w.initialParameters, [field]: invalid }));
});
test("P51 perspective, aspect, orbit and picking preserve simulation state", () => {
  const s = w.makeFluid(4),
    before = s.position.slice(),
    camera = { ...w.initialWaterCamera };
  const p = w.waterProject([0.6, 0.3, 0.5], camera, 1200, 800),
    q = w.waterProject([0.6, 0.3, 0.5], camera, 1600, 800);
  near(q.x - 800, p.x - 600);
  near(q.y, p.y);
  assert.deepEqual(s.position, before);
  const picked = w.waterGroundPick(camera, 1200, 800, 600, 400);
  assert.ok(picked);
  near(picked[1], 0.22);
  const c = w.limitWaterCamera({ ...camera, distance: 100, pitch: 100 });
  assert.equal(c.distance, 4.5);
  assert.equal(c.pitch, 1.25);
});
test("P51 surface normals shade a coherent mask in both themes (checker-hole regression)", () => {
  for (const [width, height] of [
    [NaN, 100],
    [100, NaN],
    [120.5, 180],
    [100, 0],
    [900, 100],
  ])
    assert.throws(() => new WaterDepth(width, height));
  const s = w.makeFluid(12),
    before = s.position.slice();
  for (const dark of [false, true]) {
    const surface = new WaterDepth(240, 180);
    surface.scene(s, w.initialWaterCamera, dark);
    surface.particles(s, w.initialWaterCamera);
    surface.smooth(s.spacing);
    shadeWater(surface, w.initialWaterCamera);
    let mask = 0,
      colored = 0;
    for (let i = 0; i < surface.depth.length; i++)
      if (surface.depth[i] > 0 && surface.thickness[i] > 0.03) {
        mask++;
        if ([0, 1, 2].some((c) => surface.rgba[4 * i + c] !== surface.background[4 * i + c]))
          colored++;
      }
    assert.ok(mask > 100);
    assert.ok(
      colored / mask > 0.92,
      "normal selection must not turn adjacent pixels into background: " + colored + "/" + mask,
    );
    assert.equal(surface.submitted, s.count);
  }
  assert.deepEqual(s.position, before);
});
test("P51 session configure is transactional, batches bounded, reset keeps independent instances", () => {
  const a = new WaterSession(4),
    b = new WaterSession(4),
    before = { ...a.parameters };
  assert.throws(() => a.configure({ soundSpeed: NaN }));
  assert.deepEqual(a.parameters, before);
  assert.throws(() => a.step(100, 1000));
  a.step();
  assert.equal(a.state.ticks, 1);
  assert.equal(b.state.ticks, 0);
  let notifications = 0;
  const off = a.subscribe(() => notifications++);
  a.play();
  a.pause();
  assert.equal(notifications, 2);
  off();
  a.reset();
  assert.equal(a.state.ticks, 0);
  assert.equal(notifications, 2);
  a.dispose();
  b.dispose();
});
test("P51 obstacle target moves only in its preset, bounded in speed and contact domain", () => {
  const a = new WaterSession(4),
    before = [...a.state.paddle.target];
  a.target([0, 0, 0]);
  assert.deepEqual(a.state.paddle.target, before);
  a.dispose();
  const s = new WaterSession(4, "obstacle");
  s.target([0, 0.22, 0]);
  const start = [...s.state.paddle.position];
  s.step();
  const travel = Math.hypot(...s.state.paddle.position.map((v, i) => v - start[i]));
  assert.ok(travel <= s.state.dt + 1e-12);
  assert.equal(s.state.leakage, 0);
  s.dispose();
});
