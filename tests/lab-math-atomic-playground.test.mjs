import assert from "node:assert/strict";
import test from "node:test";
import {
  angularAmplitude,
  densityAt,
  orbitalIds,
  orbitals,
  radialAmplitude,
  radialCdf,
} from "../lib/labs/atomic-playground/catalog.ts";
import {
  buildDistribution,
  buildTables,
  mix32,
  samplePosition,
  traceSample,
  selectBin,
  uniform,
} from "../lib/labs/atomic-playground/sampler.ts";
import {
  AtomicSession,
  decodeConfig,
  defaultConfig,
  hasGenerationWork,
  encodeConfig,
  maxCanvasSamples,
} from "../lib/labs/atomic-playground/session.ts";
import {
  clipVisible,
  inProbe,
  measureCloud,
  regionReference,
} from "../lib/labs/atomic-playground/statistics.ts";
import {
  atomicMode,
  atomicModes,
  cameraBasis,
  fitCamera,
  initialView,
  orbitCamera,
  panCamera,
  projector,
  travelCamera,
  zoomCamera,
} from "../lib/labs/atomic-playground/view.ts";

function near(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    `${actual} differs from ${expected}; tolerance ${tolerance}`,
  );
}
function finish(session, batch = 512) {
  let frames = 0;
  while (session.needsWork) {
    assert.ok(frames++ < Math.ceil(maxCanvasSamples / batch) + 2, "bounded generation must finish");
    session.advance(true, batch);
  }
  assert.equal(session.job.phase, "ready");
  assert.ok(session.active);
  return session.active;
}
function samples(table, seed, n, mode = "weighted") {
  return Array.from({ length: n }, (_, index) => samplePosition(table, index, seed, mode));
}
function proportion(actual, expected, n, extra = 0.001) {
  // Sampling uncertainty and table approximation are separate terms.
  near(actual, expected, 6 * Math.sqrt((expected * (1 - expected)) / n) + extra);
}

test("P45 supplied real orbital fixtures: exact values, nodes, axes and parity", () => {
  near(densityAt("s1", { x: 0, y: 0, z: 0 }).density, 1 / Math.PI);
  near(densityAt("s1", { x: 1, y: 0, z: 0 }).density, Math.exp(-2) / Math.PI);
  near(radialAmplitude("s2", 2), 0);
  near(densityAt("s2", { x: 2, y: 0, z: 0 }).density, 0);
  near(densityAt("pz", { x: 1, y: 0, z: 0 }).density, 0);
  near(densityAt("dxy", { x: 0, y: 1, z: 1 }).density, 0);
  near(densityAt("dx2y2", { x: 1, y: 1, z: 0 }).density, 0);
  near(angularAmplitude("dz2", { x: Math.sqrt(2 / 3), y: 0, z: Math.sqrt(1 / 3) }), 0, 3e-16);
  near(angularAmplitude("fz3", { x: Math.sqrt(2 / 5), y: 0, z: Math.sqrt(3 / 5) }), 0, 8e-16);
  near(angularAmplitude("fxyz", { x: 0, y: Math.SQRT1_2, z: Math.SQRT1_2 }), 0);
  near(densityAt("pz", { x: 0, y: 0, z: 2 }).density, Math.exp(-2) / (8 * Math.PI));
  for (const id of orbitalIds) {
    const point = { x: 1.2, y: -0.8, z: 2.3 },
      positive = densityAt(id, point),
      negative = densityAt(id, { x: -point.x, y: -point.y, z: -point.z });
    near(positive.density, negative.density);
    assert.ok(positive.density >= 0);
    assert.equal(
      negative.sign,
      positive.sign * (orbitals.find((item) => item.id === id).l % 2 ? -1 : 1),
    );
  }
  assert.throws(() => radialAmplitude("s1", NaN), RangeError);
  assert.throws(() => angularAmplitude("pz", { x: 0, y: Infinity, z: 0 }), RangeError);
});

test("P45 generic normalization retains measure, zero bins and rejects invalid mass", () => {
  const result = buildDistribution([0, 1, 0, 3, 0], 0.25);
  near(result.integral, 1);
  assert.deepEqual([...result.cdf], [0, 0, 0.25, 0.25, 1, 1]);
  assert.equal(selectBin(result.cdf, 0), 1);
  assert.equal(selectBin(result.cdf, 0.25), 3);
  assert.equal(selectBin(result.cdf, 1 - Number.EPSILON), 3);
  for (const bad of [[], [0, 0], [1, -1], [NaN], [Infinity]])
    assert.throws(() => buildDistribution(bad, 1), RangeError);
  assert.throws(() => buildDistribution([1], 0), RangeError);
  assert.throws(() => buildDistribution([Number.MAX_VALUE], 2), RangeError);
  assert.throws(() => selectBin(result.cdf, 1), RangeError);
  assert.throws(() => selectBin(result.cdf, NaN), RangeError);
});

