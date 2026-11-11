import assert from "node:assert/strict";
import test from "node:test";
import {
  Random,
  barycentric,
  morphPosition,
  curveOffset,
  advanceTime,
  nativeMemory,
  flowPhase,
  flowJitter,
} from "../lib/labs/particle-morph-studio/math.ts";
import { makeMesh } from "../lib/labs/particle-morph-studio/mesh.ts";
import { AreaDistribution } from "../lib/labs/particle-morph-studio/sampler.ts";
import { SpatialOrder, spatialKey } from "../lib/labs/particle-morph-studio/ordering.ts";
import {
  MorphSession,
  defaultSettings,
  positionAt,
  meanTravel,
} from "../lib/labs/particle-morph-studio/session.ts";

const near = (actual, expected, tolerance = 1e-12) =>
  assert.ok(
    Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance,
    String(actual) + " differs from " + expected,
  );
function finish(session, batch = 128) {
  for (let count = 0; session.busy; count++) {
    assert.ok(count < 10000, "A bounded Canvas generation must finish");
    session.advance(batch);
  }
  assert.ok(session.active, session.error);
  return session.active;
}

test("P42 random and barycentric fixtures have known values and correct centroid", () => {
  const random = new Random(42);
  assert.deepEqual(
    [random.next(), random.next(), random.next()],
    [1083814273, 378494188, 2479403867],
  );
  assert.deepEqual(barycentric(0.25, 0.5), [0.5, 0.25, 0.25]);
  assert.throws(() => barycentric(-0.1, 0.4));
  assert.throws(() => barycentric(0.1, NaN));
  let x = 0;
  let y = 0;
  for (let id = 0; id < 40000; id++) {
    const u = random.uniform();
    const v = random.uniform();
    const weights = barycentric(u, v);
    near(
      weights.reduce((a, b) => a + b),
      1,
    );
    assert.ok(weights.every((value) => value >= 0));
    x += 2 * weights[1];
    y += weights[2];
  }
  near(x / 40000, 2 / 3, 0.012);
  near(y / 40000, 1 / 3, 0.006);
});

test("P42 area weighting selects two independent triangles in a 1:4 ratio across seeds", () => {
  const mesh = {
    vertices: [
      { x: 0, y: 0, z: 0 },
      { x: 2, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 10, y: 0, z: 0 },
      { x: 14, y: 0, z: 0 },
      { x: 10, y: 2, z: 0 },
    ],
    triangles: [
      [0, 1, 2],
      [3, 4, 5],
      [0, 0, 0],
    ],
  };
  const distribution = new AreaDistribution(mesh);
  near(distribution.total, 5);
  for (let seed = 1; seed <= 8; seed++) {
    const random = new Random(seed * 7919);
    let first = 0;
    for (let id = 0; id < 20000; id++) {
      const sample = distribution.sample(random, "area");
      assert.ok(sample.triangle < 2, "Degenerate triangle was selected");
      if (sample.triangle === 0) first++;
    }
    near(first, 4000, 6 * Math.sqrt(20000 * 0.2 * 0.8) + 1);
  }
  assert.throws(() => distribution.choose(1, "area"));
  assert.throws(() => new AreaDistribution({ ...mesh, triangles: [[999, 0, 1]] }));
  assert.throws(() => new AreaDistribution({ vertices: mesh.vertices, triangles: [[0, 0, 0]] }));
});

test("P42 all three supplied meshes are finite, indexed and have positive area", () => {
  for (const shape of ["sphere", "torus", "knot"]) {
    const mesh = makeMesh(shape);
    assert.equal(mesh.vertices.length, 65 * 33);
    assert.equal(mesh.triangles.length, 64 * 32 * 2);
    const area = new AreaDistribution(mesh);
    assert.ok(area.total > 1);
    near(
      Array.from(area.expected).reduce((a, b) => a + b),
      1,
      1e-12,
    );
    assert.ok(mesh.vertices.every((point) => Object.values(point).every(Number.isFinite)));
  }
  assert.throws(() => makeMesh("sphere", 0, 32));
});

test("P42 spatial counting sort is stable inside Morton cells and preserves every ID", () => {
  const points = [
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: -2, y: 1, z: 0 },
    { x: 2, y: -1, z: 0 },
  ];
  const order = new SpatialOrder(points.length);
  let done = false;
  for (let batch = 0; !done; batch++) {
    assert.ok(batch < 20);
    done = order.advance(points, 1);
  }
  assert.deepEqual(
    [...order.order].sort((a, b) => a - b),
    [0, 1, 2, 3],
  );
  const ids = [...order.order];
  assert.ok(ids.indexOf(0) < ids.indexOf(1), "Tie must retain ascending sample ID");
  assert.deepEqual(
    ids.map((id) => spatialKey(points[id])),
    ids.map((id) => spatialKey(points[id])).sort((a, b) => a - b),
  );
  assert.equal(spatialKey({ x: -99, y: -99, z: -99 }), 0);
  assert.equal(spatialKey({ x: 99, y: 99, z: 99 }), 32767);
});

