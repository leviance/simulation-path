import assert from "node:assert/strict";
import test from "node:test";
import {
  Random,
  photonSeed,
  freePath,
  exitDistance,
  sampleFlight,
  scatterDirection,
  tracePhoton,
  makeExperiment,
  advance,
  tally,
  wilson,
  audit,
  expectedBallistic,
  defaultSettings,
} from "../lib/labs/photon-rain.ts";
const close = (a, b, epsilon = 1e-10) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= epsilon, `${a} vs ${b}`);
function run(settings, budget = 32) {
  const e = makeExperiment(settings);
  for (let b = 0; b < settings.count; b++) {
    advance(e, budget);
    if (e.counts.completed === settings.count) break;
  }
  return e;
}
test("Photon RNG has shared uint32 fixtures, open samples and per-ID reproducibility", () => {
  const rng = new Random(1);
  assert.deepEqual([rng.next(), rng.next(), rng.next()], [270369, 67634689, 2647435461]);
  assert.equal(photonSeed(42, 0), 939911724);
  assert.equal(photonSeed(42, 1), 3948730756);
  const zero = new Random(0);
  for (let i = 0; i < 1024; i++) {
    const u = zero.uniform();
    assert.ok(u > 0 && u < 1);
  }
  assert.deepEqual(tracePhoton(defaultSettings, 42), tracePhoton(defaultSettings, 42));
});
test("Photon inverse CDF and boundary fixtures are independent of transport", () => {
  close(freePath(2, 0.5), Math.log(2) / 2);
  close(freePath(1, 0.75), 2 * freePath(2, 0.75));
  assert.equal(freePath(0, 0.5), Infinity);
  close(exitDistance({ position: [-1.5, 0], direction: [1, 0] }), 3);
  close(exitDistance({ position: [-1.5, 0], direction: [-1, 0] }), 0);
  close(exitDistance({ position: [0, 0], direction: [0, 1] }), 1);
  close(exitDistance({ position: [0, 0], direction: [Math.SQRT1_2, Math.SQRT1_2] }), Math.SQRT2);
  close(exitDistance({ position: [0, 1], direction: [1, 0] }), 1.5);
  const direction = scatterDirection(0.25);
  close(direction[0], 0);
  close(direction[1], 1);
});
test("Photon vacuum never interacts and does not consume a free-path draw", () => {
  const settings = { ...defaultSettings, muA: 0, muS: 0, count: 512 };
  const e = run(settings);
  assert.deepEqual(e.counts, {
    completed: 512,
    absorbed: 0,
    escaped: 512,
    censored: 0,
    ballistic: 512,
    scatteredPhotons: 0,
    scatterEvents: 0,
  });
  const rng = new Random(7),
    untouched = new Random(7);
  const flight = sampleFlight({ position: [-1.5, 0], direction: [1, 0] }, rng, settings);
  assert.equal(flight.escaped, true);
  close(flight.boundary, 3);
  assert.equal(rng.next(), untouched.next());
});
test("Photon absorption and mixed fixtures match C++, independent of batch size", () => {
  const settings = { ...defaultSettings, muS: 0, count: 512 };
  assert.deepEqual(run(settings).counts, {
    completed: 512,
    absorbed: 338,
    escaped: 174,
    censored: 0,
    ballistic: 174,
    scatteredPhotons: 0,
    scatterEvents: 0,
  });
  settings.muS = 0.9;
  const batched = run(settings);
  assert.deepEqual(batched.counts, {
    completed: 512,
    absorbed: 259,
    escaped: 253,
    censored: 0,
    ballistic: 8,
    scatteredPhotons: 368,
    scatterEvents: 681,
  });
  assert.deepEqual(run(settings, 1).counts, batched.counts);
  assert.equal(batched.recent.length, 24);
  const old = structuredClone(batched.counts);
  assert.equal(advance(batched, 32), 0);
  assert.deepEqual(batched.counts, old);
  assert.ok(audit() < 0.04);
});
test("Photon event cap is censored, never absorption, and longer traces retain their prefix", () => {
  const settings = { ...defaultSettings, muA: 0, muS: 2, count: 512, eventLimit: 1 };
  assert.deepEqual(run(settings).counts, {
    completed: 512,
    absorbed: 0,
    escaped: 0,
    censored: 512,
    ballistic: 0,
    scatteredPhotons: 512,
    scatterEvents: 512,
  });
  for (let id = 0; id < 128; id++) {
    const short = tracePhoton(settings, id),
      long = tracePhoton({ ...settings, eventLimit: 64 }, id);
    assert.ok(short.vertices.length <= 2 && long.vertices.length <= 65);
    assert.deepEqual(long.vertices.slice(0, short.vertices.length), short.vertices);
    for (const v of long.vertices)
      assert.ok(
        v.position[0] >= -1.5 - 1e-10 &&
          v.position[0] <= 1.5 + 1e-10 &&
          Math.abs(v.position[1]) <= 1 + 1e-10,
      );
  }
});
test("Photon counters conserve terminal counts; preview and original settings never mutate the experiment", () => {
  const settings = { ...defaultSettings, count: 512 },
    e = makeExperiment(settings);
  settings.muA = 2;
  assert.equal(e.settings.muA, 0.4);
  tracePhoton(e.settings, 100);
  advance(e, 0);
  assert.equal(e.counts.completed, 0);
  advance(e, 32);
  const c = e.counts;
  assert.equal(c.absorbed + c.escaped + c.censored, c.completed);
  assert.ok(
    c.ballistic <= c.escaped &&
      c.scatteredPhotons <= c.completed &&
      c.scatterEvents >= c.scatteredPhotons,
  );
});
test("Photon Wilson handles boundaries and separates ballistic prediction from total escape", () => {
  const interval = wilson(5, 10);
  close(interval[0], 0.236593090512564);
  close(interval[1], 0.7634069094874361);
  close(wilson(0, 10)[0], 0);
  assert.ok(wilson(0, 10)[1] > 0);
  close(wilson(10, 10)[1], 1);
  assert.ok(wilson(10, 10)[0] < 1);
  close(expectedBallistic({ ...defaultSettings, muS: 0 }), Math.exp(-1.2));
  close(expectedBallistic(defaultSettings), Math.exp(-3.9));
  const c = run({ ...defaultSettings, count: 512 }).counts;
  assert.ok(c.escaped > c.ballistic);
});
test("Photon validation rejects invalid uniforms, geometry, budgets, seeds and premature scattering", () => {
  for (const u of [0, 1, NaN, -0.01]) assert.throws(() => freePath(1, u), RangeError);
  for (const muT of [-1, 7, NaN, Infinity]) assert.throws(() => freePath(muT, 0.5), RangeError);
  for (const seed of [-1, 0x100000000, NaN])
    assert.throws(() => makeExperiment({ ...defaultSettings, seed }), RangeError);
  for (const count of [0, 8193, 1.5])
    assert.throws(() => makeExperiment({ ...defaultSettings, count }), RangeError);
  for (const eventLimit of [0, 65, 1.5])
    assert.throws(() => makeExperiment({ ...defaultSettings, eventLimit }), RangeError);
  for (const budget of [-1, 33, 1.5])
    assert.throws(() => advance(makeExperiment(defaultSettings), budget), RangeError);
  assert.throws(() => exitDistance({ position: [0, 0], direction: [2, 0] }), RangeError);
  assert.throws(() => photonSeed(42, 8192), RangeError);
  assert.throws(() => wilson(0, 0), RangeError);
  assert.throws(() => wilson(2, 1), RangeError);
  assert.throws(() => tracePhoton(defaultSettings, 0, 4), RangeError);
  assert.throws(
    () => tally(makeExperiment(defaultSettings).counts, { status: "alive" }),
    RangeError,
  );
});