test("P45 each supplied orbital has separately normalized radial and angular tables", () => {
  for (const item of orbitals) {
    const table = buildTables(item.id);
    assert.equal(table.radial.cdf.length, 2049);
    assert.equal(table.angular.cdf.length, 64 * 128 + 1);
    near(table.radial.integral, radialCdf(item.id, item.rMax), 0.00001);
    near(table.angular.integral, 1, 0.006);
    near(table.tail, 1 - radialCdf(item.id, item.rMax));
    assert.ok(table.tail >= 0 && table.tail < 0.00001);
    for (const distribution of [table.radial, table.angular]) {
      assert.equal(distribution.cdf[0], 0);
      assert.equal(distribution.cdf.at(-1), 1);
      assert.ok(
        distribution.cdf.every(
          (value, index, cdf) => Number.isFinite(value) && (!index || value >= cdf[index - 1]),
        ),
      );
    }
  }
  const truncated = buildTables("s1", 1);
  near(truncated.tail, 5 * Math.exp(-2));
  near(truncated.radial.integral, 1 - 5 * Math.exp(-2), 1e-7);
  near(radialCdf("s1", 1e300), 1);
  near(radialCdf("s2", 1e300), 1);
  near(radialAmplitude("fz3", 1e300), 0);
  // An independent Simpson integral catches 1-tail cancellation near r=0.
  for (const id of ["s1", "s2", "pz", "dz2", "fz3"]) {
    const radius = 0.25,
      intervals = 1000,
      h = radius / intervals;
    let integral = 0;
    for (let bin = 0; bin <= intervals; ++bin) {
      const r = bin * h,
        value = r * r * radialAmplitude(id, r) ** 2;
      integral += value * (bin === 0 || bin === intervals ? 1 : bin % 2 ? 4 : 2);
    }
    integral *= h / 3;
    assert.ok(integral > 0);
    near(radialCdf(id, radius) / integral, 1, 1e-8);
  }
  assert.throws(() => buildTables("s1", 0), RangeError);
  assert.throws(() => buildTables("s1", 12, 2048, 4096, 4096), RangeError);
});

test("P45 stateless RNG is reproducible, indexed and strictly open even as float32", () => {
  assert.equal(mix32(0), 0);
  assert.equal(mix32(1), 1753845952);
  for (const seed of [0, 45, 0xffffffff]) {
    for (let i = 0; i < 4099; ++i)
      for (let d = 0; d < 5; ++d) {
        const value = uniform(i, seed, d);
        assert.equal(value, uniform(i, seed, d));
        assert.ok(Math.fround(value) > 0 && Math.fround(value) < 1);
      }
    assert.notEqual(uniform(1, seed, 0), uniform(2, seed, 0));
    assert.notEqual(uniform(1, seed, 0), uniform(1, seed, 1));
  }
  assert.notEqual(uniform(1, 45, 0), uniform(1, 46, 0));
  const table = buildTables("s2"),
    expected = samplePosition(table, 1031, 45);
  assert.deepEqual(expected, samplePosition(table, 1031, 45));
  const byBatch = [...samples(table, 45, 1031), samplePosition(table, 1031, 45)];
  assert.deepEqual(byBatch.at(-1), expected);
});

test("P45 generic sampler matches uniform-volume and nonuniform angular analytic fields across seeds", () => {
  const n = 12007,
    radius = 4;
  for (const seed of [7, 45, 935]) {
    const uniformTable = buildTables("uniformVolume", radius),
      affineTable = buildTables("affineMu", radius);
    near(uniformTable.radial.integral, radius ** 3 / 3, 0.00001);
    near(affineTable.angular.integral, 1, 1e-12);
    let sphere = 0,
      meanR = 0,
      meanMu = 0,
      north = 0;
    for (let index = 0; index < n; ++index) {
      const volume = samplePosition(uniformTable, index, seed),
        affine = samplePosition(affineTable, index, seed);
      meanR += volume.r;
      if (volume.r <= radius / 2) ++sphere;
      const mu = affine.point.z / affine.r;
      meanMu += mu;
      if (mu > 0) ++north;
    }
    proportion(sphere / n, 1 / 8, n, 0.0001);
    near(meanR / n, (3 * radius) / 4, 6 * Math.sqrt((3 * radius ** 2) / 80 / n) + 0.0001);
    near(meanMu / n, 0.6 / 3, 6 * Math.sqrt((1 / 3 - 0.04) / n) + 0.0005);
    proportion(north / n, 0.5 + 0.6 / 4, n, 0.0005);
  }
});

