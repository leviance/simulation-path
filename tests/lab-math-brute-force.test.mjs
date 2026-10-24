import assert from "node:assert/strict";
import test from "node:test";
import {
  createParticleQueryWorkspace,
  makeParticleCloud,
  makeParticleProbeQueries,
  particleQueryResultsMatch,
  makeParticleScalingStudy,
  particleInsideCircleWithDistance,
  queryParticlesSquared,
  queryParticlesWithDistance,
  runParticleQueryBatch,
} from "../lib/labs/brute-force-particle-query.ts";

const bounds = { minimum: { x: 0, y: 0 }, maximum: { x: 1, y: 1 } };

test("Particle cloud generation is deterministic and remains inside its bounds", () => {
  const first = makeParticleCloud(1000, bounds, 0xc0ffee);
  const second = makeParticleCloud(1000, bounds, 0xc0ffee);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, makeParticleCloud(1000, bounds, 0xc0ffef));
  assert.equal(first.length, 1000);
  assert.ok(
    first.every(
      (particle) =>
        particle.x >= bounds.minimum.x &&
        particle.x <= bounds.maximum.x &&
        particle.y >= bounds.minimum.y &&
        particle.y <= bounds.maximum.y,
    ),
  );
});

test("Circle query includes its boundary and chooses the nearest stable index", () => {
  const particles = [
    { x: 0.5, y: 0.5 },
    { x: 0.6, y: 0.5 },
    { x: 0.4, y: 0.5 },
    { x: 0.9, y: 0.9 },
  ];
  const query = { center: { x: 0.5, y: 0.5 }, radius: 0.1 };
  assert.equal(particleInsideCircleWithDistance(particles[1], query), true);
  const result = queryParticlesSquared(particles, query, createParticleQueryWorkspace());
  assert.deepEqual(result.hitIndices, [0, 1, 2]);
  assert.equal(result.nearestIndex, 0);
  assert.equal(result.scanned, particles.length);
});

test("Squared-distance query matches the readable sqrt reference", () => {
  const particles = makeParticleCloud(10_000, bounds, 0x12345678);
  const queries = makeParticleProbeQueries(24, bounds, 0.075, 0x87654321);
  const workspace = createParticleQueryWorkspace();
  for (const query of queries) {
    const reference = queryParticlesWithDistance(particles, query);
    const optimized = queryParticlesSquared(particles, query, workspace);
    assert.deepEqual(optimized.hitIndices, reference.hitIndices);
    assert.equal(optimized.nearestIndex, reference.nearestIndex);
    assert.ok(
      Math.abs(optimized.nearestDistanceSquared - reference.nearestDistanceSquared) < 1e-15,
    );
  }
});

test("Result agreement compares the complete hit list instead of hit count alone", () => {
  const first = createParticleQueryWorkspace();
  first.nearestIndex = 2;
  first.hitIndices.push(1, 2, 4);
  const second = createParticleQueryWorkspace();
  second.nearestIndex = 2;
  second.hitIndices.push(1, 3, 4);
  assert.equal(particleQueryResultsMatch(first, second), false);
  second.hitIndices[1] = 2;
  assert.equal(particleQueryResultsMatch(first, second), true);
});

test("Reusable workspace keeps its hit array while every radius still scans all particles", () => {
  const particles = makeParticleCloud(5000, bounds, 0xabcdef01);
  const workspace = createParticleQueryWorkspace();
  const hitArray = workspace.hitIndices;
  const small = queryParticlesSquared(
    particles,
    { center: { x: 0.5, y: 0.5 }, radius: 0.01 },
    workspace,
  );
  const smallHitCount = small.hitIndices.length;
  const large = queryParticlesSquared(
    particles,
    { center: { x: 0.5, y: 0.5 }, radius: 0.35 },
    workspace,
  );
  assert.equal(large.hitIndices, hitArray);
  assert.ok(large.hitIndices.length > smallHitCount);
  assert.equal(large.scanned, 5000);
});

test("Batch checksum is deterministic and scaling work grows exactly with particle count", () => {
  const particles = makeParticleCloud(100_000, bounds, 0x31415926);
  const queries = makeParticleProbeQueries(8, bounds, 0.05, 0x27182818);
  const first = runParticleQueryBatch(particles, queries, 2, createParticleQueryWorkspace());
  const second = runParticleQueryBatch(particles, queries, 2, createParticleQueryWorkspace());
  assert.deepEqual(first, second);
  assert.equal(first.queryCount, 16);
  assert.equal(first.totalScanned, 100_000 * 16);

  const rows = makeParticleScalingStudy(particles, queries, [1000, 10_000, 100_000], 1);
  assert.deepEqual(
    rows.map((row) => row.totalScanned),
    [1000 * 8, 10_000 * 8, 100_000 * 8],
  );
});

