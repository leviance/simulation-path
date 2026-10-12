import assert from "node:assert/strict";
import test from "node:test";
import {
  createField,
  makeField,
  contains,
  sample,
  paintDisk,
  paintStroke,
  defaultSettings,
  ratios,
  stable,
  diffuse,
  measure,
  applyBoundary,
  planSteps,
  validatePlate,
  pointerCell,
  heatColor,
} from "../lib/labs/heat-plate.ts";
const near = (a, b, tolerance = 1e-10) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= tolerance, String(a) + " != " + b);

test("heat field validates dimensions, row-major access and brush boundaries", () => {
  assert.throws(() => createField(2, 5));
  assert.throws(() => createField(4.5, 5));
  assert.throws(() => createField(257, 5));
  const field = createField(5, 5);
  assert.equal(contains(field, 5, 0), false);
  paintDisk(field, 0, 0, 1, 1);
  near(measure(field).sum, 3);
  paintStroke(field, 0, 3, 4, 3, 0, 1);
  for (let x = 0; x < 5; x++) near(sample(field, x, 3), 1);
  paintStroke(field, 4, 3, 0, 3, 0, 0);
  for (let x = 0; x < 5; x++) near(sample(field, x, 3), 0);
});
test("heat stages start static, then horizontal, then a five-point stencil", () => {
  const settings = defaultSettings();
  const field = createField(5, 5);
  field.current[12] = 1;
  assert.equal(diffuse(field, settings, 2), false);
  assert.equal(field.tick, 0);
  diffuse(field, settings, 3);
  near(field.current[12], 0.6);
  near(field.current[11], 0.2);
  near(field.current[7], 0);
  const pulse = createField(5, 5);
  pulse.current[12] = 1;
  diffuse(pulse, settings, 4);
  near(pulse.current[12], 0.2);
  for (const i of [7, 11, 13, 17]) near(pulse.current[i], 0.2);
  near(pulse.current[6], 0);
  near(measure(pulse).sum, 1);
});
test("heat double buffering preserves reflection symmetry and matches a reverse-order oracle", () => {
  const field = createField(9, 7);
  field.current[3 * 9 + 4] = 1;
  const old = field.current.slice();
  const settings = defaultSettings(),
    { rx, ry } = ratios(settings);
  const oracle = old.slice();
  for (let y = 6; y >= 0; y--)
    for (let x = 8; x >= 0; x--) {
      const c = sample(field, x, y);
      oracle[y * 9 + x] =
        c +
        rx * (sample(field, x - 1, y) - 2 * c + sample(field, x + 1, y)) +
        ry * (sample(field, x, y - 1) - 2 * c + sample(field, x, y + 1));
    }
  diffuse(field, settings);
  assert.deepEqual(field.current, oracle);
  for (let y = 0; y < 7; y++)
    for (let x = 0; x < 9; x++) near(sample(field, x, y), sample(field, 8 - x, 6 - y));
});
test("heat insulated boundaries conserve sum, preserve uniform fields and bound extrema", () => {
  const settings = defaultSettings(),
    field = makeField(1);
  for (let step = 0; step < 20; step++) diffuse(field, settings);
  field.current.forEach((value) => near(value, 0.4));
  const patch = makeField(),
    initial = measure(patch).sum;
  for (let step = 0; step < 180; step++) {
    const before = measure(patch);
    diffuse(patch, settings);
    const after = measure(patch);
    near(after.sum, initial, 1e-9);
    assert.ok(after.minimum >= before.minimum - 1e-12 && after.maximum <= before.maximum + 1e-12);
  }
});
test("heat cold edges remove heat, stay zero and override a brush stroke", () => {
  const settings = { ...defaultSettings(), boundary: "cold" },
    field = makeField(1);
  applyBoundary(field, settings);
  let sum = measure(field).sum;
  for (let step = 0; step < 50; step++) {
    diffuse(field, settings);
    const next = measure(field).sum;
    assert.ok(next <= sum + 1e-9);
    sum = next;
  }
  assert.ok(sum < 1000);
  paintDisk(field, 0, 0, 0, 1);
  applyBoundary(field, settings);
  near(sample(field, 0, 0), 0);
  for (let x = 0; x < 64; x++) {
    near(sample(field, x, 0), 0);
    near(sample(field, x, 47), 0);
  }
});
test("heat rejects unstable or invalid settings without altering the field", () => {
  const field = makeField(),
    before = field.current.slice();
  const settings = { ...defaultSettings(), diffusivity: 12 };
  assert.equal(stable(settings), false);
  assert.equal(diffuse(field, settings), false);
  assert.deepEqual(field.current, before);
  assert.equal(field.tick, 0);
  settings.dt = 1 / 60;
  assert.equal(stable(settings), true);
  for (const patch of [{ dx: 0 }, { dy: NaN }, { diffusivity: -1 }, { dt: Infinity }, { dx: 0.5 }])
    assert.equal(stable({ ...defaultSettings(), ...patch }), false);
  assert.equal(stable({ ...defaultSettings(), dx: 2 }), true);
});
test("heat cosine fixture matches the independent discrete eigenvalue in C++ and TypeScript", () => {
  const field = createField(8, 6),
    settings = defaultSettings(),
    angle = Math.PI / 8;
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 8; x++) field.current[y * 8 + x] = 0.5 + 0.25 * Math.cos(angle * (x + 0.5));
  const gain = 1 - 4 * ratios(settings).rx * Math.sin(angle / 2) ** 2;
  for (let step = 0; step < 20; step++) diffuse(field, settings);
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 8; x++)
      near(sample(field, x, y), 0.5 + 0.25 * gain ** 20 * Math.cos(angle * (x + 0.5)));
});
test("heat fixed scheduling agrees across frame rates and bounds stalled frames", () => {
  const reference = makeField(),
    settings = defaultSettings();
  for (let i = 0; i < 60; i++) diffuse(reference, settings);
  for (const fps of [15, 30, 120]) {
    const field = makeField();
    let accumulator = 0;
    for (let frame = 0; frame < 2 * fps; frame++) {
      const plan = planSteps(accumulator, 1 / fps, settings.dt);
      accumulator = plan.remainder;
      for (let step = 0; step < plan.steps; step++) diffuse(field, settings);
    }
    assert.equal(field.tick, 60);
    assert.deepEqual(field.current, reference.current);
  }
  const hitch = planSteps(0, 10, 1 / 60);
  assert.equal(hitch.steps, 8);
  assert.ok(hitch.dropped > 9.8);
  assert.deepEqual(planSteps(0, 1, 0), { steps: 0, remainder: 0, dropped: 0 });
});
test("heat reference validation is finite and reports separate invariants", () => {
  const result = validatePlate();
  assert.equal(result.conserved, true);
  assert.equal(result.bounded, true);
  assert.equal(result.coldEdges, true);
  assert.ok(result.maxSumError < 1e-9);
});
test("heat color mapping is display-only and pointer conversion excludes letterbox", () => {
  assert.deepEqual(heatColor(0), [20, 35, 90]);
  assert.deepEqual(heatColor(1), [255, 210, 40]);
  assert.deepEqual(heatColor(NaN), [255, 0, 255]);
  assert.equal(pointerCell(1000, 480, 100, 100), null);
  assert.deepEqual(pointerCell(1000, 480, 185, 25), { x: 0, y: 2 });
  assert.equal(pointerCell(640, 480, 640, 0), null);
});