test("P45 1s radial regions and pz angular moments match independent closed forms at multiple seeds", () => {
  const n = 16001,
    sphereP = 1 - 13 * Math.exp(-4),
    a = buildTables("s1"),
    b = buildTables("pz");
  for (const seed of [0, 45, 0xffffffff]) {
    let sphere = 0,
      meanMu2 = 0;
    for (let index = 0; index < n; ++index) {
      const oneS = samplePosition(a, index, seed),
        pz = samplePosition(b, index, seed);
      if (oneS.r < 2) ++sphere;
      meanMu2 += (pz.point.z / pz.r) ** 2;
    }
    proportion(sphere / n, sphereP, n, 0.0002);
    near(meanMu2 / n, 3 / 5, 6 * Math.sqrt((3 / 7 - 9 / 25) / n) + 0.0005);
  }
});

test("P45 deliberately wrong radius/angle sandbox exposes known distribution errors", () => {
  const table = buildTables("uniformVolume"),
    n = 10007;
  let correctCenter = 0,
    badCenter = 0,
    correctPole = 0,
    badPole = 0;
  for (let index = 0; index < n; ++index) {
    const correct = samplePosition(table, index, 45),
      badR = samplePosition(table, index, 45, "uniformRadius"),
      badAngle = samplePosition(table, index, 45, "uniformAngle");
    if (correct.r < 2) ++correctCenter;
    if (badR.r < 2) ++badCenter;
    if (Math.abs(correct.point.z / correct.r) > 0.8) ++correctPole;
    if (Math.abs(badAngle.point.z / badAngle.r) > 0.8) ++badPole;
  }
  proportion(correctCenter / n, 1 / 8, n);
  proportion(badCenter / n, 0.5, n);
  proportion(correctPole / n, 0.2, n);
  proportion(badPole / n, (2 * Math.acos(0.8)) / Math.PI, n);
  assert.ok(badCenter - correctCenter > n * 0.3);
  assert.ok(badPole - correctPole > n * 0.15);
});

test("P45 odd-N records publish only when complete, and cancel preserves a correctly labelled last-good", () => {
  const session = new AtomicSession({ ...defaultConfig(), orbital: "s1", count: 1027 });
  assert.equal(session.active, null);
  session.advance(false, 512);
  assert.equal(session.job.generated, 512);
  assert.equal(session.active, null);
  const initial = finish(session),
    original = initial.records.slice();
  assert.equal(initial.records.length, 1027 * 8);
  assert.ok(initial.records.every(Number.isFinite));
  assert.ok(
    Array.from({ length: initial.count }, (_, index) =>
      Math.hypot(...initial.records.slice(index * 8, index * 8 + 3)),
    ).every((value) => value > 0),
  );
  session.request({ ...session.requested, orbital: "fxyz", count: 4099 });
  session.advance();
  assert.equal(session.label, "1s");
  assert.equal(session.active, initial);
  assert.equal(session.current, false);
  assert.equal(session.cancel(), true);
  assert.equal(session.job.phase, "cancelled");
  assert.equal(session.job.records.byteLength, 0, "cancel releases unpublished storage");
  assert.deepEqual(session.active.records, original);
  assert.equal(session.active.config.orbital, "s1");
  assert.equal(session.requested.orbital, "fxyz");
  assert.equal(session.advance(true), false);
  assert.equal(session.cancel(), false);
  session.reset();
  const updated = finish(session, 257);
  assert.equal(updated.count, 4099);
  assert.equal(updated.config.orbital, "fxyz");
  assert.equal(session.current, true);
});

