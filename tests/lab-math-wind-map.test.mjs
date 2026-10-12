import test from "node:test";
import assert from "node:assert/strict";
import * as wind from "../lib/labs/wind-map.ts";
const near = (actual, expected, tolerance = 1e-10) =>
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );

test("wind nodes include domain endpoints and pointer mapping round-trips without letterbox clamping", () => {
  for (const size of [
    [33, 25],
    [65, 49],
    [3, 4],
  ]) {
    const field = wind.makeField(...size);
    assert.deepEqual(wind.world(field, 0, 0), { x: -2, y: -1.5 });
    assert.deepEqual(wind.world(field, field.width - 1, field.height - 1), { x: 2, y: 1.5 });
  }
  for (const dimensions of [
    [760, 340],
    [300, 600],
    [800, 600],
  ])
    for (const point of [
      { x: 0, y: 0 },
      { x: -1.5, y: 1 },
      { x: 2, y: -1.5 },
    ]) {
      const back = wind.fromScreen(...dimensions, wind.toScreen(...dimensions, point));
      assert.ok(back);
      near(back.x, point.x);
      near(back.y, point.y);
    }
  assert.equal(wind.fromScreen(760, 340, { x: 0, y: 0 }), null);
  for (const size of [
    [2, 3],
    [130, 25],
    [33.5, 25],
    [NaN, 25],
  ])
    assert.throws(() => wind.makeField(...size));
});
test("wind affine presets have independent divergence and curl answers at every node including boundaries", () => {
  for (const [preset, div, spin] of [
    ["uniform", 0, 0],
    ["source", 2, 0],
    ["sink", -2, 0],
    ["rotation", 0, 2],
    ["shear", 0, -1],
  ]) {
    const field = wind.makeField(17, 13);
    wind.populate(field, { ...wind.initialScene(), preset });
    for (let y = 0; y < field.height; y++)
      for (let x = 0; x < field.width; x++) {
        near(wind.divergence(field, x, y), div);
        near(wind.curl(field, x, y), spin);
      }
  }
});
test("wind checkpoints expose uniform, scalar gradient and local vortex in the taught order", () => {
  const field = wind.makeField(),
    scene = { ...wind.initialScene(), preset: "source", vortex: true };
  wind.populate(field, scene, 1);
  near(field.vx[0], 1);
  near(field.vy[0], 0.25);
  wind.populate(field, scene, 2);
  near(field.vx[0], -2);
  near(field.vy[0], -1.5);
  const gradientScene = { ...scene, preset: "gradient" };
  wind.populate(field, gradientScene, 3);
  near(field.vx[0], -2);
  near(field.vy[0], -1.5);
  wind.populate(field, scene, 7);
  const base = field.vx.slice();
  wind.populate(field, scene, 8);
  assert.notDeepEqual(field.vx, base);
});
test("wind scalar bowl gradient is exact and hill refinement reduces interior and boundary error", () => {
  const field = wind.makeField(),
    scene = { ...wind.initialScene(), preset: "gradient" };
  wind.populate(field, scene);
  const bowl = wind.gradientError(field, "bowl");
  near(bowl.interior, 0);
  near(bowl.boundary, 0);
  scene.potential = "hill";
  wind.populate(field, scene);
  const coarse = wind.gradientError(field, "hill");
  const fine = wind.makeField(65, 49);
  wind.populate(fine, scene);
  const refined = wind.gradientError(fine, "hill");
  assert.ok(coarse.interior > 0.001 && coarse.boundary > 0.001);
  assert.ok(refined.interior < coarse.interior / 3 && refined.boundary < coarse.boundary / 3);
});
test("wind discrete gradient has zero curl even where the one-sided operators are used", () => {
  const field = wind.makeField();
  wind.populate(field, { ...wind.initialScene(), preset: "gradient", potential: "hill" });
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++) near(wind.curl(field, x, y), 0);
});
test("wind bilinear sampling reproduces affine vectors and rejects outside or non-finite positions", () => {
  const field = wind.makeField(9, 7);
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++) {
      const p = wind.world(field, x, y),
        i = y * field.width + x;
      field.vx[i] = 2 * p.x - 3 * p.y + 1;
      field.vy[i] = -p.x + 4 * p.y;
    }
  for (const p of [
    { x: -2, y: -1.5 },
    { x: 2, y: 1.5 },
    { x: 0.13, y: -0.27 },
  ]) {
    const v = wind.sampleVelocity(field, p);
    assert.ok(v);
    near(v.x, 2 * p.x - 3 * p.y + 1);
    near(v.y, -p.x + 4 * p.y);
  }
  for (const p of [
    { x: 2.001, y: 0 },
    { x: NaN, y: 0 },
    { x: 0, y: Infinity },
  ])
    assert.equal(wind.sampleVelocity(field, p), null);
});
test("wind midpoint RK2 matches constant motion and converges on an analytic rotation trajectory", () => {
  const field = wind.makeField();
  wind.populate(field, { ...wind.initialScene(), preset: "uniform" });
  const result = wind.midpointStep(field, { x: 0, y: 0 }, 1 / 60);
  near(result.x, 1 / 60);
  near(result.y, 0.25 / 60);
  assert.equal(wind.midpointStep(field, { x: 2, y: 0 }, 1 / 60), null);
  assert.equal(wind.midpointStep(field, { x: 0, y: 0 }, NaN), null);
  wind.populate(field, { ...wind.initialScene(), preset: "rotation" });
  const error = (steps) => {
    let p = { x: 0.5, y: 0 };
    for (let i = 0; i < steps; i++) p = wind.midpointStep(field, p, 1 / steps);
    return Math.hypot(p.x - 0.5 * Math.cos(1), p.y - 0.5 * Math.sin(1));
  };
  assert.ok(error(60) < 0.00003);
  assert.ok(error(120) < error(60) / 3.8);
});
test("wind tracer respawn is deterministic and does not modify the velocity field", () => {
  assert.equal(
    new Set(wind.makeParticles().map((particle) => JSON.stringify(particle.position))).size,
    128,
  );
  const field = wind.makeField();
  wind.populate(field, { ...wind.initialScene(), preset: "uniform" });
  const before = field.vx.slice(),
    a = wind.makeParticles(),
    b = wind.makeParticles();
  a[0].position = { x: 2, y: 0 };
  b[0].position = { x: 2, y: 0 };
  wind.advanceParticles(field, a);
  wind.advanceParticles(field, b);
  assert.deepEqual(a, b);
  assert.deepEqual(a[0].position, wind.seedParticle(0));
  assert.equal(a[0].age, 0);
  assert.deepEqual(field.vx, before);
});
test("wind fixed scheduling agrees at 15/30/120 FPS and limits a stalled frame", () => {
  const field = wind.makeField();
  wind.populate(field, wind.initialScene());
  const oracle = wind.makeParticles();
  for (let i = 0; i < 120; i++) wind.advanceParticles(field, oracle);
  for (const fps of [15, 30, 120]) {
    const particles = wind.makeParticles();
    let accumulator = 0,
      ticks = 0;
    for (let frame = 0; frame < fps * 2; frame++) {
      const plan = wind.planSteps(accumulator, 1 / fps);
      accumulator = plan.remainder;
      ticks += plan.steps;
      for (let i = 0; i < plan.steps; i++) wind.advanceParticles(field, particles);
    }
    assert.equal(ticks, 120);
    assert.deepEqual(particles, oracle);
  }
  const hitch = wind.planSteps(0, 10);
  assert.equal(hitch.steps, 8);
  assert.ok(hitch.dropped > 9.8 && hitch.remainder >= 0 && hitch.remainder < wind.dt);
});
test("wind vortex placement is idempotent and center curl matches a separate stencil calculation", () => {
  const scene = { ...wind.initialScene(), preset: "uniform", vortex: true },
    field = wind.makeField();
  wind.populate(field, scene);
  const original = field.vy.slice();
  wind.populate(field, scene);
  assert.deepEqual(field.vy, original);
  near(wind.divergence(field, 16, 12), 0);
  near(wind.curl(field, 16, 12), 4 * Math.exp((-field.dx * field.dx) / (0.55 * 0.55)));
  assert.throws(() => wind.addVortex(field, { x: 3, y: 0 }, 2));
  assert.throws(() => wind.addVortex(field, { x: 0, y: 0 }, Infinity));
});
test("wind reference validation is finite, independent and color saturation is display-only", () => {
  const result = wind.validateMap();
  assert.equal(result.passed, true);
  near(result.derivativeError, 0);
  near(result.gradientCurl, 0);
  assert.deepEqual(wind.scalarColor(4), wind.scalarColor(2));
  assert.notDeepEqual(wind.scalarColor(-2), wind.scalarColor(2));
  assert.deepEqual(wind.scalarColor(NaN), [255, 0, 255]);
});
