import assert from "node:assert/strict";
import test from "node:test";
import * as scene from "../lib/labs/collision-scene.ts";
import * as sphere from "../lib/labs/collision-spheres.ts";
import * as camera from "../lib/labs/collision-camera.ts";
import * as core from "../lib/labs/collision-tank.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
import {
  applyCollisionPairImpulse,
  collisionAdd,
  collisionLength,
  collisionLengthSquared,
  correctCollisionPenetration,
  findCollisionCircleContact,
  makeCollisionLattice,
  measureCollisionWorld,
  planCollisionFixedSteps,
  resolveCollisionWall,
  stepCollisionTank,
} from "../lib/labs/collision-tank.ts";

const bounds = { minimumX: 0, minimumY: 0, maximumX: 16, maximumY: 10 };

test("Collision scene is deterministic, finite and starts without overlap", () => {
  const first = makeCollisionLattice(16, 9, bounds, 0.24, 2.2, 0x00c0ffee);
  const second = makeCollisionLattice(16, 9, bounds, 0.24, 2.2, 0x00c0ffee);
  assert.equal(first.length, 144);
  assert.deepEqual(first, second);
  const metrics = measureCollisionWorld(first);
  assert.equal(metrics.finite, true);
  assert.equal(metrics.overlapCount, 0);
  for (const ball of first) {
    assert.ok(ball.position.x - ball.radius >= bounds.minimumX);
    assert.ok(ball.position.x + ball.radius <= bounds.maximumX);
    assert.ok(ball.position.y - ball.radius >= bounds.minimumY);
    assert.ok(ball.position.y + ball.radius <= bounds.maximumY);
  }
});

test("Collision wall, contact, impulse and correction mirror the C++ formulas", () => {
  const wallBall = {
    position: { x: -0.1, y: 9.9 },
    velocity: { x: -3, y: 2 },
    radius: 0.25,
    inverseMass: 1,
    color: "white",
  };
  const wall = resolveCollisionWall(wallBall, bounds, 0.5);
  assert.equal(wall.hitCount, 2);
  assert.deepEqual(wallBall.position, { x: 0.25, y: 9.75 });
  assert.deepEqual(wallBall.velocity, { x: 1.5, y: -1 });

  const first = {
    position: { x: 2, y: 3 },
    velocity: { x: 1, y: 0 },
    radius: 0.5,
    inverseMass: 1,
    color: "red",
  };
  const second = {
    position: { x: 2.8, y: 3 },
    velocity: { x: -1, y: 0 },
    radius: 0.5,
    inverseMass: 1,
    color: "blue",
  };
  const contact = findCollisionCircleContact(first, second);
  assert.equal(contact.colliding, true);
  assert.ok(Math.abs(contact.normal.x - 1) < 1e-12);
  assert.ok(Math.abs(contact.penetration - 0.2) < 1e-12);
  const momentumBefore = collisionAdd(first.velocity, second.velocity);
  const energyBefore =
    0.5 * collisionLengthSquared(first.velocity) + 0.5 * collisionLengthSquared(second.velocity);
  assert.ok(Math.abs(applyCollisionPairImpulse(first, second, contact, 1) - 2) < 1e-12);
  assert.deepEqual(first.velocity, { x: -1, y: 0 });
  assert.deepEqual(second.velocity, { x: 1, y: 0 });
  assert.deepEqual(collisionAdd(first.velocity, second.velocity), momentumBefore);
  const energyAfter =
    0.5 * collisionLengthSquared(first.velocity) + 0.5 * collisionLengthSquared(second.velocity);
  assert.ok(Math.abs(energyAfter - energyBefore) < 1e-12);
  assert.equal(applyCollisionPairImpulse(first, second, contact, 1), 0);

  const velocityBeforeCorrection = { ...first.velocity };
  assert.ok(correctCollisionPenetration(first, second, contact, 1, 0) > 0);
  assert.deepEqual(first.velocity, velocityBeforeCorrection);
  const after = findCollisionCircleContact(first, second);
  assert.ok(!after.colliding || after.penetration < 1e-12);
  const coincident = findCollisionCircleContact(first, {
    ...second,
    position: { ...first.position },
  });
  assert.equal(coincident.colliding, true);
  assert.ok(Math.abs(collisionLength(coincident.normal) - 1) < 1e-12);
});