test("P45 pause/step, budget/config rejection, deterministic reset and StrictMode lifecycle are bounded", () => {
  const session = new AtomicSession({ ...defaultConfig(), count: 1031 });
  session.setPaused(true);
  assert.equal(session.advance(), false);
  assert.equal(session.job.generated, 0);
  session.advance(true, 17);
  assert.equal(session.job.generated, 17);
  const job = session.job,
    generation = session.generation;
  for (const patch of [
    { count: 0 },
    { count: maxCanvasSamples + 1 },
    { seed: -1 },
    { seed: 1.1 },
    { seed: 4294967296 },
    { orbital: "fake" },
    { sampling: "rejectionForever" },
  ])
    assert.throws(() => session.request({ ...defaultConfig(), ...patch }));
  assert.equal(session.job, job);
  assert.equal(session.generation, generation);
  assert.throws(() => session.advance(true, 1025));
  const first = finish(session).records.slice();
  session.reset();
  assert.equal(session.paused, true);
  near(session.job.generated, 0);
  assert.deepEqual(finish(session).records, first);
  session.dispose();
  assert.equal(session.active, null);
  assert.equal(session.needsWork, false);
  assert.equal(session.advance(true), false);
  assert.throws(() => session.reset());
  session.mount();
  assert.deepEqual(finish(session).records, first);
  session.dispose();
});

test("P45 configuration parser has a small allowlisted schema and explicit numeric bounds", () => {
  const config = { ...defaultConfig(), count: 1027, seed: 0xffffffff, sampling: "uniformAngle" };
  assert.deepEqual(decodeConfig(encodeConfig(config)), config);
  for (const json of [
    "null",
    "[]",
    "{}",
    "{",
    JSON.stringify({ ...config, schema: 2 }),
    JSON.stringify({ ...config, schema: 1, positions: [] }),
    JSON.stringify({ ...config, schema: 1, count: "1027" }),
    " ".repeat(2049),
  ])
    assert.throws(() => decodeConfig(json));
});

test("P45 comparison can cancel or step a secondary-only generation", () => {
  const primary = new AtomicSession({ ...defaultConfig(), count: 257 });
  const secondary = new AtomicSession({ ...defaultConfig(), orbital: "s2", count: 1027 });
  finish(primary);
  assert.equal(hasGenerationWork(primary, secondary, false), false);
  assert.equal(hasGenerationWork(primary, secondary, true), true);
  secondary.setPaused(true);
  secondary.advance(true, 17);
  assert.equal(secondary.job.generated, 17);
  secondary.cancel();
  assert.equal(hasGenerationWork(primary, secondary, true), false);
});

test("P45 CDF teaching trace is the exact sampler calculation and matches stored Float32 records", () => {
  const session = new AtomicSession({
    ...defaultConfig(),
    count: 1027,
    seed: 0xffffffff,
    radialBins: 256,
    muBins: 32,
    phiBins: 64,
  });
  const cloud = finish(session);
  for (const id of [0, 1, 255, 256, 1026]) {
    const trace = traceSample(cloud.tables, id, cloud.config.seed);
    assert.deepEqual(trace.sample, samplePosition(cloud.tables, id, cloud.config.seed));
    assert.ok(trace.radialCdf[0] <= trace.uniforms[0] && trace.uniforms[0] < trace.radialCdf[1]);
    assert.ok(trace.angularCdf[0] <= trace.uniforms[2] && trace.uniforms[2] < trace.angularCdf[1]);
    near(
      trace.sample.r,
      ((trace.radialBin + trace.uniforms[1]) * cloud.tables.rMax) / cloud.tables.radialBins,
    );
    near(trace.mu, -1 + (2 * (trace.muBin + trace.uniforms[3])) / cloud.tables.muBins);
    near(trace.phi, (2 * Math.PI * (trace.phiBin + trace.uniforms[4])) / cloud.tables.phiBins);
    assert.deepEqual(
      [trace.sample.point.x, trace.sample.point.y, trace.sample.point.z].map(Math.fround),
      [...cloud.records.slice(id * 8, id * 8 + 3)],
    );
  }
  const tables = cloud.tables;
  const wrongR = traceSample(tables, 0, 45, "uniformRadius");
  near(wrongR.sample.r, wrongR.uniforms[0] * tables.rMax);
  const wrongTheta = traceSample(tables, 0, 45, "uniformAngle");
  near(wrongTheta.mu, Math.cos(Math.PI * wrongTheta.uniforms[3]));
  assert.throws(() => traceSample(tables, -1, 45));
  assert.throws(() => traceSample(tables, 0, NaN));
});