import {
  makeBruteScene,
  bruteStage,
  editBrute,
  moveBrute,
  stepBrute,
  requestBrute,
  advanceBrute,
  stopBrute,
  bruteJobOracle,
} from "../lib/labs/brute-force-scene.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";

test("P27 full 100k positions reproduce and xorshift seed 1 matches known integers", () => {
  const a = makeParticleCloud(100_000, bounds, 1),
    b = makeParticleCloud(100_000, bounds, 1);
  assert.deepEqual(a, b);
  assert.equal(a[0].x, 270369 / 4294967295);
  assert.equal(a[0].y, 67634689 / 4294967295);
  assert.ok(a.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1));
});

test("P27 exact boundary, global nearest tie, empty, invalid and zero radius are distinct", () => {
  const points = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1.01, y: 0 },
  ];
  const workspace = createParticleQueryWorkspace();
  queryParticlesSquared(points, { center: { x: 0, y: 0 }, radius: 1 }, workspace);
  assert.deepEqual(workspace.hitIndices, [0, 1, 2, 3]);
  assert.equal(workspace.nearestIndex, 0);
  queryParticlesSquared(points, { center: { x: 0, y: 0 }, radius: 0 }, workspace);
  assert.deepEqual(workspace.hitIndices, []);
  assert.equal(workspace.nearestIndex, 0);
  assert.equal(workspace.scanned, 5);
  queryParticlesSquared([], { center: { x: 0, y: 0 }, radius: 1 }, workspace);
  assert.equal(workspace.nearestIndex, -1);
  assert.equal(workspace.scanned, 0);
  queryParticlesSquared(points, { center: { x: NaN, y: 0 }, radius: 1 }, workspace);
  assert.equal(workspace.scanned, 0);
});

test("P27 24 full-scale queries match independent complete hypot oracle", () => {
  const points = makeParticleCloud(100_000, bounds, 0xc0ffee),
    queries = makeParticleProbeQueries(24, bounds, 0.12, 0x12345678);
  for (const query of queries) {
    const hits = [];
    let nearest = -1,
      distance = Infinity;
    for (let i = 0; i < points.length; i++) {
      const d = Math.hypot(points[i].x - query.center.x, points[i].y - query.center.y);
      if (d <= query.radius) hits.push(i);
      if (d < distance) {
        distance = d;
        nearest = i;
      }
    }
    const actual = queryParticlesSquared(points, query, createParticleQueryWorkspace());
    assert.deepEqual(actual.hitIndices, hits);
    assert.equal(actual.nearestIndex, nearest);
    assert.equal(actual.scanned, 100_000);
  }
});

test("P27 stages hide future query algorithms and empty prefix reports no nearest", () => {
  for (let stage = 1; stage <= 2; stage++) {
    const s = makeBruteScene(stage);
    assert.equal(s.result.scanned, 0);
    requestBrute(s, false);
    assert.equal(s.job.active, false);
  }
  const s = makeBruteScene(3);
  editBrute(s, "scanLimit", 0);
  assert.equal(s.result.nearestIndex, -1);
  assert.equal(s.result.scanned, 0);
  stepBrute(s);
  assert.equal(s.result.scanned, 10_000);
  assert.equal(bruteStage("brute-scene"), 1);
  assert.equal(bruteStage(), 7);
});

test("P27 incremental job warm-up excluded, exactly 48 queries and checksum agrees", () => {
  const scene = makeBruteScene(7);
  requestBrute(scene, false);
  let time = 0,
    ticks = 0;
  const now = () => {
    time += 0.25;
    return time;
  };
  for (let i = 0; i < 24; i++) advanceBrute(scene, 0, now);
  assert.equal(scene.job.metrics.queryCount, 0);
  while (scene.job.active && ticks < 49) {
    advanceBrute(scene, 0, now);
    ticks++;
  }
  assert.equal(ticks, 48);
  assert.equal(scene.benchmark.queryCount, 48);
  assert.equal(scene.benchmark.elapsedMilliseconds, 12);
  const expected = bruteJobOracle(scene, scene.count);
  assert.equal(scene.benchmark.checksum, expected.checksum);
  assert.equal(scene.benchmark.totalScanned, 4_800_000);
});

