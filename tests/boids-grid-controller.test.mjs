import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultBoidsParams as defaults,
  computeSteering,
  findNeighbors,
  makeFlock,
  multiply,
  vectorEpsilon,
} from "../lib/labs/boids.ts";
import { buildBoidsGrid, queryBoidsGrid } from "../lib/labs/boids-grid.ts";
import {
  createGridBenchmark,
  tickGridBenchmark,
  cancelGridBenchmark,
} from "../lib/labs/boids-grid-benchmark.ts";
import {
  createGridScene,
  stopGridScene,
  advanceGridScene,
  requestGridStep,
  validateGridScene,
} from "../lib/labs/boids-grid-scene.ts";
import { advanceGridStep } from "../lib/labs/boids-grid-step.ts";
import { createGridValidation, tickGridValidation } from "../lib/labs/boids-grid-validation.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";

test("Grid validator checks all neighbors, steering and one-step state, with cancellation", () => {
  const flock = makeFlock(256, 7);
  const job = createGridValidation(flock, defaults, 100);
  flock[0].position.x = 800;
  assert.notEqual(job.snapshot[0].position.x, 800);
  for (let tick = 0; tick < 1000 && job.active; tick++) tickGridValidation(job, 6);
  assert.equal(job.active, false);
  assert.equal(job.checked, 256);
  assert.equal(job.failures, 0);
  const bad = createGridValidation(flock, defaults, 100);
  bad.grid.buckets = bad.grid.buckets.map(() => []);
  tickGridValidation(bad, 1000, () => 0);
  assert.ok(bad.failures > 0, "validator must detect a broken grid");
  const cancelled = createGridValidation(flock, defaults, 100);
  cancelled.active = false;
  tickGridValidation(cancelled);
  assert.equal(cancelled.checked, 0);
});

test("Grid benchmark has finite scale rows, same seeded input, five measured samples", () => {
  const job = createGridBenchmark(defaults, 1, 64, "dense", "scale");
  assert.deepEqual(
    job.cases.map((row) => [row.count, row.method]),
    [
      [256, "brute"],
      [256, "grid"],
      [1024, "brute"],
      [1024, "grid"],
      [10000, "grid"],
    ],
  );
  assert.ok(job.cases.every((row) => row.layout === "uniform"));
  let ticks = 0;
  while (job.active) {
    tickGridBenchmark(job, () => 0);
    assert.ok(++ticks <= 35);
  }
  assert.equal(ticks, 35);
  assert.equal(job.rows.length, 5);
  assert.ok(
    job.rows.every(
      (row) => row.samples === 5 && row.minMs <= row.medianMs && row.medianMs <= row.maxMs,
    ),
  );
  for (const [brute, grid] of [
    [job.rows[0], job.rows[1]],
    [job.rows[2], job.rows[3]],
  ]) {
    assert.equal(brute.checksum, grid.checksum);
    assert.equal(brute.neighbors, grid.neighbors);
    assert.equal(brute.candidates, brute.count * (brute.count - 1));
    assert.ok(grid.candidates < brute.candidates);
  }
  const cells = createGridBenchmark(defaults, 7, 64, "dense", "cells");
  assert.equal(cells.cases.length, 7);
  assert.ok(cells.cases.every((row) => row.count === 1024 && row.layout === "dense"));
  tickGridBenchmark(cells);
  const rows = cells.rows.length;
  cancelGridBenchmark(cells);
  tickGridBenchmark(cells);
  assert.equal(cells.active, false);
  assert.equal(cells.step, null);
  assert.equal(cells.rows.length, rows);
});

test("Grid scene commits atomically and pause/reset/validation do not mutate the live flock", () => {
  const scene = createGridScene();
  const original = scene.boids;
  requestGridStep(scene);
  advanceGridStep(scene.job, 1, 1000, () => 0);
  assert.equal(scene.job.nextIndex, 1);
  assert.equal(scene.boids, original);
  stopGridScene(scene);
  assert.equal(scene.job, null);
  assert.equal(scene.boids, original);
  assert.equal(scene.steps, 0);
  requestGridStep(scene);
  for (let tick = 0; tick < 1000 && scene.job; tick++) advanceGridScene(scene);
  assert.equal(scene.steps, 1);
  assert.equal(scene.time, 1 / 60);
  assert.notEqual(scene.boids, original);
  assert.equal(scene.paused, true);
  const large = createGridScene(10, 10000);
  validateGridScene(large);
  assert.equal(large.count, 10000);
  assert.equal(large.validation, null);
  assert.match(large.notice, /Không tự giảm N/);
});