test("Collision fixed steps and brute-force pair count stay explicit", () => {
  const countSteps = (frames) => {
    let remainder = 0;
    let steps = 0;
    for (const frame of frames) {
      const plan = planCollisionFixedSteps(remainder, frame, 1 / 60, 16, 0.25);
      remainder = plan.remainder;
      steps += plan.steps;
    }
    return steps;
  };
  assert.equal(countSteps(Array(120).fill(1 / 120)), 60);
  assert.equal(countSteps(Array(30).fill(1 / 30)), 60);

  const four = makeCollisionLattice(
    2,
    2,
    { minimumX: 0, minimumY: 0, maximumX: 4, maximumY: 4 },
    0.25,
    0,
    7,
  );
  const result = stepCollisionTank(
    four,
    { minimumX: 0, minimumY: 0, maximumX: 4, maximumY: 4 },
    {
      deltaSeconds: 1 / 120,
      restitution: 1,
      solverIterations: 3,
      correctionPercent: 0.8,
      penetrationSlop: 0.001,
    },
  );
  assert.equal(result.stats.pairChecks, 18);

  let stress = makeCollisionLattice(16, 9, bounds, 0.24, 2.2, 0x00c0ffee);
  for (let step = 0; step < 30; step += 1) {
    const next = stepCollisionTank(stress, bounds, {
      deltaSeconds: 1 / 120,
      restitution: 1,
      solverIterations: 3,
      correctionPercent: 0.8,
      penetrationSlop: 0.001,
    });
    assert.equal(next.stats.pairChecks, (3 * 144 * 143) / 2);
    stress = next.balls;
  }
  assert.equal(measureCollisionWorld(stress).finite, true);
});

