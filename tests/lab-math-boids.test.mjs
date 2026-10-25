import assert from "node:assert/strict";
import test from "node:test";
import {
  defaultBoidsParams as defaults,
  displacement,
  minimumImage,
  wrap,
  limit,
  makeFlock,
  findNeighbors,
  computeSteering,
  integrateBoid,
  stepBoids,
  validateBoidsParams,
  validateBoids,
  overlapDirection,
  vectorEpsilon,
} from "../lib/labs/boids.ts";
import { createBoidsBenchmark, tickBoidsBenchmark } from "../lib/labs/boids-benchmark.ts";
import {
  createBoidsScene,
  stepBoidsScene,
  advanceBoidsScene,
  stopBoidsScene,
} from "../lib/labs/boids-scene.ts";
import { componentCallback, componentEffect, canvasCallback } from "./lab-handler-support.mjs";

const near = (actual, expected, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} != ${expected}`);
const vectorNear = (actual, expected, tolerance = 1e-9) => {
  near(actual.x, expected.x, tolerance);
  near(actual.y, expected.y, tolerance);
};
const boid = (id, x, y, vx = 0, vy = 0) => ({ id, position: { x, y }, velocity: { x: vx, y: vy } });
const ids = (flock, indices) => indices.map((index) => flock[index].id).sort((a, b) => a - b);

// Oracle khác thuật toán production: xét chín ảnh tuần hoàn, dùng hypot.
function oracle(flock, target, params) {
  return flock
    .filter((other) => {
      if (other.id === target.id) return false;
      let distance = Infinity;
      for (const x of [-params.width, 0, params.width]) {
        for (const y of [-params.height, 0, params.height]) {
          distance = Math.min(
            distance,
            Math.hypot(
              other.position.x + x - target.position.x,
              other.position.y + y - target.position.y,
            ),
          );
        }
      }
      return distance <= params.radius;
    })
    .map((other) => other.id)
    .sort((a, b) => a - b);
}

test("Boids seed uses known xorshift words and preserves stable IDs", () => {
  const flock = makeFlock(1024, 1);
  near(flock[0].position.x, (270369 / 4294967296) * 960);
  near(flock[0].position.y, (67634689 / 4294967296) * 600);
  const angle = (2647435461 / 4294967296) * Math.PI * 2;
  vectorNear(flock[0].velocity, { x: Math.cos(angle) * 54, y: Math.sin(angle) * 54 });
  assert.deepEqual(flock, makeFlock(1024, 1));
  assert.notDeepEqual(flock, makeFlock(1024, 2));
  flock.forEach((item, index) => {
    assert.equal(item.id, index);
    assert.ok(item.position.x >= 0 && item.position.x < 960);
    assert.ok(item.position.y >= 0 && item.position.y < 600);
  });
  assert.deepEqual(makeFlock(2, 0), makeFlock(2, 0x6d2b79f5));
});

test("Boids periodic displacement is antisymmetric, including half-domain ties", () => {
  near(wrap(-1, 960), 959);
  assert.equal(wrap(-1e-20, 960), 0);
  near(wrap(1920, 960), 0);
  near(minimumImage(958, 960), -2);
  near(minimumImage(-958, 960), 2);
  near(minimumImage(480, 960), 480);
  near(minimumImage(-480, 960), -480);
  vectorNear(displacement({ x: 1, y: 1 }, { x: 959, y: 599 }, defaults), { x: -2, y: -2 });
});

test("Boids neighbors include the exact radius, exclude self, and work across seams", () => {
  const params = { ...defaults, radius: 5 };
  const flock = [boid(10, 1, 1), boid(20, 4, 5), boid(30, 959, 1), boid(40, 20, 20)];
  assert.deepEqual(ids(flock, findNeighbors(flock, 0, params)), [20, 30]);
  const samePlace = [boid(0, 10, 10), boid(1, 10, 10), boid(2, 10.1, 10)];
  assert.deepEqual(ids(samePlace, findNeighbors(samePlace, 0, { ...defaults, radius: 0 })), [1]);
  assert.deepEqual(findNeighbors([boid(4, 1, 1)], 0, defaults), []);
  assert.throws(() => findNeighbors([], 0, defaults), RangeError);
});

test("Boids brute force matches an independent nine-image oracle", () => {
  for (const seed of [1, 7, 99]) {
    const flock = makeFlock(48, seed);
    for (const radius of [0, 5, 64, 240]) {
      const params = { ...defaults, radius };
      flock.forEach((item, index) =>
        assert.deepEqual(
          ids(flock, findNeighbors(flock, index, params)),
          oracle(flock, item, params),
        ),
      );
    }
  }
});

test("Boids steering fixture separates repulsion, matching velocity and cohesion", () => {
  const flock = [boid(0, 100, 100), boid(1, 110, 100, 0, 20)];
  const steering = computeSteering(flock, 0, [1], defaults);
  vectorNear(steering.separation, { x: -60, y: 0 });
  vectorNear(steering.alignment, { x: 0, y: 60 });
  vectorNear(steering.cohesion, { x: 60, y: 0 });
  const weighted = { x: -42, y: 60 };
  const scale = 60 / Math.hypot(weighted.x, weighted.y);
  vectorNear(steering.acceleration, { x: weighted.x * scale, y: weighted.y * scale });
  assert.deepEqual(computeSteering(flock, 0, [], defaults).acceleration, { x: 0, y: 0 });
});

test("Boids opposite neighbors cancel and zero average is not accidental braking", () => {
  const flock = [boid(0, 100, 100), boid(1, 90, 100, -10, 0), boid(2, 110, 100, 10, 0)];
  const steering = computeSteering(flock, 0, [1, 2], defaults);
  vectorNear(steering.separation, { x: 0, y: 0 });
  vectorNear(steering.alignment, { x: 0, y: 0 });
  vectorNear(steering.cohesion, { x: 0, y: 0 });
});

test("Boids overlap fallback uses IDs and opposite finite directions", () => {
  for (const pair of [
    [0, 1],
    [2, 4],
    [0xffffffff, 7],
  ]) {
    const forward = overlapDirection(...pair);
    const reverse = overlapDirection(pair[1], pair[0]);
    vectorNear(forward, { x: -reverse.x, y: -reverse.y });
    near(Math.hypot(forward.x, forward.y), 1);
  }
  const flock = [boid(0, 100, 100), boid(1, 100, 100)];
  const a = computeSteering(flock, 0, [1], defaults);
  const b = computeSteering(flock, 1, [0], defaults);
  vectorNear(a.separation, { x: -b.separation.x, y: -b.separation.y });
  near(Math.hypot(a.separation.x, a.separation.y), 60);
});

test("Boids limits hold even for tiny vectors and large combined weights", () => {
  near(Math.hypot(...Object.values(limit({ x: 1e-10, y: 0 }, 1e-12))), 1e-12, 1e-20);
  const params = { ...defaults, separationWeight: 5, alignmentWeight: 5, cohesionWeight: 5 };
  const flock = makeFlock(256, 42, params);
  flock.forEach((_, index) => {
    const steering = computeSteering(flock, index, findNeighbors(flock, index, params), params);
    assert.ok(
      Math.hypot(steering.acceleration.x, steering.acceleration.y) <= params.maxAcceleration + 1e-9,
    );
  });
  const result = stepBoids(flock, params, 0.05);
  result.boids.forEach((item) =>
    assert.ok(Math.hypot(item.velocity.x, item.velocity.y) <= params.maxSpeed + 1e-9),
  );
});

test("Boids step does not mutate snapshot and is permutation equivariant by ID", () => {
  const source = makeFlock(48, 19);
  const saved = structuredClone(source);
  const forward = stepBoids(source, defaults, 1 / 60).boids;
  const reverse = stepBoids([...source].reverse(), defaults, 1 / 60).boids.reverse();
  assert.deepEqual(source, saved);
  forward.forEach((item, index) => {
    assert.equal(item.id, reverse[index].id);
    vectorNear(item.position, reverse[index].position);
    vectorNear(item.velocity, reverse[index].velocity);
  });
  assert.deepEqual(stepBoids(source, defaults, 1 / 60).boids, forward);
});

test("Boids comparison counters prove all-pairs work for every required preset", () => {
  for (const count of [256, 512, 1024]) {
    const source = makeFlock(count, 1);
    const result = stepBoids(source, defaults, 1 / 60);
    assert.equal(result.boids.length, count);
    assert.equal(result.metrics.comparisons, count * (count - 1));
    assert.ok(result.metrics.totalMs >= 0 && Number.isFinite(result.metrics.totalMs));
    validateBoids(result.boids, defaults);
    assert.ok(result.boids.some((item, index) => item.position.x !== source[index].position.x));
  }
});

test("Boids weights change the actual simulation and lesson stages add only their rules", () => {
  const flock = [boid(0, 100, 100), boid(1, 110, 100, 0, 20)];
  const separation = computeSteering(flock, 0, [1], defaults, 4);
  vectorNear(separation.alignment, { x: 0, y: 0 });
  vectorNear(separation.cohesion, { x: 0, y: 0 });
  const alignment = computeSteering(flock, 0, [1], defaults, 5);
  assert.notDeepEqual(alignment.alignment, { x: 0, y: 0 });
  vectorNear(alignment.cohesion, { x: 0, y: 0 });
  const noSeparation = { ...defaults, separationWeight: 0 };
  assert.notDeepEqual(
    stepBoids(flock, defaults, 1 / 60).boids,
    stepBoids(flock, noSeparation, 1 / 60).boids,
  );
});

test("Boids ballistic motion uses seconds and converges against an analytic acceleration fixture", () => {
  const params = { ...defaults, separationWeight: 0, alignmentWeight: 0, cohesionWeight: 0 };
  const source = [boid(0, 900, 300, 40, 10)];
  for (const chunks of [
    Array(120).fill(1 / 60),
    Array(80).fill(0.025),
    Array(40).fill(0.02).concat(Array(40).fill(0.03)),
  ]) {
    let state = source;
    for (const dt of chunks) state = stepBoids(state, params, dt).boids;
    vectorNear(state[0].position, { x: 20, y: 320 }, 1e-8);
  }
  function error(dt, count) {
    let state = boid(0, 100, 100, 5, 0);
    for (let i = 0; i < count; i++) state = integrateBoid(state, { x: 2, y: 0 }, defaults, dt);
    return Math.abs(state.position.x - 106);
  }
  near(error(0.025, 40), 0.025);
  near(error(0.0125, 80), 0.0125);
});

test("Boids rejects invalid parameters/state/dt instead of generating NaN", () => {
  for (const patch of [
    { radius: -1 },
    { radius: 300 },
    { maxSpeed: 0 },
    { maxAcceleration: Infinity },
    { width: 0 },
    { width: 1e308 },
    { cohesionWeight: 6 },
    { separationWeight: NaN },
  ])
    assert.throws(() => validateBoidsParams({ ...defaults, ...patch }), RangeError);
  assert.throws(() => makeFlock(1025, 1), RangeError);
  assert.throws(() => makeFlock(1, -1), RangeError);
  assert.throws(() => stepBoids([boid(0, 1, 1), boid(0, 2, 2)], defaults, 1 / 60), RangeError);
  assert.throws(() => stepBoids([boid(0, -1, 0)], defaults, 1 / 60), RangeError);
  assert.throws(() => stepBoids([boid(0, 1, 1, 1.7e308, 1.7e308)], defaults, 1 / 60), RangeError);
  for (const dt of [-1, NaN, Infinity, 0.051])
    assert.throws(() => stepBoids([], defaults, dt), RangeError);
  assert.deepEqual(stepBoids([], defaults, 0).boids, []);
});

test("Boids benchmark is bounded, cancellable and reports measured full steps", () => {
  let clock = 0;
  const now = () => (clock += 0.001);
  const job = createBoidsBenchmark(1);
  const source = structuredClone(job.source);
  for (let tick = 0; tick < 27; tick++) tickBoidsBenchmark(job, now);
  assert.equal(job.active, false);
  assert.equal(job.rows.length, 3);
  assert.deepEqual(job.source, source);
  for (const row of job.rows) {
    assert.equal(row.samples, 7);
    assert.equal(row.comparisons, row.count * (row.count - 1));
    assert.ok(row.medianMs >= row.minMs && row.medianMs <= row.maxMs);
    assert.ok(row.checksum > 0);
  }
  const cancelled = createBoidsBenchmark(1);
  tickBoidsBenchmark(cancelled, now);
  cancelled.active = false;
  const saved = structuredClone(cancelled);
  tickBoidsBenchmark(cancelled, now);
  assert.deepEqual(cancelled, saved);
});

test("Boids scene pause/reset/fixed clock keeps simulation time separate from dropped wall time", () => {
  const scene = createBoidsScene(1);
  advanceBoidsScene(scene, 1);
  assert.equal(scene.steps, 0);
  scene.paused = false;
  advanceBoidsScene(scene, 1);
  assert.equal(scene.steps, 3);
  near(scene.time, 0.05);
  near(scene.droppedSeconds, 0.95);
  near(scene.boids[0].position.x, 242.7);
  const old = structuredClone(scene);
  advanceBoidsScene(scene, NaN);
  advanceBoidsScene(scene, -1);
  assert.deepEqual(scene, old);
  stopBoidsScene(scene);
  assert.equal(scene.paused, true);
  stepBoidsScene(scene);
  assert.equal(scene.steps, 4);
  const reset = createBoidsScene(9, 512, 42, { ...defaults, alignmentWeight: 2 });
  assert.equal(reset.count, 512);
  assert.equal(reset.params.alignmentWeight, 2);
  assert.deepEqual(reset.boids, makeFlock(512, 42, reset.params));
});

test("Boids pointer handlers use the real capture owner, final up and cancelled release", async () => {
  const scene = createBoidsScene(9);
  const model = { current: scene },
    owner = { current: null };
  let releases = 0;
  const canvas = { setPointerCapture() {}, focus() {} };
  const env = {
    model,
    owner,
    publish() {},
    pointerPoint: (event) => event.point ?? null,
    nearestBoid: () => 0,
    release: () => {
      owner.current = null;
      releases++;
    },
  };
  env.drag = await componentCallback("boids-2d-lab.tsx", "drag", env);
  const down = await componentCallback("boids-2d-lab.tsx", "down", env);
  const move = await componentCallback("boids-2d-lab.tsx", "move", env);
  const up = await componentCallback("boids-2d-lab.tsx", "up", env);
  const event = {
    pointerId: 7,
    isPrimary: true,
    button: 0,
    buttons: 1,
    point: { x: 100, y: 120 },
    currentTarget: canvas,
  };
  down(event);
  assert.equal(owner.current, 7);
  move({ ...event, pointerId: 8, point: { x: 900, y: 500 } });
  assert.notDeepEqual(scene.boids[0].position, { x: 900, y: 500 });
  up({ ...event, point: { x: 200, y: 210 } });
  assert.deepEqual(scene.boids[0].position, { x: 200, y: 210 });
  assert.equal(owner.current, null);
  down(event);
  move({ ...event, buttons: 0 });
  assert.equal(owner.current, null);
  let stopped = 0;
  const cancel = await canvasCallback("boids-2d-lab.tsx", "onPointerCancel", {
    owner,
    stop: () => stopped++,
  });
  owner.current = 7;
  cancel({ pointerId: 8 });
  assert.equal(stopped, 0);
  cancel({ pointerId: 7 });
  assert.equal(stopped, 1);
  assert.ok(releases >= 2);
});

test("Boids keyboard shortcuts do not consume modified/repeated keys", async () => {
  const model = { current: createBoidsScene(9) };
  let toggles = 0,
    steps = 0,
    resets = 0,
    stops = 0,
    prevented = 0;
  const key = await componentCallback("boids-2d-lab.tsx", "key", {
    model,
    publish() {},
    toggle: () => toggles++,
    step: () => steps++,
    reset: () => resets++,
    stop: () => stops++,
  });
  const event = { key: " ", preventDefault: () => prevented++ };
  key({ ...event, ctrlKey: true });
  key({ ...event, repeat: true });
  assert.equal(toggles, 0);
  key(event);
  key({ ...event, key: "n" });
  key({ ...event, key: "r" });
  key({ ...event, key: "Escape" });
  key({ ...event, key: "ArrowLeft" });
  assert.equal(toggles, 1);
  assert.equal(steps, 1);
  assert.equal(resets, 1);
  assert.equal(stops, 1);
  assert.equal(model.current.selected, 255);
  assert.equal(prevented, 5);
});

test("Boids moving focus to an internal Pause control does not pre-toggle simulation", async () => {
  class FakeNode {}
  const internal = new FakeNode();
  let stops = 0;
  const blur = await componentCallback("boids-2d-lab.tsx", "blur", {
    Node: FakeNode,
    stop: () => stops++,
  });
  const currentTarget = { contains: (node) => node === internal };
  blur({ currentTarget, relatedTarget: internal });
  assert.equal(stops, 0);
  blur({ currentTarget, relatedTarget: new FakeNode() });
  blur({ currentTarget, relatedTarget: null });
  assert.equal(stops, 2);
});

test("Boids lifecycle removes listeners and releases capture on dispose", async () => {
  const windowListeners = new Map(),
    documentListeners = new Map();
  const add = (map) => (name, callback) => map.set(name, callback);
  const remove = (map) => (name, callback) => {
    assert.equal(map.get(name), callback);
    map.delete(name);
  };
  let stops = 0,
    releases = 0;
  const document = {
    hidden: true,
    addEventListener: add(documentListeners),
    removeEventListener: remove(documentListeners),
  };
  const effect = await componentEffect("boids-2d-lab.tsx", 'window.addEventListener("blur"', {
    window: {
      addEventListener: add(windowListeners),
      removeEventListener: remove(windowListeners),
    },
    document,
    stop: () => stops++,
    release: () => releases++,
  });
  const dispose = effect();
  windowListeners.get("blur")();
  documentListeners.get("visibilitychange")();
  assert.equal(stops, 2);
  dispose();
  assert.equal(releases, 1);
  assert.equal(windowListeners.size + documentListeners.size, 0);
});

test("Boids pointer conversion uses CSS coordinates once at different DPR and letterboxes", async () => {
  const scene = createBoidsScene(9);
  const boidsView = await componentCallback("boids-view.ts", "boidsView", {});
  const pointer = await componentCallback("boids-view.ts", "boidsPointer", { boidsView });
  for (const size of [
    { width: 760, height: 520, dpr: 1 },
    { width: 760, height: 520, dpr: 2 },
    { width: 420, height: 300, dpr: 3 },
  ]) {
    const rect = { left: 120, top: 35, width: size.width * 0.8, height: size.height * 0.8 };
    const canvas = { getBoundingClientRect: () => rect };
    const view = boidsView(size, scene);
    for (const world of [
      { x: 0, y: 0 },
      { x: 300, y: 250 },
      { x: 959, y: 599 },
    ]) {
      const client = {
        x: rect.left + ((view.left + world.x * view.scale) * rect.width) / size.width,
        y: rect.top + ((view.top + world.y * view.scale) * rect.height) / size.height,
      };
      const actual = pointer(client, canvas, size, scene);
      assert.ok(actual);
      vectorNear(actual, world);
    }
    assert.equal(pointer({ x: rect.left, y: rect.top }, canvas, size, scene), null);
  }
});

test("Boids actual Canvas renderer draws every required agent, not a sampled subset", async () => {
  const boidsView = await componentCallback("boids-view.ts", "boidsView", {});
  const draw = await componentCallback("boids-view.ts", "drawBoids", {
    boidsView,
    vectorEpsilon,
    findNeighbors,
    computeSteering,
    length: (vector) => Math.hypot(vector.x, vector.y),
    multiply: (vector, scalar) => ({ x: vector.x * scalar, y: vector.y * scalar }),
  });
  for (const count of [256, 512, 1024]) {
    for (const debug of [false, true]) {
      const scene = createBoidsScene(9, count);
      scene.debug = debug;
      let triangles = 0;
      const moves = [];
      const transforms = [];
      const noOp = () => {};
      const context = new Proxy(
        {
          fill: () => triangles++,
          moveTo: (x, y) => moves.push({ x, y }),
          setTransform: (...args) => transforms.push(args),
        },
        { get: (target, key) => (key in target ? target[key] : noOp) },
      );
      const size = { width: 760, height: 520, dpr: 2 };
      draw(context, scene, size);
      assert.equal(triangles, count);
      assert.deepEqual(transforms, [[2, 0, 0, 2, 0, 0]]);
      assert.ok(moves.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y)));
      // Mỗi boid phát một đỉnh đầu theo đúng thứ tự state, kể cả cá thể cuối cùng.
      const view = boidsView(size, scene);
      for (const index of [0, count - 1]) {
        const boid = scene.boids[index];
        const speed = Math.hypot(boid.velocity.x, boid.velocity.y);
        const radius = debug && index === scene.selected ? 8 : 4;
        vectorNear(moves[index], {
          x: view.left + boid.position.x * view.scale + (boid.velocity.x / speed) * radius,
          y: view.top + boid.position.y * view.scale + (boid.velocity.y / speed) * radius,
        });
      }
    }
  }
});

test("Boids zero steering draws no false arrowheads when symmetric neighbors cancel", async () => {
  const boidsView = await componentCallback("boids-view.ts", "boidsView", {});
  const draw = await componentCallback("boids-view.ts", "drawBoids", {
    boidsView,
    vectorEpsilon,
    findNeighbors,
    computeSteering,
    length: (vector) => Math.hypot(vector.x, vector.y),
    multiply: (vector, scalar) => ({ x: vector.x * scalar, y: vector.y * scalar }),
  });
  const scene = createBoidsScene(9);
  scene.boids = [boid(0, 480, 300), boid(1, 470, 300, 0, 20), boid(2, 490, 300, 0, -20)];
  scene.count = 3;
  let strokes = 0;
  const context = new Proxy(
    { stroke: () => strokes++ },
    {
      get: (target, key) => (key in target ? target[key] : () => {}),
    },
  );
  draw(context, scene, { width: 760, height: 520, dpr: 1 });
  assert.equal(
    strokes,
    9,
    "only the nine periodic radius images are stroked; all four steering vectors are zero",
  );
});