test("Grid clock is in seconds at 120 Hz and discards bounded overload", () => {
  const scene = createGridScene();
  scene.boids = makeFlock(4, 1);
  scene.count = 4;
  scene.paused = false;
  for (let frame = 0; frame < 120; frame++) advanceGridScene(scene, 1 / 120);
  assert.equal(scene.steps, 60);
  assert.ok(Math.abs(scene.time - 1) < 1e-9);
  advanceGridScene(scene, 100);
  assert.equal(scene.steps, 61);
  assert.ok(scene.droppedSeconds > 99);
  stopGridScene(scene);
  assert.equal(scene.accumulator, 0);
  assert.throws(() => advanceGridScene(scene, NaN));
});

test("Grid renderer draws all 10000 agents and uses the exact production query", async () => {
  const boidsView = await componentCallback("boids-view.ts", "boidsView", {});
  const drawBoids = await componentCallback("boids-view.ts", "drawBoids", {
    boidsView,
    vectorEpsilon,
    findNeighbors,
    computeSteering,
    length: (v) => Math.hypot(v.x, v.y),
    multiply,
  });
  const draw = await componentCallback("boids-grid-view.ts", "drawBoidsGrid", {
    boidsView,
    drawBoids,
  });
  const scene = { ...createGridScene(10, 10000), stage: 9 };
  const grid = buildBoidsGrid(scene.boids, scene.params, 100);
  const query = queryBoidsGrid(scene.boids, scene.selected, scene.params, grid);
  let triangles = 0;
  let cells = 0;
  const context = new Proxy(
    { fill: () => triangles++, strokeRect: () => cells++ },
    { get: (target, key) => (key in target ? target[key] : () => {}) },
  );
  draw(context, scene, { width: 760, height: 520, dpr: 2 }, grid, query, true, true);
  assert.equal(triangles, 10000);
  assert.equal(cells, 1 + grid.buckets.length);
});

test("Grid pointer capture, final-up position and unrelated pointer release", async () => {
  const model = { current: createGridScene() };
  const owner = { current: null };
  let captured = 0;
  const target = { setPointerCapture: () => captured++, focus() {} };
  let point = { x: 1, y: 2 };
  const down = await componentCallback("boids-spatial-grid-lab.tsx", "down", {
    model,
    owner,
    pointerPoint: () => point,
    nearestBoid: () => 3,
    publish() {},
  });
  const event = { pointerId: 11, button: 0, isPrimary: true, currentTarget: target };
  down(event);
  assert.equal(owner.current, 11);
  assert.equal(model.current.selected, 3);
  down({ ...event, pointerId: 12 });
  assert.equal(captured, 1);
  const drag = await componentCallback("boids-spatial-grid-lab.tsx", "drag", {
    pointerPoint: () => point,
    model,
    stopGridScene,
    publish() {},
  });
  const before = model.current.boids;
  point = { x: 300, y: 200 };
  const up = await componentCallback("boids-spatial-grid-lab.tsx", "up", {
    owner,
    drag,
    release: () => {
      owner.current = null;
    },
  });
  up({ ...event, pointerId: 12 });
  assert.equal(model.current.boids, before);
  up(event);
  assert.deepEqual(model.current.boids[3].position, point);
  assert.notEqual(model.current.boids, before);
  assert.equal(owner.current, null);
});

test("Grid lifecycle cancels work and removes window/document listeners", async () => {
  const listeners = new Map();
  const window = {
    addEventListener: (key, value) => listeners.set(key, value),
    removeEventListener: (key) => listeners.delete(key),
  };
  const document = {
    hidden: true,
    addEventListener: (key, value) => listeners.set(key, value),
    removeEventListener: (key) => listeners.delete(key),
  };
  let stopped = 0;
  let released = 0;
  const model = { current: createGridScene() };
  requestGridStep(model.current);
  const effect = await componentEffect(
    "boids-spatial-grid-lab.tsx",
    'window.addEventListener("blur"',
    { model, document, window, stop: () => stopped++, release: () => released++, stopGridScene },
  );
  const cleanup = effect();
  listeners.get("visibilitychange")();
  assert.equal(stopped, 1);
  cleanup();
  assert.equal(model.current.job, null);
  assert.equal(listeners.size, 0);
  assert.equal(released, 1);
});