const near = (a, b, e = 1e-9) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= e, a + " != " + b);
test("P24 rich default and stage gates expose only implemented physics", () => {
  const a = scene.makeTankScene(),
    b = scene.makeTankScene();
  assert.equal(a.balls.length, 256);
  assert.deepEqual(a, b);
  assert.notEqual(a.balls[0].inverseMass, a.balls[1].inverseMass);
  assert.notEqual(a.balls[0].restitution, a.balls[1].restitution);
  assert.equal(a.metrics.overlapCount, 0);
  assert.equal(scene.tickTankScene(scene.makeTankScene(1)).steps, 0);
  const walls = scene.stepTankScene(scene.makeTankScene(3));
  near(walls.balls[0].position.x, -9.5);
  near(walls.balls[0].velocity.x, 2);
  const contact = scene.stepTankScene(scene.makeTankScene(4));
  assert.equal(contact.trace.impulse, 0);
  near(contact.balls[0].velocity.x, 1.5);
  const impulse = scene.stepTankScene(scene.makeTankScene(5));
  near(impulse.trace.impulse, 8 / 3);
  near(impulse.balls[0].velocity.x, -7 / 6);
  near(impulse.balls[1].velocity.x, 5 / 6);
  assert.equal(scene.editTankScene(scene.makeTankScene(9), "dimension", 3).spatial, false);
  const preset = scene.editTankScene({ ...a, restitution: 0.2 }, "elastic", 1);
  assert.equal(preset.restitution, 1);
  assert.ok(preset.balls.every((b) => b.restitution === 1));
});
test("P24 invalid geometry/settings cannot allocate unbounded work or partially advance state", () => {
  assert.deepEqual(core.makeCollisionLattice(Infinity, 16, bounds, 0.1, 1, 1), []);
  assert.deepEqual(core.makeCollisionLattice(100000, 100000, bounds, 0.1, 1, 1), []);
  for (const dt of [NaN, Infinity, 0, -1, 1e-300]) {
    assert.equal(core.planCollisionFixedSteps(0, 1, dt, 4, 0.05).steps, 0);
    const a = scene.makeTankScene(),
      broken = [...a.balls];
    broken[255] = { ...broken[255], velocity: { x: NaN, y: 0 } };
    const result = core.stepCollisionTank(broken, scene.TANK_BOUNDS, {
      deltaSeconds: dt,
      restitution: 1,
      solverIterations: 3,
      correctionPercent: 0.8,
      penetrationSlop: 0.001,
    });
    assert.equal(result.stats.valid, false);
    assert.equal(result.balls, broken);
  }
  const a = {
      position: { x: 0, y: 0 },
      velocity: { x: 1, y: 0 },
      radius: 0.5,
      inverseMass: 1,
      color: "red",
    },
    b = { ...a, position: { x: 0.8, y: 0 }, velocity: { x: -1, y: 0 }, inverseMass: 0.5 };
  const c = core.findCollisionCircleContact(a, b);
  near(core.applyCollisionPairImpulse(a, b, c, 1), 8 / 3);
  near(a.velocity.x, -5 / 3);
  near(b.velocity.x, 1 / 3);
  const old = { ...a.velocity };
  assert.equal(core.applyCollisionPairImpulse(a, b, { ...c, normal: { x: NaN, y: 0 } }, 1), 0);
  assert.deepEqual(a.velocity, old);
});
test("P24 actual frame partitions, per-step history and bounded fast job", () => {
  const run = (frames) => {
    let s = scene.editTankScene(scene.makeTankScene(), "count", 64);
    s = { ...s, paused: false };
    for (const frame of frames) s = scene.advanceTankFrame(s, frame);
    return s;
  };
  const a = run(Array(120).fill(1 / 120)),
    b = run(Array(30).fill(1 / 30));
  assert.equal(a.steps, 120);
  assert.deepEqual(a.balls, b.balls);
  assert.deepEqual(a.history, b.history);
  assert.equal(a.history.length, 121);
  assert.equal(a.stats.pairChecks, (3 * 64 * 63) / 2);
  let fast = scene.spawnTankBodies(scene.editTankScene(scene.makeTankScene(), "count", 64));
  assert.ok(fast.message);
  fast = scene.requestTankFast(fast);
  for (let i = 0; i < 65 && fast.fastRemaining > 0; i++) fast = scene.advanceTankFrame(fast, 0);
  assert.equal(fast.fastRemaining, 0);
  near(fast.elapsed, 2);
  assert.equal(fast.history.length, 241);
  const stalled = scene.advanceTankFrame({ ...a, paused: false }, 2);
  assert.equal(stalled.substeps, 4);
  assert.ok(stalled.droppedTime > 1.9);
});
test("P24 256-body 2D/3D conservation uses external wall impulse, not constant tank momentum", () => {
  for (const spatial of [false, true]) {
    let s = scene.editTankScene(scene.makeTankScene(), "elastic", 1);
    if (spatial) s = scene.editTankScene(s, "dimension", 3);
    const initial = s.initialEnergy;
    for (let i = 0; i < 240; i++) s = scene.tickTankScene(s);
    const energy = spatial ? s.sphereMetrics.energy : s.metrics.kineticEnergy;
    near(energy, initial, 1e-7);
    assert.ok(scene.tankMomentumResidual(s) < 1e-8);
    assert.ok((spatial ? s.sphereMetrics.penetration : s.metrics.maximumPenetration) < 0.05);
    assert.equal(s.history.length, 241);
    near(s.history.at(-1).time, 2);
    const stats = spatial ? s.sphereStats : s.stats;
    assert.equal(stats.pairChecks, (3 * 256 * 255) / 2);
    if (spatial)
      assert.ok(
        s.spheres.every(
          (b) =>
            Math.abs(b.position.x) + b.radius <= 8 + 1e-9 &&
            Math.abs(b.position.y) + b.radius <= 5 + 1e-9 &&
            Math.abs(b.position.z) + b.radius <= 6 + 1e-9,
        ),
      );
    else
      assert.ok(
        s.balls.every(
          (b) =>
            b.position.x - b.radius >= -10 - 1e-9 &&
            b.position.x + b.radius <= 10 + 1e-9 &&
            b.position.y - b.radius >= -6 - 1e-9 &&
            b.position.y + b.radius <= 6 + 1e-9,
        ),
      );
    s = scene.editTankScene(s, "elastic", 0);
    const k = s.initialEnergy;
    for (let i = 0; i < 120; i++) s = scene.tickTankScene(s);
    assert.ok((spatial ? s.sphereMetrics.energy : s.metrics.kineticEnergy) < k);
  }
});
test("P24 3D oblique unequal masses match independent rational oracles in all three axes", () => {
  const a = {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 1, y: 2, z: 3 },
      radius: 0.5,
      inverseMass: 1,
      color: "#ff0000",
      restitution: 1,
    },
    b = {
      position: { x: 0.3, y: 0.6, z: 0.6 },
      velocity: { x: -1, y: 1, z: -2 },
      radius: 0.5,
      inverseMass: 0.5,
      color: "#00ff00",
      restitution: 1,
    };
  const c = sphere.findTankSphereContact(a, b);
  near(c.normal.x, 1 / 3);
  near(c.normal.z, 2 / 3);
  near(c.penetration, 0.1);
  near(sphere.applyTankSphereImpulse(a, b, c, 1), 56 / 9);
  for (const [actual, expected] of [
    [a.velocity.x, -29 / 27],
    [a.velocity.y, -58 / 27],
    [a.velocity.z, -31 / 27],
    [b.velocity.x, 1 / 27],
    [b.velocity.y, 83 / 27],
    [b.velocity.z, 2 / 27],
  ])
    near(actual, expected);
  assert.equal(sphere.applyTankSphereImpulse(a, b, c, 1), 0);
  const old = { ...a.velocity };
  sphere.correctTankSphere(a, b, c, 1, 0);
  assert.deepEqual(a.velocity, old);
  const all = sphere.makeTankSpheres();
  assert.equal(all.length, 256);
  assert.notEqual(all[0].position.z, all[128].position.z);
  assert.notEqual(all[0].velocity.z, 0);
  assert.equal(sphere.measureTankSpheres(all).overlaps, 0);
});
test("P24 spawn is bounded/nonoverlapping and intervention resets measurement, camera does not", () => {
  for (const spatial of [false, true]) {
    let s = scene.makeTankScene();
    if (spatial) s = scene.editTankScene(s, "dimension", 3);
    s = scene.spawnTankBodies(s);
    assert.equal(spatial ? s.spheres.length : s.balls.length, 272);
    assert.equal(spatial ? s.sphereMetrics.overlaps : s.metrics.overlapCount, 0);
    assert.equal(s.elapsed, 0);
    assert.equal(s.history.length, 1);
    if (spatial) {
      const before = s.spheres;
      const next = scene.orbitTankCamera(s, 1.5, 0.6, 24);
      assert.equal(next.spheres, before);
      assert.equal(next.elapsed, 0);
    } else {
      s = scene.tickTankScene(s);
      const kicked = scene.kickTankBall(s, 0, { x: 2, y: 0 });
      assert.equal(kicked.steps, 0);
      assert.equal(kicked.history.length, 1);
      assert.notDeepEqual(kicked.balls[0].velocity, s.balls[0].velocity);
    }
  }
});

