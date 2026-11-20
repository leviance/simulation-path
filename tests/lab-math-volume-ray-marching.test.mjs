import assert from "node:assert/strict";
import test from "node:test";
import {
  cloudDensity,
  cloudHash,
  cloudNoise,
  cloudLandmarks,
  projectLandmark,
} from "../lib/labs/volume-ray-marching/cloud.ts";
import {
  boxInterval,
  cameraBasis,
  cameraRay,
  defaultCamera,
  defaultSettings,
  dot,
  normalize,
  makeVolume,
  sampleDensity,
  segmentAlpha,
  march,
  rawOutput,
} from "../lib/labs/volume-ray-marching.ts";
import {
  allocateVolume,
  centre,
  histogram,
  index,
} from "../lib/labs/volume-ray-marching/volume.ts";
import { integrate } from "../lib/labs/volume-ray-marching/march.ts";
import { buildDataset, compareSteps, renderPreview } from "../lib/labs/volume-ray-marching/jobs.ts";
import { audit } from "../lib/labs/volume-ray-marching/analysis.ts";
const front = { origin: [0, 0, 3], direction: [0, 0, -1] };
const white = {
  ...defaultSettings,
  palette: 2,
  lighting: false,
  sigma: 2,
  cutoff: 0,
  early: false,
};
function close(actual, expected, tolerance = 1e-11) {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${actual} != ${expected}`,
  );
}

test("P54 perspective rays have a unit orthogonal basis, top-down v and an inside eye that still rotates", () => {
  for (const yaw of [-1, 0, 1.1]) {
    const camera = { ...defaultCamera, yaw },
      basis = cameraBasis(camera),
      ray = cameraRay(camera, 0.5, 0.5, 1.7);
    close(dot(ray.direction, ray.direction), 1);
    close(dot(basis.right, basis.up), 0);
    close(dot(ray.direction, basis.forward), 1);
    assert.ok(dot(cameraRay(camera, 0.5, 0, 1.7).direction, basis.up) > 0);
    const inside = cameraBasis({ ...camera, inside: true });
    assert.deepEqual(inside.origin, [0, 0, 0]);
    close(dot(inside.forward, basis.forward), 1);
  }
  assert.throws(() => cameraRay(defaultCamera, 0.5, 0.5, 0), RangeError);
  assert.throws(() => cameraBasis({ ...defaultCamera, yaw: NaN }), RangeError);
});
test("P54 slab intersection covers parallel/on-face/inside/backward rays without sampling behind the eye", () => {
  assert.deepEqual(boxInterval(front), { entry: 2, exit: 4 });
  assert.deepEqual(boxInterval({ origin: [0, 0, 0], direction: [1, 0, 0] }), { entry: 0, exit: 1 });
  assert.equal(boxInterval({ origin: [2, 0, 3], direction: [0, 0, -1] }), null);
  assert.ok(boxInterval({ origin: [1, 0, 3], direction: [0, 0, -1] }));
  assert.equal(boxInterval({ origin: [0, 0, 3], direction: [0, 0, 1] }), null);
  assert.equal(boxInterval({ origin: [1, 0, 0], direction: [1, 0, 0] }), null);
  const diagonal = boxInterval({ origin: [-3, -3, -3], direction: normalize([1, 1, 1]) });
  close(diagonal.exit - diagonal.entry, Math.sqrt(12));
  assert.ok(Math.ceil(Math.sqrt(12) / 0.008) <= 512);
  assert.throws(() => boxInterval({ origin: [0, 0, 3], direction: [0, 0, -2] }), RangeError);
  assert.throws(() => boxInterval({ origin: [NaN, 0, 3], direction: [0, 0, -1] }), RangeError);
});
test("P54 actual 64^3/128^3 Float32 allocations keep the box fixed and the histogram counts every sample", () => {
  for (const side of [64, 128]) {
    const volume = makeVolume("cores", side);
    assert.equal(volume.values.length, side ** 3);
    assert.equal(volume.values.byteLength, side ** 3 * 4);
    assert.ok(Object.isFrozen(volume));
    assert.equal(
      histogram(volume).reduce((a, b) => a + b, 0),
      side ** 3,
    );
    close(centre(volume, 0, 0, 0)[0], -1 + 1 / side);
    close(centre(volume, side - 1, 0, 0)[0], 1 - 1 / side);
  }
  for (const side of [0, -1, 1.2, 129, Infinity])
    assert.throws(() => allocateVolume(side), RangeError);
  assert.throws(() => makeVolume("unknown", 64), RangeError);
});
test("P54 R32F sampling matches independently known centres, eight corners, midpoint and affine values", () => {
  const volume = allocateVolume(2);
  for (let z = 0; z < 2; z++)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const address = x + 2 * y + 4 * z;
        assert.equal(index(volume, x, y, z), address);
        volume.values[address] = address / 8;
        close(sampleDensity(volume, centre(volume, x, y, z)), address / 8, 0);
        close(sampleDensity(volume, [-1 + 2 * x, -1 + 2 * y, -1 + 2 * z]), address / 8, 0);
      }
  close(sampleDensity(volume, [0, 0, 0]), 0.4375, 0);
  close(sampleDensity(volume, [0.1, -0.2, 0.25]), 0.525);
  close(sampleDensity(volume, [-100, -100, -100]), 0, 0);
  assert.throws(() => index(volume, -1, 0, 0), RangeError);
  assert.throws(() => sampleDensity(volume, [NaN, 0, 0]), RangeError);
  volume.values[0] = NaN;
  assert.throws(() => histogram(volume), RangeError);
});
test("P54 constant medium gives three independent analytic answers, invariant under step and partial tails", () => {
  const volume = makeVolume("constant", 32);
  for (const mode of ["mip", "average", "alpha"])
    for (const stepLength of [0.008, 0.02, 0.04, 0.13, 0.16]) {
      const settings = { ...white, mode, stepLength },
        result = march(front, volume, settings, true);
      close(result.maximum, 0.25, 0);
      close(result.mean, 0.25);
      close(
        result.profile.reduce((sum, sample) => sum + sample.ds, 0),
        2,
      );
      assert.equal(result.samples, Math.ceil(2 / stepLength));
      for (const sample of result.profile)
        assert.ok(sample.ds > 0 && sample.ds <= stepLength + 1e-13);
      if (mode === "alpha") {
        close(result.transmittance, Math.exp(-1));
        result.color.forEach((value) => close(value, 1 - Math.exp(-1)));
      } else {
        const raw = rawOutput(result, mode);
        raw.slice(0, 3).forEach((value) => close(value, 0.25, 1e-13));
        assert.equal(raw[3], 1);
      }
    }
  close(segmentAlpha(0.25, 2, 0.1), 1 - Math.exp(-0.05));
});
test("P54 128^3 slab has known maximum, weighted mean and optical depth including trilinear edge ramps", () => {
  const slab = makeVolume("slab", 128),
    rho = Math.fround(0.65),
    settings = { ...white, stepLength: 1 / 64 };
  const result = march(front, slab, settings);
  close(result.maximum, rho, 0);
  close(result.mean, (rho * 0.75) / 2);
  close(result.transmittance, Math.exp(-2 * rho * 0.75));
  assert.equal(slab.values.filter((value) => value > 0).length, 48 * 128 * 128);
  assert.equal(audit(slab).checks, 38);
});
test("P54 miss, empty and zero sigma remain empty in every mode; palette/light do not change T", () => {
  const volume = makeVolume("constant", 16),
    empty = makeVolume("empty", 16);
  for (const mode of ["mip", "average", "alpha"]) {
    const settings = { ...white, mode };
    const miss = march({ origin: [2, 0, 3], direction: [0, 0, -1] }, volume, settings);
    assert.equal(miss.samples, 0);
    assert.equal(miss.transmittance, 1);
    const blank = march(front, empty, settings);
    assert.equal(blank.maximum, 0);
    assert.equal(blank.mean, 0);
    assert.deepEqual(blank.color, [0, 0, 0]);
    assert.equal(blank.transmittance, 1);
  }
  const zero = march(front, volume, { ...white, sigma: 0 });
  assert.deepEqual(zero.color, [0, 0, 0]);
  assert.equal(zero.transmittance, 1);
  const cloud = makeVolume("cloud", 32),
    before = cloud.values.slice();
  const a = march(front, cloud, defaultSettings),
    b = march(front, cloud, { ...defaultSettings, palette: 1, lighting: false });
  close(a.transmittance, b.transmittance);
  assert.notDeepEqual(a.color, b.color);
  assert.deepEqual(cloud.values, before);
});
test("P54 alpha color depends on layer order while extinction and scalar projections do not", () => {
  const volume = allocateVolume(32);
  for (let z = 0; z < 32; z++)
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) volume.values[x + 32 * (y + 32 * z)] = z < 16 ? 0.2 : 0.8;
  const settings = { ...defaultSettings, lighting: false },
    a = march(front, volume, settings),
    b = march({ origin: [0, 0, -3], direction: [0, 0, 1] }, volume, settings);
  close(a.transmittance, b.transmittance);
  assert.ok(a.color.some((value, i) => Math.abs(value - b.color[i]) > 0.001));
  for (const mode of ["mip", "average"]) {
    const forward = march(front, volume, { ...settings, mode }),
      back = march({ origin: [0, 0, -3], direction: [0, 0, 1] }, volume, { ...settings, mode });
    close(forward.maximum, back.maximum);
    close(forward.mean, back.mean);
  }
});
test("P54 early termination is alpha-only with a linear error bound and never silently truncates a cap", () => {
  const volume = allocateVolume(8);
  volume.values.fill(1);
  const settings = { ...defaultSettings, sigma: 12, lighting: false },
    full = march(front, volume, settings),
    early = march(front, volume, { ...settings, early: true });
  assert.ok(early.samples < full.samples);
  assert.ok(early.transmittance <= 0.0005);
  close(early.transmittance, full.transmittance, 0.0005);
  early.color.forEach((value, i) => close(value, full.color[i], 0.0005));
  for (const mode of ["mip", "average"])
    assert.equal(march(front, volume, { ...settings, mode, early: true }).samples, full.samples);
  assert.throws(() => integrate(front, volume, settings, 1e-300, 4096), /budget/);
  for (const stepLength of [0, 0.001, 0.17, NaN])
    assert.throws(() => march(front, volume, { ...settings, stepLength }), RangeError);
  for (const sigma of [-1, 13, Infinity])
    assert.throws(() => march(front, volume, { ...settings, sigma }), RangeError);
});
test("P54 jobs commit complete volumes, cancel between batches and reject excessive preview work", async () => {
  const abort = new AbortController();
  const cancelled = buildDataset("cloud", 128, abort.signal);
  abort.abort(new Error("cancel fixture"));
  await assert.rejects(cancelled, /cancel fixture/);
  const ready = await buildDataset("constant", 128, new AbortController().signal);
  assert.equal(ready.volume.values.length, 2097152);
  assert.equal(
    ready.bins.reduce((a, b) => a + b, 0),
    2097152,
  );
  assert.throws(
    () =>
      renderPreview(
        defaultCamera,
        ready.volume,
        defaultSettings,
        10,
        2000,
        1000,
        new AbortController().signal,
      ),
    /budget/,
  );
  const previewAbort = new AbortController();
  const pending = renderPreview(
    defaultCamera,
    ready.volume,
    defaultSettings,
    10,
    160,
    120,
    previewAbort.signal,
  );
  previewAbort.abort(new Error("preview cancelled"));
  await assert.rejects(pending, /preview cancelled/);
  const preview = await renderPreview(
    defaultCamera,
    ready.volume,
    defaultSettings,
    10,
    24,
    18,
    new AbortController().signal,
  );
  assert.equal(preview.rgba.length, 24 * 18 * 4);
  assert.ok(preview.rgba.some((value) => value > 0));
});
test("P54 step comparison reports four finite CPU samples on fixed input, not GPU timing", async () => {
  const volume = makeVolume("cores", 32),
    before = volume.values.slice();
  const measurements = await compareSteps(
    defaultCamera,
    volume,
    defaultSettings,
    0.5,
    0.5,
    4 / 3,
    new AbortController().signal,
  );
  assert.deepEqual(
    measurements.map((value) => value.step),
    [0.08, 0.04, 0.02, 0.008],
  );
  for (const value of measurements) {
    assert.ok(Number.isFinite(value.error) && value.error >= 0);
    assert.ok(value.lowerMs <= value.medianMs && value.medianMs <= value.upperMs);
  }
  assert.ok(measurements.at(-1).samples > measurements[0].samples);
  assert.deepEqual(volume.values, before);
});

test("P54 cloud has deterministic billows, a genuinely thin edge and an empty channel matching native landmark readouts", () => {
  close(cloudHash(0, 0, 0), 0, 0);
  close(cloudNoise(0, 0, 0), 0, 0);
  close(cloudDensity(-1, -1, -1), 0, 0);
  close(cloudDensity(0.32, -0.2, 0.07), 0, 0);
  const volume = makeVolume("cloud", 128);
  assert.equal(volume.values.length, 2097152);
  const values = cloudLandmarks.map((item) => sampleDensity(volume, item.point));
  assert.ok(values[0] > 0.5 && values[1] > 0.02 && values[1] < 0.2);
  assert.ok(values[2] < 1e-8);
  assert.deepEqual(
    values.map((value) => value.toFixed(3)),
    ["0.689", "0.106", "0.000"],
  );
  for (const item of cloudLandmarks) {
    const screen = projectLandmark(item.point, defaultCamera, 1000, 900);
    assert.ok(screen && screen.x >= 0 && screen.x <= 1000 && screen.y >= 0 && screen.y <= 900);
    const ray = cameraRay(defaultCamera, screen.x / 1000, screen.y / 900, 1000 / 900);
    const relative = item.point.map((value, i) => value - ray.origin[i]);
    close(dot(normalize(relative), ray.direction), 1, 1e-12);
  }
});

test("P54 three cloud previews really integrate the same scalar data with distinct reducers", async () => {
  const volume = makeVolume("cloud", 64);
  const images = [];
  for (const mode of ["mip", "average", "alpha"]) {
    const image = await renderPreview(
      defaultCamera,
      volume,
      { ...defaultSettings, mode },
      10,
      32,
      20,
      new AbortController().signal,
    );
    assert.equal(image.rgba.length, 32 * 20 * 4);
    images.push(Buffer.from(image.rgba));
  }
  assert.ok(!images[0].equals(images[1]));
  assert.ok(!images[0].equals(images[2]));
  assert.ok(!images[1].equals(images[2]));
});
