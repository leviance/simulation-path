import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultSettings,
  detectorRay,
  at,
  dot,
  boxInterval,
  makeScene,
  materialLength,
  objectBeam,
  rotateY,
  measure,
  midpointDepth,
  audit,
  brightness,
  transmission,
} from "../lib/labs/xray-detector.ts";
const beam = detectorRay(0.5, 0.5),
  slab = makeScene(0);
function close(a, b, e = 1e-10) {
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= e, a + " != " + b);
}
test("Detector beams end at physical pixel coordinates and stay normalized", () => {
  assert.deepEqual(beam, { origin: [0, 0, -6], direction: [0, 0, 1], maximum: 12 });
  const corner = detectorRay(1, 0);
  close(dot(corner.direction, corner.direction), 1);
  at(corner, corner.maximum).forEach((x, i) => close(x, [3, 2.25, 6][i]));
  assert.throws(() => detectorRay(-0.1, 0.5), RangeError);
});
test("X-ray slab handles inside, parallel miss and finite detector clipping", () => {
  const m = slab[0];
  close(materialLength(beam, m), 1.1);
  close(materialLength({ origin: [0, 0, 0], direction: [0, 0, 1], maximum: 12 }, m), 0.55);
  close(materialLength({ ...beam, maximum: 5.7 }, m), 0.25);
  assert.equal(
    boxInterval({ origin: [2, 0, -6], direction: [0, 0, 1], maximum: 12 }, m.minimum, m.maximum),
    null,
  );
  const oblique = detectorRay(0.65, 0.5);
  close(materialLength(oblique, m), 1.1 / oblique.direction[2]);
});
test("Analytic optical depth sums independent layers and additive overlap", () => {
  const s = defaultSettings,
    a = measure(beam, slab, s);
  close(a.depth.low, 0.605);
  close(a.ratio, Math.exp(-0.605));
  close(a.logProjection, 0.605);
  close(measure(beam, [...slab, ...slab], s).depth.low, 1.21);
  const layers = makeScene(1);
  close(measure(beam, layers, s).ratio, measure(beam, [...layers].reverse(), s).ratio);
  assert.equal(measure(beam, slab, { ...s, strength: 0 }).ratio, 1);
});
test("Midpoint samples real tail and obeys a conservative boundary bound", () => {
  const scene = makeScene(1),
    before = structuredClone(scene),
    sum = scene.reduce((n, m) => n + m.muLow, 0);
  for (const stepLength of [0.05, 0.11, 0.25, 0.5]) {
    const r = measure(beam, scene, { ...defaultSettings, numeric: true, stepLength }, 8, true),
      e = measure(beam, scene, defaultSettings);
    assert.ok(Math.abs(r.depth.low - e.depth.low) <= 2 * stepLength * sum + 1e-12);
    assert.ok(r.depth.samples <= 512);
    close(
      r.profile.reduce((n, p) => n + p.ds, 0),
      beam.maximum,
    );
    r.profile.forEach((p) => assert.ok(p.ds > 0 && p.ds <= stepLength + 1e-12));
  }
  assert.deepEqual(scene, before);
  close(audit(), 0.055);
  const tilted = detectorRay(0.8, 0.2),
    tail = midpointDepth(tilted, scene, 1, 0.11, true);
  close(
    tail.profile.reduce((n, p) => n + p.ds, 0),
    tilted.maximum,
  );
});
test("Flat-field exposure and display controls never change ratio or optical depth", () => {
  const a = measure(beam, slab, defaultSettings),
    b = measure(beam, slab, { ...defaultSettings, exposure: 20000, logView: true, invert: true });
  close(a.ratio, b.ratio);
  close(a.logProjection, b.logProjection);
  close(b.intensity, 2 * a.intensity);
  const raw = brightness(40, 30, 80, 60, slab, defaultSettings, 8),
    inverted = brightness(40, 30, 80, 60, slab, { ...defaultSettings, invert: true }, 8);
  close(raw + inverted, 1);
});
test("Two-energy detector sums transmissions before log with correct endpoints", () => {
  const s = { ...defaultSettings, spectral: true },
    a = measure(beam, slab, s);
  close(a.ratio, 0.6 * Math.exp(-0.605) + 0.4 * Math.exp(-0.198));
  close(measure(beam, slab, { ...s, lowWeight: 1 }).ratio, Math.exp(-0.605));
  close(measure(beam, slab, { ...s, lowWeight: 0 }).ratio, Math.exp(-0.198));
  assert.ok(measure(beam, [...slab, ...slab], s).logProjection < 2 * a.logProjection);
  close(transmission({ low: 0.5, high: 0.5, samples: 0 }, s), Math.exp(-0.5));
  assert.notEqual(a.ratio, Math.exp(-(0.6 * 0.605 + 0.4 * 0.198)));
});
test("Object rotation preserves world ray length and is invertible", () => {
  const p = [1, 2, 3],
    q = rotateY(rotateY(p, 0.7), -0.7);
  q.forEach((x, i) => close(x, p[i]));
  const b = objectBeam(beam, 0.7);
  close(dot(b.direction, b.direction), 1);
  close(b.maximum, beam.maximum);
});
test("Invalid quality, geometry and spectrum are rejected; log floor keeps raw ratio", () => {
  for (const update of [
    { stepLength: 0 },
    { stepLength: 0.001 },
    { stepLength: 0.6 },
    { strength: NaN },
    { exposure: 0 },
    { lowWeight: 1.1 },
    { angle: Infinity },
  ])
    assert.throws(() => measure(beam, slab, { ...defaultSettings, ...update }), RangeError);
  assert.throws(
    () => measure({ ...beam, direction: [0, 0, 2] }, slab, defaultSettings),
    RangeError,
  );
  assert.throws(() => measure(beam, [], defaultSettings), RangeError);
  const dense = Array.from({ length: 8 }, () => ({
    minimum: [-1, -1, -5],
    maximum: [1, 1, 5],
    muLow: 4,
    muHigh: 4,
  }));
  const r = measure(beam, dense, { ...defaultSettings, strength: 3 });
  assert.ok(r.ratio < 1e-12);
  assert.equal(r.logClamped, true);
  close(r.logProjection, -Math.log(1e-12));
  assert.notEqual(r.ratio, 1e-12);
});
test("Earlier chapters expose only the mathematical stages taught so far", () => {
  const s = { ...defaultSettings, numeric: true, spectral: true };
  const early = measure(beam, slab, s, 4, true);
  assert.equal(early.depth.samples, 0);
  assert.equal(early.profile.length, 0);
  assert.equal(early.logProjection, 0);
  close(early.ratio, Math.exp(-0.605));
  assert.equal(makeScene(1, 3).length, 1);
  assert.equal(makeScene(1, 4).length, 3);
});
