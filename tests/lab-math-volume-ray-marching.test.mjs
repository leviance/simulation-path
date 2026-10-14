import assert from "node:assert/strict";
import test from "node:test";
import {
  boxInterval,
  cameraBasis,
  cameraRay,
  defaultCamera,
  defaultSettings,
  dot,
  makeVolume,
  sampleDensity,
  segmentAlpha,
  march,
  transfer,
  boxMinimum,
  boxMaximum,
} from "../lib/labs/volume-ray-marching.ts";
const front = { origin: [0, 0, -8], direction: [0, 0, 1] };
function close(a, b, tolerance = 1e-10) {
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= tolerance, a + " != " + b);
}
test("Volume rays use normalized camera basis and y-down CPU pixels", () => {
  const b = cameraBasis(defaultCamera),
    r = cameraRay(defaultCamera, 0.5, 0.5, 4 / 3);
  close(dot(r.direction, r.direction), 1);
  r.direction.forEach((x, i) => close(x, b.forward[i]));
  close(dot(b.forward, b.right), 0);
  close(dot(b.up, b.right), 0);
  assert.ok(dot(cameraRay(defaultCamera, 0.5, 0, 4 / 3).direction, b.up) > 0);
  assert.deepEqual(cameraRay({ ...defaultCamera, inside: true }, 0.5, 0.5, 4 / 3), {
    origin: [0, 0, 0],
    direction: [0, 0, 1],
  });
});
test("Volume interval starts inside at zero, excludes parallel misses and rejects nonunit input", () => {
  const hit = boxInterval(front);
  close(hit.entry, 5.6);
  close(hit.exit, 10.4);
  assert.deepEqual(boxInterval({ origin: [0, 0, 0], direction: [0, 0, 1] }), {
    entry: 0,
    exit: 2.4,
  });
  assert.equal(boxInterval({ origin: [2, 0, -8], direction: [0, 0, 1] }), null);
  assert.ok(boxInterval({ origin: [1.6, 0, -8], direction: [0, 0, 1] }));
  assert.equal(boxInterval({ origin: [0, 0, 8], direction: [0, 0, 1] }), null);
  assert.throws(() => boxInterval({ origin: [0, 0, -8], direction: [0, 0, 2] }), /Unit ray/);
});
test("R32F x-fast volume matches texture centres and edge replication", () => {
  const v = makeVolume(1);
  assert.equal(v.density.byteLength, 480 * 1024);
  for (const [x, y, z] of [
    [0, 0, 0],
    [10, 20, 30],
    [63, 47, 39],
  ]) {
    const p = [
      boxMinimum[0] + (x + 0.5) * 0.05,
      boxMinimum[1] + (y + 0.5) * 0.08,
      boxMinimum[2] + (z + 0.5) * 0.12,
    ];
    close(sampleDensity(v, p), v.density[x + 64 * (y + 48 * z)]);
  }
  close(sampleDensity(v, boxMinimum), 0);
  close(sampleDensity(v, boxMaximum), 1);
});
test("Constant medium C/T is analytic across step lengths and partial tails", () => {
  const v = makeVolume(2),
    hit = boxInterval(front),
    length = hit.exit - hit.entry;
  for (const stepLength of [0.02, 0.04, 0.08, 0.17, 0.25]) {
    const result = march(front, v, { ...defaultSettings, stepLength });
    const expected = Math.exp(-2 * 0.25 * length);
    close(result.transmittance, expected);
    transfer(0.25, true).forEach((c, i) => close(result.color[i], c * (1 - expected)));
    close(
      result.profile.reduce((sum, p) => sum + p.ds, 0),
      length,
    );
    assert.equal(result.samples, Math.ceil(length / stepLength));
    result.profile.forEach((p) => assert.ok(p.ds > 0 && p.ds <= stepLength + 1e-12));
  }
  close(segmentAlpha(0.25, 2, 0.1), 1 - Math.exp(-0.05));
});
test("Transfer changes color not extinction; zero sigma and miss stay transparent", () => {
  const v = makeVolume(2),
    a = march(front, v, defaultSettings),
    b = march(front, v, { ...defaultSettings, warm: false });
  close(a.transmittance, b.transmittance);
  assert.notDeepEqual(a.color, b.color);
  const zero = march(front, v, { ...defaultSettings, sigma: 0 });
  assert.equal(zero.transmittance, 1);
  assert.deepEqual(zero.color, [0, 0, 0]);
  const miss = march({ origin: [2, 0, -8], direction: [0, 0, 1] }, v, defaultSettings);
  assert.equal(miss.samples, 0);
  assert.equal(miss.transmittance, 1);
  assert.equal(miss.profile.length, 0);
});
test("Early termination reduces work and bounds C/T and composed-color error", () => {
  const v = makeVolume(2);
  v.density.fill(1);
  const full = march(front, v, { ...defaultSettings, sigma: 8 }),
    early = march(front, v, { ...defaultSettings, sigma: 8, early: true });
  assert.ok(early.samples < full.samples);
  assert.ok(early.transmittance <= 0.001);
  assert.ok(Math.abs(early.transmittance - full.transmittance) <= 0.001);
  for (const [i, bg] of [0.025, 0.035, 0.055].entries()) {
    assert.ok(Math.abs(early.color[i] - full.color[i]) <= 0.001);
    assert.ok(
      Math.abs(
        early.color[i] + early.transmittance * bg - full.color[i] - full.transmittance * bg,
      ) <= 0.001,
    );
  }
});
test("Quality requests stay bounded and ramp integration converges without mutating data", () => {
  const v = makeVolume(1),
    before = v.density.slice();
  for (const sigma of [-1, 9, NaN, Infinity])
    assert.throws(() => march(front, v, { ...defaultSettings, sigma }), RangeError);
  for (const stepLength of [0, 0.001, 0.3, NaN])
    assert.throws(() => march(front, v, { ...defaultSettings, stepLength }), RangeError);
  const fine = march(front, v, { ...defaultSettings, stepLength: 0.02 }),
    coarse = march(front, v, { ...defaultSettings, stepLength: 0.16 });
  assert.ok(Math.abs(fine.transmittance - coarse.transmittance) < 0.001);
  assert.deepEqual(v.density, before);
});
test("Teaching stages gate warm/early and omit expensive profile allocation in preview", () => {
  const v = makeVolume(2);
  v.density.fill(1);
  const settings = { ...defaultSettings, sigma: 8, early: true };
  const six = march(front, v, settings, 6, false),
    eight = march(front, v, settings, 8, false);
  assert.equal(six.profile.length, 0);
  assert.equal(eight.profile.length, 0);
  assert.ok(eight.samples < six.samples);
  const seven = march(front, v, { ...settings, early: false }, 7);
  assert.equal(six.transmittance, seven.transmittance);
  assert.notDeepEqual(six.color, seven.color);
});
