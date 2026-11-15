import assert from "node:assert/strict";
import test from "node:test";
import {
  createField,
  defaultSettings,
  sample,
  paintDisk,
  paintStroke,
  applyBoundary,
  measure,
  diffuse,
  stability,
  makeField,
  settingsForSize,
  planSteps,
  validatePlate,
  heatColor,
  encodeRgba,
  pointerCell,
  viewport,
  heatStage,
} from "../lib/labs/heat-plate.ts";
import { HeatSession } from "../lib/labs/heat-plate/session.ts";
const near = (actual, expected, tolerance = 1e-12) =>
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected} within ${tolerance}`,
  );

// Edge flux oracle: no production sample, ratios, stability or diffuse calls.
function edgeReference(field, settings) {
  const result = Array.from(field.current);
  const edge = (index) =>
    index % field.width === 0 ||
    index % field.width === field.width - 1 ||
    index < field.width ||
    index >= field.width * (field.height - 1);
  function transfer(a, b, spacing) {
    const flux =
      ((settings.diffusivity * settings.dt) / (spacing * spacing)) *
      (field.current[b] - field.current[a]);
    if (settings.boundary !== "rim" || !edge(a)) result[a] += flux;
    if (settings.boundary !== "rim" || !edge(b)) result[b] -= flux;
  }
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++) {
      const index = y * field.width + x;
      if (x + 1 < field.width) transfer(index, index + 1, settings.dx);
      if (y + 1 < field.height) transfer(index, index + field.width, settings.dy);
    }
  if (settings.boundary === "rim")
    for (let index = 0; index < result.length; index++) if (edge(index)) result[index] = 0;
  return result;
}

test("storage, row-major brush, stroke and heater semantics", () => {
  for (const dims of [
    [0, 3],
    [513, 4],
    [4.5, 4],
    [3, NaN],
  ])
    assert.throws(() => createField(...dims));
  const field = createField(7, 5),
    settings = defaultSettings();
  paintDisk(field, settings, 0, 0, 1, 1);
  near(measure(field, settings).sum, 3);
  paintStroke(field, settings, { x: 0, y: 3 }, { x: 6, y: 3 }, 0, 1);
  for (let x = 0; x < 7; x++) near(sample(field, x, 3), 1);
  paintDisk(field, settings, 3, 2, 0, 1, "heater");
  assert.equal(field.pins[17], 1);
  paintDisk(field, settings, 3, 2, 0, 0, "unpin");
  assert.equal(field.pins[17], -1);
  near(sample(field, 3, 2), 1);
  settings.boundary = "rim";
  applyBoundary(field, settings);
  paintDisk(field, settings, 0, 0, 1, 1, "heater");
  near(sample(field, 0, 0), 0);
  assert.equal(field.pins[0], -1);
});
test("progression: static, horizontal-only, then five-point double buffer", () => {
  const settings = defaultSettings(),
    field = createField(5, 5);
  field.current[12] = 1;
  assert.equal(diffuse(field, settings, 2).advanced, false);
  assert.equal(field.tick, 0);
  assert.equal(diffuse(field, settings, 3).visited, 25);
  near(field.current[12], 0.6);
  near(field.current[11], 0.2);
  near(field.current[7], 0);
  const pulse = createField(5, 5);
  pulse.current[12] = 1;
  assert.equal(diffuse(pulse, settings, 4).advanced, true);
  near(pulse.current[12], 0.2);
  for (const index of [7, 11, 13, 17]) near(pulse.current[index], 0.2);
  near(pulse.next[12], 1);
  near(pulse.time, settings.dt);
  near(measure(pulse, settings).sum, 1);
  const line = makeField(0, 32, 3);
  assert.equal(sample(line, 16, 15), 0);
  assert.ok(sample(line, 16, 16) > 0.9);
});
test("anisotropic stencil matches independent pairwise edge-flux reference", () => {
  for (const boundary of ["insulated", "rim"]) {
    const settings = {
      ...defaultSettings(),
      diffusivity: 0.6,
      dt: 0.03,
      dx: 0.7,
      dy: 1.1,
      boundary,
    };
    const field = createField(9, 7);
    for (let index = 0; index < field.current.length; index++)
      field.current[index] = ((index * 17 + 9) % 31) / 31;
    applyBoundary(field, settings);
    const expected = edgeReference(field, settings);
    const result = diffuse(field, settings);
    assert.equal(result.visited, 63);
    assert.ok(result.advanced);
    field.current.forEach((value, index) => near(value, expected[index], 3e-16));
  }
});
test("192-square full updates conserve the closed, unforced integral and symmetry", () => {
  const settings = settingsForSize(192),
    field = makeField(0, 192);
  const initial = measure(field, settings);
  for (let step = 0; step < 120; step++) {
    const result = diffuse(field, settings);
    assert.ok(result.advanced);
    assert.equal(result.visited, 36864);
  }
  const stats = measure(field, settings);
  near(stats.integral, initial.integral, 1e-9 + Math.abs(initial.integral) * 1e-12);
  assert.ok(stats.minimum >= initial.minimum - 1e-14 && stats.maximum <= initial.maximum + 1e-14);
  for (let y = 0; y < 192; y++)
    for (let x = 0; x < 192; x++) near(sample(field, x, y), sample(field, 191 - x, y), 1e-12);
  near(field.time, 4, 1e-12);
});
test("heater ledger is not an energy-conservation claim", () => {
  const field = createField(5, 5),
    settings = { ...defaultSettings(), dx: 1, dy: 1, diffusivity: 1, dt: 0.2 };
  paintDisk(field, settings, 2, 2, 0, 1, "heater");
  const before = measure(field, settings).integral,
    result = diffuse(field, settings);
  near(result.sourceChange, 0.8);
  near(measure(field, settings).integral - before, 0.8);
  near(sample(field, 2, 2), 1);
});
test("unsafe experiment diverges visibly, rejects candidates atomically, and is finite", () => {
  const field = makeField(2, 192),
    settings = { ...settingsForSize(192), dt: 0.05 };
  const previous = field.current.slice();
  assert.equal(diffuse(field, settings).status, "unstable");
  assert.deepEqual(field.current, previous);
  assert.equal(field.tick, 0);
  settings.experiment = true;
  let result;
  let steps = 0;
  do {
    result = diffuse(field, settings);
    if (result.advanced) steps++;
  } while (result.advanced && steps < 400);
  assert.equal(result.status, "amplitude");
  assert.equal(steps, 12);
  const stats = measure(field, settings);
  assert.ok(stats.minimum < 0 && stats.maximum > 1 && stats.maximum < 16);
  const last = field.current.slice();
  const time = field.time;
  assert.equal(diffuse(field, settings).status, "amplitude");
  assert.deepEqual(field.current, last);
  assert.equal(field.time, time);
  field.experimentSteps = 400;
  assert.equal(diffuse(field, settings).status, "budget");
  const session = new HeatSession(9);
  session.field.experimentSteps = 400;
  session.toggleExperiment();
  session.toggleExperiment();
  assert.equal(
    session.field.experimentSteps,
    400,
    "experiment toggles cannot bypass the per-field step budget",
  );
  assert.equal(stability({ ...settings, dt: NaN }).valid, false);
  assert.equal(stability({ ...settings, dx: 1e-300 }).valid, false);
  assert.equal(stability({ ...settings, diffusivity: 0 }).maximumDt, Infinity);
  const invalid = createField(5, 5);
  invalid.current[12] = NaN;
  assert.equal(diffuse(invalid, defaultSettings()).status, "nonfinite");
  assert.equal(invalid.tick, 0);
});
test("bounded reference suite separates discrete parity from PDE refinement", () => {
  const report = validatePlate();
  assert.ok(report.passed);
  assert.ok(report.schemeError <= 2e-13);
  for (const row of report.refinement) near(row.time, 0.4, 1e-14);
  assert.ok(report.refinement[1].error < report.refinement[0].error / 3);
  assert.ok(report.refinement[2].error < report.refinement[1].error / 3);
});
test("clock remains bounded through frame-rate changes, stalls and extreme dt", () => {
  for (const fps of [15, 30, 60, 120]) {
    let accumulator = 0,
      steps = 0,
      dropped = 0;
    for (let frame = 0; frame < fps * 2; frame++) {
      const plan = planSteps(accumulator, 1 / fps, 1 / 30);
      accumulator = plan.remainder;
      steps += plan.steps;
      dropped += plan.dropped;
    }
    assert.equal(steps, 60);
    near(dropped, 0);
  }
  const hitch = planSteps(0, 10, 1 / 30, 4);
  assert.equal(hitch.steps, 8);
  assert.ok(hitch.dropped > 39);
  const tiny = planSteps(0, 1, 1e-320);
  assert.equal(tiny.steps, 8);
  assert.ok(Number.isFinite(tiny.dropped));
  assert.equal(planSteps(0, NaN, 1 / 30).steps, 0);
});
test("session owns fields, publishes only small data, resets actual policy and disposes", () => {
  const session = new HeatSession(9, () => 1);
  session.mount();
  assert.equal(session.size, 192);
  assert.equal(session.paused, true);
  session.setParameter("dt", 0.05);
  session.toggleExperiment();
  session.reset(2);
  session.resume();
  session.advance(0.1);
  assert.equal(session.field.tick, 2);
  const snapshot = session.summary();
  assert.equal(snapshot.lastStep.visited, 36864);
  assert.equal("field" in snapshot, false);
  assert.equal("current" in snapshot, false);
  session.reset(0, true);
  assert.equal(session.preset, 0);
  assert.equal(measure(session.field, session.settings).maximum, 0);
  session.reset();
  assert.ok(measure(session.field, session.settings).maximum > 0.99);
  assert.equal(session.settings.dt, 0.05);
  session.reset(0, false, 256);
  assert.equal(session.settings.dx, 0.375);
  assert.equal(session.settings.dt, 0.05);
  assert.throws(() => session.reset(0, false, 500));
  assert.equal(session.field.width, 256);
  session.setBrush("heater", 1);
  session.setRadius(0);
  session.pointerBegin({ x: 10, y: 10 });
  session.endStroke();
  assert.equal(session.field.pins[10 * 256 + 10], 1);
  session.selectProbe({ x: 10, y: 10 });
  session.singleStep();
  assert.ok(session.summary().history.length <= 120);
  session.dispose();
  const tick = session.field.tick;
  session.resume();
  session.advance(1);
  session.singleStep();
  assert.equal(session.field.tick, tick);
  for (let stage = 1; stage < 3; stage++) {
    const early = new HeatSession(stage);
    early.singleStep();
    early.resume();
    assert.equal(early.field.tick, 0);
    assert.equal(early.size, 32);
    assert.throws(() => early.reset(3));
  }
});
test("RGBA encoding/pointer mapping are independent of raw theta and field size", () => {
  const field = createField(3, 1);
  field.current.set([0, 0.5, 3]);
  const before = field.current.slice(),
    bytes = new Uint8ClampedArray(12);
  encodeRgba(field, bytes, false, false);
  assert.deepEqual(Array.from(bytes.slice(0, 3)), heatColor(0));
  assert.equal(bytes[11], 255);
  assert.deepEqual(field.current, before);
  assert.throws(() => encodeRgba(field, new Uint8ClampedArray(4), false, false));
  const view = viewport(800, 500, { width: 192, height: 192 });
  assert.deepEqual(pointerCell(800, 500, view.x, view.y, { width: 192, height: 192 }), {
    x: 0,
    y: 0,
  });
  assert.equal(
    pointerCell(800, 500, view.x + view.width, view.y, { width: 192, height: 192 }),
    null,
  );
  assert.equal(pointerCell(800, 500, NaN, 10, { width: 192, height: 192 }), null);
  assert.equal(heatStage("heat-9"), 9);
  assert.equal(heatStage("heat-garbage"), 9);
});
