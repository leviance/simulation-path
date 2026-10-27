import assert from "node:assert/strict";
import test from "node:test";
import { FountainBenchmarkJob, summarizeTimes } from "../lib/labs/fountain/benchmark.ts";
import {
  defaultConfig,
  fixedDt,
  makeParticlesAoS,
  updateAoSRange,
  particleChecksum,
} from "../lib/labs/fountain/state.ts";
import { createFountain, beginPhysics, tickPending } from "../lib/labs/fountain/scene.ts";

function finish(job) {
  let now = 0,
    ticks = 0;
  while (job.active) {
    job.tick(() => (now += 0.001), 0);
    assert.ok(++ticks < 10000, "job must finish with bounded work");
  }
  assert.equal(job.timedOut, false);
}

test("P32 AB/BA order is explicit, while the baseline always chooses AoS", () => {
  const job = new FountainBenchmarkJob(defaultConfig(), [17], ["full-lifecycle"], true, 0);
  for (const [sample, expected] of [
    [-1, [0, 1]],
    [0, [0, 1]],
    [1, [1, 0]],
    [2, [0, 1]],
    [3, [1, 0]],
  ]) {
    job.sample = sample;
    for (let trial = 0; trial < 2; trial++) {
      job.trial = trial;
      job.chooseMethod();
      assert.equal(job.method, expected[trial]);
    }
  }
  job.paired = false;
  job.chooseMethod();
  assert.equal(job.method, 0);
});

test("P32 benchmark completes warm-up and five samples with actual three-pass counts and an independent result", () => {
  const config = defaultConfig();
  const job = new FountainBenchmarkJob(
    config,
    [17, 513],
    ["gravity-only", "full-lifecycle"],
    true,
    0,
  );
  finish(job);
  assert.equal(job.rows.length, 4);
  for (const row of job.rows) {
    assert.equal(row.updated, row.count * 3);
    assert.equal(row.maximumDifference, 0);
    assert.equal(row.maximumErrorRatio, 0);
    assert.equal(row.checksumAoS, row.checksumSoA);
    assert.ok(row.aos.minimum <= row.aos.median && row.aos.median <= row.aos.maximum);
    assert.ok(row.soa.minimum <= row.soa.median && row.soa.median <= row.soa.maximum);
    const reference = makeParticlesAoS(row.count, config);
    for (let step = 0; step < 3; step++)
      updateAoSRange(reference, 0, row.count, config, row.workload, row.count);
    assert.equal(
      row.checksumAoS,
      reference.reduce((sum, particle) => sum + particleChecksum(particle), 0),
    );
  }
});

test("P32 partial workload changes velocity but not position/age; benchmark supports an honest AoS-only baseline", () => {
  const config = defaultConfig(),
    particles = makeParticlesAoS(3, config);
  const before = structuredClone(particles);
  updateAoSRange(particles, 0, 3, config, "gravity-only", 3);
  for (let index = 0; index < 3; index++) {
    assert.equal(particles[index].positionY, before[index].positionY);
    assert.equal(particles[index].age, before[index].age);
    assert.equal(
      particles[index].velocityY,
      Math.fround(before[index].velocityY + Math.fround(config.gravity * fixedDt)),
    );
  }
  const baseline = new FountainBenchmarkJob(config, [17], ["full-lifecycle"], false, 0);
  finish(baseline);
  assert.equal(baseline.rows[0].paired, false);
  assert.equal(baseline.soaTimes.length, 0);
});

test("P32 pause, cancel and wall deadline preserve completed rows only", () => {
  const job = new FountainBenchmarkJob(defaultConfig(), [17, 20000], ["gravity-only"], true, 0);
  let now = 0;
  while (job.rows.length === 0) job.tick(() => (now += 0.001), 0);
  assert.equal(job.rows.length, 1);
  const cursor = job.target;
  job.paused = true;
  job.tick(() => 1000);
  assert.equal(job.target, cursor);
  job.tick(() => 30001);
  assert.equal(job.active, false);
  assert.equal(job.timedOut, true);
  assert.equal(job.rows.length, 1);
  const cancelled = new FountainBenchmarkJob(defaultConfig(), [20000], ["full-lifecycle"], true, 0);
  cancelled.tick(() => 1, 0);
  cancelled.cancel();
  cancelled.tick(() => 2);
  assert.equal(cancelled.rows.length, 0);
  assert.equal(cancelled.active, false);
});

test("P32 invalid allocations/timing samples fail explicitly; paused simulation deadline does not commit", () => {
  assert.throws(
    () => new FountainBenchmarkJob(defaultConfig(), [1_000_000], ["gravity-only"]),
    /budget/,
  );
  assert.throws(() => summarizeTimes([0, 0, 0, 0, NaN]), /finite/);
  assert.throws(() => summarizeTimes([1]), /five/);
  assert.deepEqual(summarizeTimes([8, 3, 6, 1, 4]), { minimum: 1, median: 4, maximum: 8 });
  const scene = createFountain(8, 2);
  beginPhysics(scene, 0);
  assert.equal(beginPhysics(scene, 1), false, "cannot overwrite a pending step");
  scene.jobPaused = true;
  tickPending(scene, () => 15001);
  assert.equal(scene.pending, null);
  assert.equal(scene.steps, 0);
  assert.equal(scene.committedUpdated, 0);
});