test("P27 scaling uses one fixed probe set, exact work and 216 finite ticks", () => {
  const scene = makeBruteScene(7);
  editBrute(scene, "count", 1000);
  requestBrute(scene, true);
  const probes = scene.job.probes;
  let ticks = 0;
  while (scene.job.active && ticks < 217) {
    advanceBrute(scene, 0, () => 1);
    ticks++;
  }
  assert.equal(ticks, 216);
  assert.equal(scene.job.probes, probes);
  assert.deepEqual(
    scene.rows.map((r) => r.particleCount),
    [1000, 10000, 100000],
  );
  assert.deepEqual(
    scene.rows.map((r) => r.totalScanned),
    [48000, 480000, 4800000],
  );
  for (const row of scene.rows)
    assert.equal(row.checksum, bruteJobOracle(scene, row.particleCount).checksum);
});

test("P27 cancel and workload edits stop jobs and clear stale rows", () => {
  const scene = makeBruteScene(7);
  requestBrute(scene, true);
  advanceBrute(scene, 0);
  stopBrute(scene);
  const cursor = scene.job.warmup;
  advanceBrute(scene, 0);
  assert.equal(scene.job.warmup, cursor);
  requestBrute(scene, false);
  editBrute(scene, "radius", 0.15);
  assert.equal(scene.job.active, false);
  assert.equal(scene.benchmark, null);
  assert.deepEqual(scene.rows, []);
  requestBrute(scene, false);
  editBrute(scene, "seed", 0x12345678);
  assert.equal(scene.job.active, false);
});

test("P27 moving interactive lens does not alter deterministic benchmark probes", () => {
  const scene = makeBruteScene(7);
  requestBrute(scene, false);
  const probes = structuredClone(scene.job.probes);
  moveBrute(scene, { x: 0.2, y: 0.8 });
  assert.deepEqual(scene.job.probes, probes);
  assert.equal(scene.job.active, true);
});

test("P27 actual pointer handlers require capture success and preserve owner/final up", async () => {
  let moved = 0,
    released = 0,
    stopped = 0;
  const owner = { current: null },
    size = { width: 760, height: 660, dpr: 2 };
  const canvas = {
    setPointerCapture() {},
    hasPointerCapture() {
      return true;
    },
  };
  const env = {
    stage: 7,
    owner,
    size,
    point: (e) => ({ x: e.clientX, y: e.clientY }),
    bruteView: () => ({}),
    bruteInView: () => true,
    setCapturing() {},
    move() {
      moved++;
    },
    release() {
      released++;
      owner.current = null;
    },
    stop() {
      stopped++;
    },
  };
  const down = await componentCallback("brute-force-particle-query-lab.tsx", "onPointerDown", env);
  const move = await componentCallback("brute-force-particle-query-lab.tsx", "onPointerMove", env);
  const up = await componentCallback("brute-force-particle-query-lab.tsx", "onPointerUp", env);
  const cancel = await componentCallback(
    "brute-force-particle-query-lab.tsx",
    "onPointerCancel",
    env,
  );
  const event = {
    pointerId: 11,
    button: 0,
    isPrimary: true,
    currentTarget: canvas,
    pointerType: "mouse",
    buttons: 1,
  };
  down({ ...event, button: 2 });
  assert.equal(owner.current, null);
  down({
    ...event,
    currentTarget: {
      setPointerCapture() {
        throw Error("capture denied");
      },
    },
  });
  assert.equal(moved, 0);
  down(event);
  assert.equal(owner.current, 11);
  assert.equal(moved, 1);
  move({ ...event, pointerId: 22 });
  up({ ...event, pointerId: 22 });
  cancel({ ...event, pointerId: 22 });
  assert.equal(moved, 1);
  assert.equal(released, 0);
  assert.equal(stopped, 0);
  up({ ...event, button: 2 });
  assert.equal(owner.current, 11);
  up(event);
  assert.equal(moved, 2);
  assert.equal(released, 1);
  assert.equal(owner.current, null);
  down(event);
  move({ ...event, buttons: 0 });
  assert.equal(released, 2);
});