test("P45 table resolution changes are bounded, retained in config and publish as a new candidate", () => {
  const session = new AtomicSession({ ...defaultConfig(), count: 257 });
  const old = finish(session);
  session.request({ ...session.requested, radialBins: 64, muBins: 32, phiBins: 64 });
  assert.equal(session.active, old);
  assert.equal(session.current, false);
  const updated = finish(session);
  assert.equal(updated.tables.radialBins, 64);
  assert.equal(updated.tables.muBins, 32);
  assert.equal(updated.tables.phiBins, 64);
  assert.equal(updated.config.seed, old.config.seed);
  assert.equal(updated.config.count, old.config.count);
  assert.deepEqual(decodeConfig(encodeConfig(updated.config)), updated.config);
  for (const patch of [
    { radialBins: 4 },
    { radialBins: 4096 },
    { muBins: 1024 },
    { phiBins: 0 },
    { phiBins: NaN },
  ])
    assert.throws(() => session.request({ ...session.requested, ...patch }));
});

test("P45 clipping, brightness and camera never normalize region measurements or regenerate records", () => {
  const session = new AtomicSession({ ...defaultConfig(), count: 4099, orbital: "s1" });
  const cloud = finish(session),
    original = cloud.records.slice(),
    generation = session.generation;
  const off = { enabled: false, axis: "x", position: 0 },
    on = { ...off, enabled: true },
    probe = { center: { x: 0, y: 0, z: 0 }, radius: 2 };
  const full = measureCloud(cloud, off, probe),
    clipped = measureCloud(cloud, on, probe);
  assert.equal(full.total, cloud.count);
  assert.equal(clipped.total, cloud.count);
  assert.equal(full.inside, clipped.inside);
  assert.equal(full.fraction, clipped.fraction);
  assert.equal(full.regionReference, clipped.regionReference);
  near(full.regionReference, (1 - 13 * Math.exp(-4)) / radialCdf("s1", 12));
  near(full.standardError, Math.sqrt((full.fraction * (1 - full.fraction)) / cloud.count));
  near(
    full.radialObserved.reduce((a, b) => a + b, 0),
    1,
  );
  near(
    full.radialExpected.reduce((a, b) => a + b, 0),
    1,
  );
  assert.ok(clipped.clipped < full.clipped);
  const view = initialView("validation");
  view.opacity = 0.4;
  view.densityBoost = true;
  view.camera = panCamera(orbitCamera(zoomCamera(view.camera, 8), 10, 20), 20, 30);
  assert.equal(session.generation, generation);
  assert.deepEqual(cloud.records, original);
  assert.equal(clipVisible({ x: 1, y: 0, z: 0 }, on), false);
  assert.equal(inProbe({ x: 2, y: 0, z: 0 }, probe), true);
});

test("P45 shifted uniform-volume probe quadrature matches an independent contained-sphere integral", () => {
  const table = buildTables("uniformVolume"),
    cloud = { tables: table },
    probe = { center: { x: 0.4, y: -0.3, z: 0.2 }, radius: 1.5 };
  // The entire sphere is inside R=4, so uniform volume gives (r/R)^3.
  const exact = (1.5 / 4) ** 3;
  near(regionReference(cloud, probe, 4, 4), exact, 0.002);
  near(regionReference(cloud, { center: { x: 20, y: 0, z: 0 }, radius: 1 }, 8, 8), 0);
});

test("P45 view uses genuine perspective, shared a0 comparison and finite traversal zoom", () => {
  assert.equal(atomicModes.length, 11);
  assert.equal(atomicMode("not-a-mode"), "validation");
  const camera = fitCamera("s1", "fxyz"),
    { eye, forward } = cameraBasis(camera);
  assert.ok(camera.distance >= fitCamera("fxyz").distance);
  const project = projector(camera, 800, 500),
    center = project(camera.target);
  near(center.x, 400);
  near(center.y, 250);
  assert.equal(project({ x: eye.x - forward.x, y: eye.y - forward.y, z: eye.z - forward.z }), null);
  let close = camera;
  for (let i = 0; i < 100; ++i) close = zoomCamera(close, 1);
  near(close.distance, 0.15);
  assert.ok(Math.abs(orbitCamera(camera, 100, 10000).pitch) < Math.PI / 2);
  const moved = travelCamera(camera, 1);
  assert.notDeepEqual(moved.target, camera.target);
  assert.equal(moved.distance, camera.distance);
  assert.equal(initialView("compare").compare, true);
  assert.equal(initialView("clip").clip.enabled, true);
});