test("P24 actual sphere raster is draw-order independent and input mapping ignores DPR", async () => {
  near(camera.tankSphereDepth(0, 0, { x: 0, y: 0, z: 5 }, 1), 4);
  assert.equal(camera.tankSphereDepth(1, 1, { x: 0, y: 0, z: 5 }, 1), Infinity);
  const env = { ...sphere, ...camera };
  env.tankColor = await componentCallback("collision-raster.ts", "tankColor", {});
  const draw = await componentCallback("collision-raster.ts", "rasterTankSphere", env);
  const make = () => ({
    image: { data: new Uint8ClampedArray(1100 * 820 * 4) },
    depth: new Float64Array(1100 * 820).fill(Infinity),
  });
  const first = make(),
    second = make(),
    cam = camera.makeTankCamera({ yaw: 0, pitch: 0, distance: 26 });
  const a = {
      position: { x: 0, y: 0, z: 2 },
      velocity: { x: 0, y: 0, z: 0 },
      radius: 1,
      inverseMass: 1,
      color: "#ff0000",
      restitution: 1,
    },
    b = { ...a, position: { x: 0, y: 0, z: -2 }, color: "#00ff00" };
  draw(first, a, cam);
  draw(first, b, cam);
  draw(second, b, cam);
  draw(second, a, cam);
  assert.deepEqual(first.image.data, second.image.data);
  assert.ok(first.image.data[(370 * 1100 + 550) * 4] > 0);
  assert.equal(first.image.data[(370 * 1100 + 550) * 4 + 1], 0);
  const layout = await componentCallback("collision-tank-view.ts", "tankLayout", {});
  const point = await componentCallback("collision-tank-view.ts", "tankEventPoint", {
    tankLayout: layout,
  });
  const actual = point(
    {
      clientX: 100 + 550 * 0.4,
      clientY: 50 + (22 + 365 * 0.8) * 0.5,
      currentTarget: {
        getBoundingClientRect: () => ({ left: 100, top: 50, width: 440, height: 350 }),
      },
    },
    { width: 880, height: 700, dpr: 2 },
  );
  near(actual.x, 550);
  near(actual.y, 365);
});

