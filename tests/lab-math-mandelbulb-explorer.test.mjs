import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultSettings,
  validate,
  batchBound,
  unit,
  length,
  dot,
  subtract,
} from "../lib/labs/mandelbulb-explorer/math.ts";
import { evaluate, sphericalPower } from "../lib/labs/mandelbulb-explorer/field.ts";
import { referenceOrbit, referenceRay } from "../lib/labs/mandelbulb-explorer/reference.ts";
import {
  march,
  hitFlag,
  missFlag,
  insideFlag,
  invalidFlag,
  shade,
} from "../lib/labs/mandelbulb-explorer/trace.ts";
import {
  basis,
  cameraRay,
  defaultCamera,
  dolly,
  orbit,
  pan,
  validateCamera,
} from "../lib/labs/mandelbulb-explorer/camera.ts";
import { BulbSession, tileOrder } from "../lib/labs/mandelbulb-explorer/session.ts";
import { initialSettings, modes, preset } from "../lib/labs/mandelbulb-explorer/view.ts";
const near = (a, b, tolerance = 1e-10) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${a} != ${b} (tol ${tolerance})`);
function finishPreview(session) {
  for (let guard = 0; session.pendingPreview; guard++) {
    assert.ok(guard < 100);
    session.advance(48, () => 0);
  }
  assert.ok(session.active);
  return session.active;
}
function finish(session) {
  for (let guard = 0; session.busy; guard++) {
    assert.ok(guard < 600);
    session.advance(48, () => 0);
  }
  assert.ok(session.complete);
  return session.active;
}

test("P43 spherical power guards zero/axes and agrees with independent non-trig orbits", () => {
  near(length(sphericalPower({ x: 0, y: 0, z: 0 }, 8)), 0, 0);
  near(length(subtract(sphericalPower({ x: 1, y: 0, z: 0 }, 2), { x: 0, y: 0, z: -1 })), 0, 1e-12);
  let fixtures = 0;
  for (const power of [2, 6, 8, 10, 12])
    for (const bailout of [2, 8, 16]) {
      const s = { ...defaultSettings, power, bailout };
      for (const point of [
        { x: 0, y: 0, z: 0 },
        { x: 0, y: 0, z: 0.25 },
        { x: 0, y: 0, z: -0.25 },
        { x: 1e-8, y: 0, z: 0.25 },
        { x: 0, y: 1e-8, z: -0.25 },
        { x: 3, y: 0, z: 0 },
        { x: 0, y: 0, z: 3 },
        { x: -2, y: 1, z: 2 },
      ]) {
        const actual = evaluate(point, s),
          ref = referenceOrbit(point, s);
        assert.notEqual(actual.state, "invalid");
        assert.equal(ref.invalid, false);
        assert.equal(actual.state === "escaped", ref.escaped);
        assert.equal(actual.iterations, ref.evaluations);
        near(actual.distance, ref.distance, 1e-9 + Math.abs(ref.distance) * 1e-9);
        fixtures++;
      }
    }
  assert.equal(fixtures, 120);
  assert.equal(evaluate({ x: Infinity, y: 0, z: 0 }, defaultSettings).state, "invalid");
  assert.equal(referenceOrbit({ x: NaN, y: 0, z: 0 }, defaultSettings).invalid, true);
});
test("P43 DE rays match a slower independent epsilon-shell scan, not exact set membership", () => {
  const origin = { x: 0, y: 0, z: 3.4 };
  let hits = 0;
  for (let direction of [
    { x: 0, y: 0, z: -1 },
    { x: 0.1, y: 0, z: -1 },
    { x: 0, y: 0.1, z: -1 },
    { x: -0.1, y: 0, z: -1 },
    { x: 2, y: 0, z: 0 },
  ]) {
    direction = unit(direction);
    const fast = march(origin, direction, defaultSettings, true),
      ref = referenceRay(origin, direction, defaultSettings, 0.0005);
    assert.equal(fast.state === hitFlag, ref.hit);
    assert.ok(fast.raySteps <= defaultSettings.raySteps);
    assert.equal(fast.path.length, fast.raySteps);
    if (ref.hit) {
      near(fast.t, ref.t, 0.006);
      hits++;
      const shading = shade(origin, direction, fast, defaultSettings);
      near(length(shading.normal), 1, 1e-9);
      assert.notEqual(shading.state, invalidFlag);
    } else assert.equal(fast.state, missFlag);
  }
  assert.equal(hits, 4);
  assert.equal(
    march({ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, defaultSettings).state,
    insideFlag,
  );
  assert.equal(march(origin, { x: 0, y: 0, z: 0 }, defaultSettings).state, invalidFlag);
  assert.throws(() => referenceRay(origin, { x: 0, y: 0, z: -1 }, defaultSettings, 0));
});
test("P43 finite camera keeps basis orthogonal and forward center rays stable", () => {
  let camera = defaultCamera();
  const b = basis(camera),
    center = cameraRay(camera, 0.5, 0.5, 1, 1);
  near(length(b.forward), 1);
  near(length(b.right), 1);
  near(length(b.up), 1);
  near(dot(b.forward, b.right), 0);
  near(dot(center.direction, b.forward), 1);
  camera = pan(orbit(dolly(camera, 10000), 10000, -10000), 100000, -100000);
  validateCamera(camera);
  assert.equal(camera.distance, 0.04);
  assert.equal(camera.pitch, -1.48);
  assert.ok(Object.values(camera.target).every((value) => Math.abs(value) <= 2.5));
  assert.throws(() => validateCamera({ ...camera, distance: Infinity }));
  assert.throws(() => validate({ ...defaultSettings, iterations: 24 }));
  assert.throws(() => validate({ ...defaultSettings, samples: 2 }));
  assert.throws(() => validate({ ...defaultSettings, epsilon: NaN }));
  assert.throws(() => batchBound(defaultSettings, 49));
});
test("P43 tile ordering covers every odd-tail pixel once", () => {
  const order = tileOrder(95, 53);
  assert.equal(order.length, 95 * 53);
  assert.equal(new Set(order).size, 95 * 53);
  assert.equal(Math.min(...order), 0);
  assert.equal(Math.max(...order), 95 * 53 - 1);
  assert.throws(() => tileOrder(1000, 54));
});
test("P43 preview publication, pause, supersession and cancellation preserve honest ACTIVE labels", () => {
  const session = new BulbSession(),
    s = { ...defaultSettings, slice: true };
  session.pause(true);
  session.request(s);
  const first = finishPreview(session);
  assert.equal(session.busy, false);
  assert.equal(session.progress, 0);
  session.request({ ...s, power: 6 });
  session.advance(1, () => 0);
  assert.equal(session.active, first);
  assert.equal(session.requested.generation, 2);
  session.request({ ...s, power: 10 });
  const third = finishPreview(session);
  assert.equal(third.generation, 3);
  assert.equal(third.settings.power, 10);
  assert.ok(third.final.pixels.every((pixel) => pixel === null));
  session.request({ ...s, power: 2 });
  session.cancel();
  assert.equal(session.active, third);
  assert.equal(session.pendingPreview, false);
  assert.equal(session.busy, false);
  const before = session.requested;
  assert.throws(() => session.request({ ...s, power: NaN }));
  assert.equal(session.requested, before);
  assert.equal(session.active, third);
  session.pause(false);
  session.request(s);
  finishPreview(session);
  session.advance(17, () => 0);
  assert.equal(session.lastBatchPixels, 17);
  assert.ok(session.lastBatchWork <= batchBound(s, 17));
});
test("P43 every final Canvas sample is written and counters equal actual one/four-sample records", () => {
  for (const samples of [1, 4]) {
    const session = new BulbSession();
    const settings = { ...defaultSettings, samples };
    session.request(settings);
    const active = finish(session);
    const pixels = active.final.pixels;
    assert.equal(session.counters.samples, 96 * 54 * samples);
    assert.ok(
      pixels.every(
        (pixel) => pixel && pixel.samples === samples && pixel.generation === active.generation,
      ),
    );
    assert.equal(
      pixels.reduce((sum, pixel) => sum + pixel.steps, 0),
      session.counters.steps,
    );
    assert.equal(
      pixels.reduce((sum, pixel) => sum + pixel.iterations, 0),
      session.counters.iterations,
    );
    const c = session.counters;
    assert.equal(c.samples, c.hits + c.misses + c.budget + c.inside + c.invalid);
    assert.equal(c.invalid, 0);
    assert.ok(pixels.every((pixel) => Object.values(pixel.color).every(Number.isFinite)));
    assert.equal(session.lastBatchPixels <= 48, true);
  }
});
test("P43 each lesson mode/preset stays within the explicit Canvas contract", () => {
  for (const mode of modes)
    for (let index = 0; index < 3; index++) {
      validate(initialSettings(mode));
      const chosen = preset(index, mode);
      validate(chosen.settings);
      validateCamera(chosen.camera);
    }
});
