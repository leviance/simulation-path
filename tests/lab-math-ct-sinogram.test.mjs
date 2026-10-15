import assert from "node:assert/strict";
import test from "node:test";
import {
  acquireOne,
  advance,
  at,
  audit,
  chordLength,
  detectorRay,
  makeScan,
  makeScene,
  measure,
  pointOffset,
  project,
  samplingAngle,
  viewAngle,
} from "../lib/labs/ct-sinogram.ts";
const close = (a, b, epsilon = 1e-10) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= epsilon, `${a} vs ${b}`);
const disk = { centre: [0, 0], radius: 1, mu: 0.5 };
test("CT fan geometry preserves source, endpoint and normalized finite distance", () => {
  const centre = detectorRay(0, 0.5);
  assert.deepEqual(centre, { origin: [4, 0], direction: [-1, 0], maximum: 8 });
  const edge = detectorRay(Math.PI / 2, 1);
  const end = at(edge, edge.maximum);
  close(end[0], -4);
  close(end[1], -4);
  close(Math.hypot(...edge.direction), 1);
  close(edge.maximum, Math.sqrt(80));
});
test("CT chord clips inside, tangent, miss and detector before exit", () => {
  close(chordLength(detectorRay(0, 0.5), disk), 2);
  close(chordLength({ origin: [0, 0], direction: [1, 0], maximum: 8 }, disk), 1);
  close(chordLength({ origin: [4, 0], direction: [-1, 0], maximum: 3.5 }, disk), 0.5);
  close(chordLength({ origin: [4, 0.6], direction: [-1, 0], maximum: 8 }, disk), 1.6);
  for (const y of [1, 2])
    close(chordLength({ origin: [4, y], direction: [-1, 0], maximum: 8 }, disk), 0);
  close(chordLength({ origin: [4, 0], direction: [-1, 0], maximum: 2 }, disk), 0);
});
test("CT mono projection adds mu, keeps scene immutable and matches independent disk oracle", () => {
  const beam = detectorRay(0, 0.5);
  const result = measure(beam, [disk], 1);
  close(result.tau, 1);
  close(result.projection, 1);
  close(result.ratio, Math.exp(-1));
  close(measure(beam, [disk, disk], 1).projection, 2);
  assert.equal(measure(beam, [disk], 0).ratio, 1);
  const scene = makeScene(2),
    copy = structuredClone(scene);
  close(measure(beam, scene, 1).projection, measure(beam, [...scene].reverse(), 1).projection);
  assert.deepEqual(scene, copy);
  assert.ok(audit() < 1e-10);
  const a = project(0, [disk], 1),
    b = project(Math.PI / 3, [disk], 1);
  for (let c = 0; c < 128; c++) {
    close(a[c].projection, a[127 - c].projection);
    close(a[c].projection, b[c].projection);
  }
});
test("CT scan preserves NaN, row-major p, settings snapshots and bounded completion", () => {
  const settings = { preset: 2, views: 30, strength: 1 },
    scan = makeScan(settings);
  assert.equal(scan.values.length, 3840);
  assert.ok(scan.values.every(Number.isNaN));
  settings.strength = 2;
  assert.equal(scan.settings.strength, 1);
  assert.equal(advance(scan, 0), 0);
  assert.equal(acquireOne(scan), true);
  assert.equal(scan.acquired, 1);
  assert.ok(Number.isFinite(scan.values[127]) && Number.isNaN(scan.values[128]));
  close(scan.values[64], project(0, makeScene(2), 1)[64].projection);
  assert.equal(advance(scan, 2), 2);
  for (let i = 0; i < 14; i++) advance(scan, 2);
  assert.equal(scan.acquired, 30);
  const old = scan.values.slice();
  assert.equal(acquireOne(scan), false);
  assert.equal(advance(scan, 2), 0);
  assert.deepEqual(scan.values, old);
  assert.ok(makeScan(settings).values.every(Number.isNaN));
});
test("CT point trace crosses the point and is not a pure sine or half-turn mirror", () => {
  const point = [0.65, 0.3];
  close(pointOffset(0, point), (8 * 0.3) / 3.35);
  close(pointOffset(Math.PI / 2, point), (-8 * 0.65) / 3.7);
  assert.ok(Math.abs(pointOffset(0, point) - 0.6) > 0.1);
  assert.ok(Math.abs(pointOffset(Math.PI, point) + pointOffset(0, point)) > 0.1);
  for (let j = 0; j < 30; j++) {
    const angle = viewAngle(j, 30),
      beam = detectorRay(angle, pointOffset(angle, point) / 8 + 0.5);
    const delta = [point[0] - beam.origin[0], point[1] - beam.origin[1]];
    close(delta[0] * beam.direction[1] - delta[1] * beam.direction[0], 0);
    const distance = delta[0] * beam.direction[0] + delta[1] * beam.direction[1];
    assert.ok(distance > 0 && distance < beam.maximum);
    close(pointOffset(angle, [0, 0]), 0);
  }
});
test("CT nested angular grids compare identical physical angles", () => {
  for (let j = 0; j < 30; j++) {
    close(samplingAngle(j), 0);
    const a = project(viewAngle(j, 30), makeScene(2), 1),
      b = project(viewAngle(j * 4, 120), makeScene(2), 1);
    for (let c = 0; c < 128; c++) close(a[c].projection, b[c].projection);
  }
  close((viewAngle(29, 30) * 180) / Math.PI, 348);
});
test("CT rejects unsafe allocation, nonfinite input and excessive work budgets", () => {
  for (const views of [0, 31, 1e6, NaN])
    assert.throws(() => makeScan({ preset: 0, views, strength: 1 }), RangeError);
  for (const strength of [-1, 3, NaN, Infinity])
    assert.throws(() => measure(detectorRay(0, 0.5), [disk], strength), RangeError);
  for (const u of [-0.1, 1.1, NaN]) assert.throws(() => detectorRay(0, u), RangeError);
  for (const budget of [-1, 3, 1.5, NaN])
    assert.throws(
      () => advance(makeScan({ preset: 0, views: 30, strength: 1 }), budget),
      RangeError,
    );
  assert.throws(() => viewAngle(30, 30), RangeError);
  assert.throws(() => pointOffset(0, [2, 0]), RangeError);
  assert.throws(
    () => measure({ origin: [4, 0], direction: [-2, 0], maximum: 8 }, [disk], 1),
    RangeError,
  );
  assert.throws(() => measure(detectorRay(0, 0.5), [{ ...disk, radius: 2 }], 1), RangeError);
});