async function collisionHandlers(spatial = false) {
  const sceneRef = { current: scene.makeTankScene() },
    gestureRef = { current: null },
    captured = new Set();
  if (spatial) sceneRef.current = scene.editTankScene(sceneRef.current, "dimension", 3);
  let gesture = null;
  const canvas = {
    focus() {},
    setPointerCapture: (id) => captured.add(id),
    hasPointerCapture: (id) => captured.has(id),
    releasePointerCapture: (id) => captured.delete(id),
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 1100, height: 820 }),
  };
  const env = {
    ...core,
    ...scene,
    stage: 11,
    reducedMotion: false,
    sceneRef,
    gestureRef,
    canvasRef: { current: canvas },
    size: { width: 1100, height: 820, dpr: 1 },
    setGesture: (value) => (gesture = value),
    commit: (next) => {
      sceneRef.current = next;
    },
  };
  for (const name of [
    "tankLayout",
    "tankWorldToScreen",
    "tankScreenToWorld",
    "tankEventPoint",
    "hitTankBall",
  ])
    env[name] = await componentCallback("collision-tank-view.ts", name, env);
  for (const name of [
    "cancelGesture",
    "stop",
    "edit",
    "reset",
    "step",
    "fast",
    "spawn",
    "toggleDebug",
    "orbit",
    "togglePause",
    "updateGesture",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onPointerCancel",
    "onCanvasBlur",
    "onKeyDown",
  ])
    env[name] = await componentCallback("collision-tank-lab.tsx", name, env);
  return {
    ...env,
    canvas,
    captured,
    gesture: () => gesture,
    event: (x, y, extra = {}) => ({
      clientX: x,
      clientY: y,
      pointerId: 7,
      isPrimary: true,
      button: 0,
      buttons: 1,
      currentTarget: canvas,
      ...extra,
    }),
  };
}
test("P24 actual pointer owns its kick, accepts final up and ignores cancelled samples", async () => {
  const h = await collisionHandlers(),
    p = h.tankWorldToScreen(h.sceneRef.current.balls[0].position),
    old = { ...h.sceneRef.current.balls[0].velocity };
  h.onPointerDown(h.event(p.x, p.y));
  assert.equal(h.captured.size, 1);
  h.onPointerMove(h.event(p.x + 20, p.y, { pointerId: 9 }));
  assert.deepEqual(h.sceneRef.current.balls[0].velocity, old);
  h.onPointerUp(h.event(p.x + 45, p.y));
  near(h.sceneRef.current.balls[0].velocity.x, old.x + 2);
  assert.equal(h.captured.size, 0);
  assert.equal(h.sceneRef.current.history.length, 1);
  const next = h.sceneRef.current;
  h.onPointerUp(h.event(p.x + 90, p.y));
  assert.equal(h.sceneRef.current, next);
  h.onPointerDown(h.event(p.x, p.y));
  h.edit("iterations", 5);
  assert.equal(h.gestureRef.current, null);
  const after = h.sceneRef.current;
  h.onPointerUp(h.event(p.x + 90, p.y));
  assert.equal(h.sceneRef.current, after);
  h.canvas.setPointerCapture = () => {
    throw Error("blocked");
  };
  h.onPointerDown(h.event(p.x, p.y));
  assert.equal(h.gestureRef.current, null);
});
test("P24 actual orbit changes camera only; keyboard modifiers and pause focus are safe", async () => {
  const h = await collisionHandlers(true),
    before = h.sceneRef.current.spheres;
  h.onPointerDown(h.event(550, 365));
  h.onPointerUp(h.event(700, 390));
  near(h.sceneRef.current.camera.yaw, 1.6);
  near(h.sceneRef.current.camera.pitch, 0.5);
  assert.equal(h.sceneRef.current.spheres, before);
  assert.equal(h.sceneRef.current.steps, 0);
  assert.equal(h.captured.size, 0);
  const key = (key, extra = {}) => ({ key, repeat: false, preventDefault() {}, ...extra });
  const old = h.sceneRef.current;
  h.onKeyDown(key("n", { ctrlKey: true }));
  h.onKeyDown(key("n", { repeat: true }));
  h.onKeyDown(key("Tab"));
  assert.equal(h.sceneRef.current, old);
  h.commit({ ...h.sceneRef.current, paused: false });
  h.onCanvasBlur({ currentTarget: { parentElement: { contains: () => true } }, relatedTarget: {} });
  assert.equal(h.sceneRef.current.paused, false);
  h.togglePause();
  assert.equal(h.sceneRef.current.paused, true);
  h.commit({ ...h.sceneRef.current, paused: false });
  h.onCanvasBlur({
    currentTarget: { parentElement: { contains: () => false } },
    relatedTarget: null,
  });
  assert.equal(h.sceneRef.current.paused, true);
});
test("P24 actual lifecycle and RAF clean capture, bound work and dispose callbacks", async () => {
  const h = await collisionHandlers(),
    listeners = new Map();
  const window = {
    addEventListener: (k, fn) => listeners.set("w:" + k, fn),
    removeEventListener: (k) => listeners.delete("w:" + k),
  };
  const document = {
    hidden: true,
    addEventListener: (k, fn) => listeners.set("d:" + k, fn),
    removeEventListener: (k) => listeners.delete("d:" + k),
  };
  const cleanup = (
    await componentEffect("collision-tank-lab.tsx", "visibilitychange", {
      ...h,
      window,
      document,
      rasterRef: { current: null },
    })
  )();
  const p = h.tankWorldToScreen(h.sceneRef.current.balls[0].position);
  h.onPointerDown(h.event(p.x, p.y));
  listeners.get("w:blur")();
  assert.equal(h.captured.size, 0);
  assert.equal(h.gestureRef.current, null);
  cleanup();
  assert.equal(listeners.size, 0);
  let callback,
    id = 0,
    cancelled = 0;
  h.commit({ ...scene.editTankScene(h.sceneRef.current, "count", 64), paused: false });
  const dispose = (
    await componentEffect("collision-tank-lab.tsx", "const animate", {
      ...h,
      active: true,
      performance: { now: () => 0 },
      requestAnimationFrame: (cb) => {
        callback = cb;
        return ++id;
      },
      cancelAnimationFrame: (value) => (cancelled = value),
    })
  )();
  callback(2000);
  assert.equal(h.sceneRef.current.substeps, 4);
  assert.ok(h.sceneRef.current.droppedTime > 1.9);
  dispose();
  assert.equal(cancelled, id);
  const after = h.sceneRef.current;
  callback(3000);
  assert.equal(h.sceneRef.current, after);
});