test("P27 actual keyboard handler gates future actions and leaves Tab alone", async () => {
  const calls = [],
    scene = makeBruteScene(2),
    current = { current: scene };
  const env = {
    stage: 2,
    current,
    reset: () => calls.push("reset"),
    stop: () => calls.push("stop"),
    run: () => calls.push("run"),
    toggle: () => calls.push("toggle"),
    step: () => calls.push("step"),
    debug: () => calls.push("debug"),
    release: () => calls.push("release"),
    moveBrute,
    publish: () => calls.push("publish"),
  };
  const key = await componentCallback("brute-force-particle-query-lab.tsx", "onKeyDown", env);
  const event = (k) => ({
    key: k,
    repeat: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    preventDefault() {
      calls.push("prevent");
    },
  });
  key(event("b"));
  key(event("s"));
  key(event(" "));
  key(event("Tab"));
  assert.deepEqual(calls, []);
  key(event("ArrowRight"));
  assert.equal(scene.query.center.x, 0.52);
  key(event("Escape"));
  assert.ok(calls.includes("stop"));
});

test("P27 actual cleanup releases capture and unsubscribes focus/visibility listeners", async () => {
  const listeners = {},
    removed = [],
    owner = { current: 5 };
  let released = 0,
    stopped = 0;
  const canvas = {
    hasPointerCapture: (id) => id === 5,
    releasePointerCapture() {
      released++;
    },
  };
  const target = {
    addEventListener: (n, fn) => {
      listeners[n] = fn;
    },
    removeEventListener: (n) => removed.push(n),
  };
  const env = {
    canvasRef: { current: canvas },
    owner,
    stop: () => stopped++,
    window: target,
    document: { ...target, hidden: true },
  };
  const effect = await componentEffect(
      "brute-force-particle-query-lab.tsx",
      "visibilitychange",
      env,
    ),
    cleanup = effect();
  listeners.blur();
  listeners.visibilitychange();
  assert.equal(stopped, 2);
  env.canvasRef.current = null;
  cleanup();
  assert.equal(released, 1);
  assert.deepEqual(removed, ["blur", "visibilitychange"]);
});

test("P27 actual bitmap renderer visits every one of 100000 points, including last", async () => {
  const visited = new Set(),
    count = 100_000,
    size = { width: 760, height: 660, dpr: 2 };
  const context = {
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData() {},
  };
  const bitmap = { width: 0, height: 0, getContext: () => context };
  const scene = {
    count,
    particles: Array.from({ length: count }, (_, i) => ({ x: i / count, y: 0.5 })),
  };
  const actual = await componentCallback("brute-force-view.ts", "makeBruteBitmap", {
    document: { createElement: () => bitmap },
    bruteView: () => ({}),
    bruteWorldToScreen: (p) => {
      visited.add(p.x);
      return { x: 20 + p.x * 600, y: 100 };
    },
  });
  actual(scene, size);
  assert.equal(visited.size, count);
  assert.ok(visited.has((count - 1) / count));
});

test("P27 screen conversion uses CSS size once, not DPR twice", async () => {
  const view = await componentCallback("brute-force-view.ts", "bruteView", {}),
    toWorld = await componentCallback("brute-force-view.ts", "bruteScreenToWorld", {});
  const toScreen = await componentCallback("brute-force-view.ts", "bruteWorldToScreen", {});
  for (const size of [
    { width: 760, height: 660 },
    { width: 420, height: 500 },
  ])
    for (const point of [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 0.23, y: 0.78 },
    ]) {
      const restored = toWorld(
        toScreen(point, view(size.width, size.height)),
        view(size.width, size.height),
      );
      assert.ok(Math.abs(restored.x - point.x) < 1e-12 && Math.abs(restored.y - point.y) < 1e-12);
    }
});

test("P27 SSR initial state never calls the wall clock and has deterministic timing", () => {
  const first = makeBruteScene(7),
    second = makeBruteScene(7);
  assert.equal(first.queryMilliseconds, 0);
  assert.equal(second.queryMilliseconds, 0);
  assert.deepEqual(first.result, second.result);
});

test("P27 actual reset releases capture and measures the new query outside SSR", async () => {
  const scene = makeBruteScene(7);
  editBrute(scene, "count", 1000);
  requestBrute(scene, false);
  const current = { current: scene },
    calls = [];
  let time = 0;
  const { refreshBrute } = await import("../lib/labs/brute-force-scene.ts");
  const reset = await componentCallback("brute-force-particle-query-lab.tsx", "reset", {
    current,
    stage: 7,
    makeBruteScene,
    release: () => calls.push("release"),
    refreshBrute: (s) => {
      refreshBrute(s, () => ++time);
      calls.push("measure");
    },
    publish: () => calls.push("publish"),
  });
  reset();
  assert.deepEqual(calls, ["release", "measure", "publish"]);
  assert.equal(current.current.count, 100000);
  assert.equal(current.current.queryMilliseconds, 1);
  assert.equal(current.current.job.active, false);
});