test("P42 generations are reproducible, both mappings are bijections and spatial A/B is real", () => {
  const settings = { ...defaultSettings, source: "sphere", target: "sphere", count: 1021 };
  const a = new MorphSession();
  const b = new MorphSession();
  assert.ok(a.request(settings) && b.request(settings));
  const first = finish(a);
  const second = finish(b, 97);
  assert.deepEqual(first.source, second.source);
  assert.deepEqual(first.target, second.target);
  assert.deepEqual(first.random, second.random);
  assert.deepEqual(first.spatial, second.spatial);
  assert.equal(new Set(first.random).size, settings.count);
  assert.equal(new Set(first.spatial).size, settings.count);
  assert.ok(meanTravel(first, "spatial") < meanTravel(first, "random") * 0.65);
  assert.notDeepEqual(
    positionAt(first, 47, 0.5, "random", "linear", "straight"),
    positionAt(first, 47, 0.5, "spatial", "linear", "straight"),
  );
  assert.throws(() => positionAt(first, 1021, 0.5, "spatial", "linear", "arc"));
});

test("P42 the histogram exposes triangle bias instead of disguising it with opacity", () => {
  const area = new MorphSession();
  const biased = new MorphSession();
  area.request({ ...defaultSettings, count: 4096, sampling: "area" });
  biased.request({ ...defaultSettings, count: 4096, sampling: "triangle" });
  const good = finish(area);
  const bad = finish(biased);
  const error = (data) =>
    [...data.observed].reduce(
      (sum, observed, bin) => sum + Math.abs(observed / data.settings.count - data.expected[bin]),
      0,
    );
  assert.equal(
    [...good.observed].reduce((a, b) => a + b),
    4096,
  );
  assert.ok(error(bad) > error(good) + 0.15);
});

test("P42 endpoints are exact and duration follows model time rather than frame count", () => {
  const a = { x: 1, y: 2, z: 3 };
  const b = { x: -3, y: -2, z: -1 };
  const offset = curveOffset(a);
  for (const easing of ["linear", "smooth"])
    for (const path of ["straight", "arc", "flow"]) {
      assert.equal(morphPosition(a, b, offset, 0, easing, path), a);
      assert.equal(morphPosition(a, b, offset, 1, easing, path), b);
    }
  let sixty = 0;
  let irregular = 0;
  for (let frame = 0; frame < 120; frame++) sixty = advanceTime(sixty, 1 / 60, 5, false, false);
  for (let group = 0; group < 10; group++)
    for (const dt of [0.011, 0.037, 0.152]) irregular = advanceTime(irregular, dt, 5, false, false);
  near(sixty, irregular);
  near(advanceTime(4.8, 0.5, 5, false, true), 0.3);
  near(advanceTime(0.2, 0.5, 5, true, true), 4.7);
  assert.throws(() => advanceTime(1, NaN, 5, false, false));
  assert.throws(() => advanceTime(1, 0.1, 0, false, false));
});

test("P42 cancel, replacement and invalid requests never relabel or overwrite last-good", () => {
  const session = new MorphSession();
  session.request({ ...defaultSettings, count: 127 });
  const active = finish(session);
  session.request({ ...defaultSettings, source: "torus", count: 4096 });
  session.advance(10);
  assert.equal(session.active, active);
  session.cancel();
  assert.equal(session.active, active);
  assert.equal(session.busy, false);
  assert.equal(session.request({ ...defaultSettings, count: 1_000_003 }), false);
  assert.equal(session.active, active);
  session.request({ ...defaultSettings, count: 257, seed: 10 });
  session.advance(20);
  session.request({ ...defaultSettings, count: 129, seed: 11 });
  const replacement = finish(session);
  assert.equal(replacement.settings.count, 129);
  assert.equal(replacement.settings.seed, 11);
  assert.notEqual(replacement.generation, active.generation);
});

test("P42 Flow separates individual trajectories without frame randomness or broken duration", () => {
  const a = { x: 1, y: 0, z: -0.5 };
  const b = { x: -1, y: 1, z: 0.5 };
  const offset = curveOffset(a);
  const middle = [];
  for (let id = 0; id < 128; id++) {
    const jitter = flowJitter(id);
    assert.ok(Math.hypot(jitter.x, jitter.y, jitter.z) <= 1 + 1e-12);
    let previous = -1;
    for (let step = 0; step <= 100; step++) {
      const phase = flowPhase(step / 100, id);
      assert.ok(phase >= previous && phase >= 0 && phase <= 1);
      previous = phase;
    }
    const point = morphPosition(a, b, offset, 0.5, "smooth", "flow", id);
    assert.deepEqual(point, morphPosition(a, b, offset, 0.5, "smooth", "flow", id));
    middle.push(point);
    assert.equal(morphPosition(a, b, offset, 0, "smooth", "flow", id), a);
    assert.equal(morphPosition(a, b, offset, 1, "smooth", "flow", id), b);
  }
  const spread =
    middle.reduce(
      (sum, p) => sum + Math.hypot(p.x - middle[0].x, p.y - middle[0].y, p.z - middle[0].z),
      0,
    ) / middle.length;
  assert.ok(spread > 0.3, "Different IDs must not follow one shared tile trajectory");
});

test("P42 native byte accounting includes the canary and the odd dispatch has excess lanes", () => {
  const plan = nativeMemory(1_000_003, 1_000_003);
  assert.equal(plan.source, 16_000_048);
  assert.equal(plan.current, 16_000_064);
  assert.equal(plan.mapping, 8_000_024);
  assert.equal(plan.payload, 72_000_232);
  const lanes = Math.ceil(1_000_003 / 256) * 256;
  assert.equal(lanes - 1_000_003, 189);
  assert.ok(plan.gpuPeak < 768 * 1024 ** 2 && plan.cpuPeak < 768 * 1024 ** 2);
  assert.throws(() => nativeMemory(0));
});
