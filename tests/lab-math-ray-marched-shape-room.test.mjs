import assert from "node:assert/strict";
import test from "node:test";
import { scheduleImage } from "../lib/labs/raymarch-room/batches.ts";
import * as r from "../lib/labs/ray-marched-shape-room.ts";
import {
  createSession,
  reduceSession,
  presetsForStage,
  inspectionRay,
  keyboardAction,
  PointerOwner,
} from "../lib/labs/raymarch-room/session.ts";
import {
  createImageJob,
  sampleSize,
  shadeResult,
  MAX_PREVIEW_PIXELS,
} from "../lib/labs/raymarch-room/image.ts";
const center = r.SPHERE_CENTER;
const settings = { ...r.DEFAULT_MARCH_SETTINGS };
const near = (a, b, tolerance = 1e-9) =>
  assert.ok(Number.isFinite(a) && Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const axis = { origin: { x: -1, y: -0.18, z: 4 }, direction: { x: 0, y: 0, z: -1 } };

function fakeClock(advance = 0) {
  const queue = new Map();
  let id = 0,
    time = 0;
  return {
    queue,
    request: (callback) => {
      queue.set(++id, callback);
      return id;
    },
    cancel: (ticket) => queue.delete(ticket),
    now: () => {
      time += advance;
      return time;
    },
    flushOne: () => {
      const entry = queue.entries().next().value;
      if (entry) {
        queue.delete(entry[0]);
        entry[1]();
      }
    },
  };
}
test("cooperative renderer hard-caps work even if the clock does not advance", () => {
  const clock = fakeClock(),
    job = createImageJob(createSession("raymarch-normal"), 16, 16);
  let complete = 0,
    progress = 0;
  const cancel = scheduleImage(
    job,
    clock,
    () => progress++,
    () => complete++,
    () => assert.fail("not stalled"),
  );
  clock.flushOne();
  assert.equal(job.count, 96);
  assert.equal(progress, 1);
  assert.equal(clock.queue.size, 1);
  clock.flushOne();
  clock.flushOne();
  assert.equal(job.count, 256);
  assert.equal(complete, 1);
  assert.equal(clock.queue.size, 0);
  cancel();
});
test("soft time budget yields early, disposal cancels queued and stale callbacks", () => {
  const clock = fakeClock(1),
    job = createImageJob(createSession("raymarch-normal"), 16, 16);
  let callbacks = 0;
  const cancel = scheduleImage(
    job,
    clock,
    () => callbacks++,
    () => callbacks++,
    () => callbacks++,
  );
  clock.flushOne();
  assert.equal(job.count, 6);
  const stale = [...clock.queue.values()][0];
  cancel();
  assert.equal(clock.queue.size, 0);
  stale();
  assert.equal(job.count, 6);
  assert.equal(callbacks, 1);
  assert.equal(job.step(64), 0);
});
test("a stalled image job stops scheduling rather than creating an endless task loop", () => {
  const clock = fakeClock(),
    job = createImageJob(createSession(), 16, 16);
  job.dispose();
  let stalled = 0,
    complete = 0;
  const cancel = scheduleImage(
    job,
    clock,
    () => assert.fail("no progress"),
    () => complete++,
    () => stalled++,
  );
  clock.flushOne();
  assert.equal(stalled, 1);
  assert.equal(complete, 0);
  assert.equal(clock.queue.size, 0);
  cancel();
});

test("free camera center/corner rays have correct basis, aspect and unit directions", () => {
  const c = r.DEFAULT_CAMERA;
  const ray = r.makeCameraRay(c, 479.5, 319.5, 960, 640);
  near(r.dot(ray.direction, r.cameraForward(c)), 1);
  const left = r.makeCameraRay(c, 0, 319.5, 960, 640),
    right = r.makeCameraRay(c, 959, 319.5, 960, 640);
  assert.ok(r.dot(left.direction, r.cameraRight(c)) < 0);
  assert.ok(r.dot(right.direction, r.cameraRight(c)) > 0);
  for (const [x, y] of [
    [0, 0],
    [959, 0],
    [0, 639],
    [959, 639],
  ])
    near(r.length(r.makeCameraRay(c, x, y, 960, 640).direction), 1);
  const square = r.makeCameraRay({ ...c, yaw: 0, pitch: 0 }, 99, 49.5, 100, 100);
  const wide = r.makeCameraRay({ ...c, yaw: 0, pitch: 0 }, 199, 49.5, 200, 100);
  assert.ok(wide.direction.x > square.direction.x);
  for (const n of [0, NaN, Infinity, 16385])
    assert.equal(r.validRay(r.makeCameraRay(c, 0, 0, n, 640)), false);
});

test("camera motion uses local basis, does not orbit a target, and stays bounded", () => {
  const c = { ...r.DEFAULT_CAMERA, position: { x: 0, y: 0, z: 0 }, yaw: Math.PI / 2, pitch: 0 };
  const moved = r.moveCamera(c, { x: 0, y: 0, z: 1 });
  near(moved.position.x, 1);
  near(moved.position.z, 0);
  assert.deepEqual(c.position, { x: 0, y: 0, z: 0 });
  const up = r.moveCamera({ ...c, pitch: 0.3 }, { x: 0, y: 1, z: 0 });
  near(r.length(up.position), 1);
  const extreme = r.lookCamera(c, 1000000, 1000000);
  assert.ok(r.validCamera(extreme));
  near(extreme.pitch, -1.45);
  assert.equal(r.lookCamera(c, NaN, 0), c);
  near(r.moveCamera(c, { x: 1000, y: 1000, z: 1000 }).position.x, 40);
});

test("sphere, box and tilted torus have hand-computed signed-distance probes", () => {
  near(r.sdSphere({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1), -1);
  near(r.sdSphere({ x: 2, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 1), 1);
  near(r.sdBox({ x: 2, y: 2, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }), Math.sqrt(2));
  near(r.sdBox({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 2, z: 3 }), -1);
  near(r.sdTorus({ x: 0.94, y: 0, z: 0 }, 0.72, 0.22), 0);
  near(r.sdTorus({ x: 0.72, y: 0, z: 0 }, 0.72, 0.22), -0.22);
  near(r.length(r.torusLocal({ x: 0.42, y: 0.3, z: -1 })), r.length({ x: 0.37, y: 0.46, z: 0.25 }));
});

test("finite room slabs keep exterior positive and material IDs travel with the winner", () => {
  assert.equal(r.sampleScene(center).materialId, 1);
  assert.equal(r.sampleScene({ x: 1, y: -0.32, z: 0.1 }).materialId, 2);
  assert.equal(r.sampleScene({ x: 0, y: -1, z: 1 }).materialId, 4);
  assert.ok(r.sampleScene({ x: 20, y: 0, z: 0 }).distance > 0);
  const empty = {
    ...r.FULL_SCENE,
    includeSphere: false,
    includeBox: false,
    includeTorus: false,
    includeRoom: false,
  };
  assert.equal(r.sampleScene(center, empty).materialId, 0);
  assert.equal(r.marchRay(axis, settings, empty).status, "emptyScene");
  assert.deepEqual(r.nearer({ distance: 1, materialId: 1 }, { distance: 1, materialId: 2 }), {
    distance: 1,
    materialId: 1,
  });
});

test("analytic oracle is independent and matches hand-computed axis and inside distances", () => {
  const exact = r.intersectSphere(axis, center, 0.82);
  assert.equal(exact.valid, true);
  assert.equal(exact.hit, true);
  near(exact.distance, 3.03);
  const hit = r.marchRay(axis, settings, r.SPHERE_ONLY);
  assert.equal(hit.status, "hit");
  near(hit.traveled, 3.03);
  const inside = { origin: center, direction: { x: 1, y: 0, z: 0 } };
  near(r.intersectSphere(inside, center, 0.82).distance, 0.82);
  const exit = r.marchRay(inside, settings, r.SPHERE_ONLY);
  near(exit.traveled, 0.82);
  near(exit.position.x, -0.18);
});

test("step budget does not confirm an unqueried endpoint; distance cap preserves result position", () => {
  const one = r.marchRay(axis, { ...settings, maximumSteps: 1 }, r.SPHERE_ONLY);
  assert.equal(one.hit, false);
  assert.equal(one.status, "stepLimit");
  assert.equal(one.steps, 1);
  near(one.traveled, 3.03);
  const capped = r.marchRay(axis, { ...settings, maximumDistance: 2 }, r.SPHERE_ONLY);
  assert.equal(capped.status, "distanceLimit");
  near(capped.traveled, 2);
  near(capped.position.z, 2);
  const miss = r.marchRay(
    { origin: { x: 0, y: 0, z: 4 }, direction: { x: 0, y: 0, z: 1 } },
    settings,
    r.SPHERE_ONLY,
  );
  assert.equal(miss.status, "distanceLimit");
  near(miss.position.z, 4 + settings.maximumDistance);
});

test("invalid settings and nonunit/NaN rays are rejected before any scene queries", () => {
  for (const patch of [
    { maximumSteps: 0 },
    { maximumSteps: 257 },
    { maximumSteps: 1.5 },
    { hitEpsilon: NaN },
    { hitEpsilon: 0 },
    { normalEpsilon: Infinity },
    { maximumDistance: 100 },
  ]) {
    const result = r.marchRay(axis, { ...settings, ...patch }, r.SPHERE_ONLY);
    assert.equal(result.status, "invalidInput");
    assert.equal(result.steps, 0);
  }
  assert.equal(
    r.marchRay({ ...axis, direction: { x: 0, y: 0, z: -2 } }, settings, r.SPHERE_ONLY).status,
    "invalidInput",
  );
  assert.equal(
    r.intersectSphere({ ...axis, origin: { x: NaN, y: 0, z: 0 } }, center, 0.82).valid,
    false,
  );
});

test("tangent t tolerance follows the geometric epsilon-band bound, near-miss acceptance is explicit", () => {
  const tangent = {
    origin: { x: center.x + 0.82, y: center.y, z: 4 },
    direction: { x: 0, y: 0, z: -1 },
  };
  const exact = r.intersectSphere(tangent, center, 0.82);
  assert.equal(exact.hit, true);
  for (const epsilon of [0.0001, 0.0015, 0.01]) {
    const result = r.marchRay(
      tangent,
      { ...settings, maximumSteps: 256, hitEpsilon: epsilon },
      r.SPHERE_ONLY,
    );
    assert.equal(result.hit, true);
    assert.ok(
      Math.abs(result.traveled - exact.distance) <= r.tangentDistanceBound(0.82, epsilon) + 1e-8,
    );
    const nearMiss = {
      origin: { x: center.x + 0.82 + epsilon / 2, y: center.y, z: center.z },
      direction: { x: 1, y: 0, z: 0 },
    };
    assert.equal(r.intersectSphere(nearMiss, center, 0.82).hit, false);
    const accepted = r.marchRay(nearMiss, { ...settings, hitEpsilon: epsilon }, r.SPHERE_ONLY);
    assert.equal(accepted.hit, true);
    near(accepted.traveled, 0);
  }
});

test("step trace records the exact samples consumed by the same marcher", () => {
  const { result, trace } = r.traceRay(axis, settings, r.SPHERE_ONLY);
  assert.equal(trace.length, result.steps);
  near(trace[0].traveled, 0);
  near(trace[0].distance, 3.03);
  near(trace[1].traveled, 3.03);
  near(trace[1].distance, 0);
  assert.deepEqual(result, r.marchRay(axis, settings, r.SPHERE_ONLY));
});

test("normal epsilon sweep uses an analytic direction and angular units", () => {
  const expected = r.normalize({ x: 0.3, y: 0.4, z: 0.5 });
  const point = r.add(center, r.scale(expected, 0.82));
  for (const epsilon of [0.00001, 0.0001, 0.001, 0.01, 0.02]) {
    const normal = r.estimateNormal(point, r.SPHERE_ONLY, epsilon);
    near(r.length(normal), 1);
    assert.ok(r.normalAngularError(normal, point, center) < 0.001);
  }
  near(r.length(r.estimateNormal(point, r.SPHERE_ONLY, 0)), 0);
});

test("shadow distinguishes reached-light, blocked and unresolved finite work", () => {
  const empty = { ...r.SPHERE_ONLY, includeSphere: false };
  const visible = r.traceShadow({ x: 0, y: 0, z: 2 }, { x: 0, y: 0, z: 1 }, 4, empty);
  assert.equal(visible.reachedLight, true);
  near(visible.visibility, 1);
  const blocked = r.traceShadow(axis.origin, axis.direction, 8, r.SPHERE_ONLY);
  assert.equal(blocked.reachedLight, false);
  near(blocked.visibility, 0);
  const unresolved = r.traceShadow({ x: 0, y: 0, z: 2 }, { x: 0, y: 0, z: 1 }, 4, empty, 1);
  assert.equal(unresolved.reachedLight, false);
  near(unresolved.visibility, 0);
  assert.equal(unresolved.steps, 1);
  assert.equal(r.traceShadow(axis.origin, axis.direction, 8, r.SPHERE_ONLY, 1000000).steps, 0);
});

test("every lesson preset resets its own state, not always the room default", () => {
  for (const mode of [
    "raymarch-screen",
    "raymarch-camera",
    "raymarch-sphere-sdf",
    "raymarch-stepper",
    "raymarch-normal",
    "raymarch-primitives",
    "raymarch-materials",
    "raymarch-shadow-camera",
    "raymarch-free-camera",
    "raymarch-oracle",
    "raymarch-validation",
  ]) {
    const initial = createSession(mode);
    for (const preset of presetsForStage(initial.stage)) {
      const chosen = createSession(mode, preset.value);
      const changed = reduceSession(reduceSession(chosen, { type: "look", dx: 20, dy: 0 }), {
        type: "step",
      });
      assert.deepEqual(reduceSession(changed, { type: "reset" }), chosen);
      assert.ok(r.validCamera(chosen.camera));
      assert.ok(r.validScene(chosen.scene));
      assert.ok(r.validSettings(chosen.settings));
    }
  }
});

test("Pause freezes the light but never camera input; hidden/focus pause is persistent", () => {
  const start = createSession();
  assert.equal(reduceSession(start, { type: "tick" }), start);
  const moved = reduceSession(start, { type: "move", local: { x: 0, y: 0, z: 1 } });
  assert.notDeepEqual(moved.camera.position, start.camera.position);
  near(moved.elapsedSeconds, 0);
  const stepped = reduceSession(start, { type: "step" });
  near(stepped.elapsedSeconds, 0.1);
  assert.equal(stepped.paused, true);
  const running = reduceSession(start, { type: "play" });
  const ticked = reduceSession(running, { type: "tick" });
  near(ticked.elapsedSeconds, 0.05);
  const paused = reduceSession(ticked, { type: "pause" });
  assert.equal(reduceSession(paused, { type: "tick" }), paused);
});

test("stepper changes one observed sample at a time and stops at the actual radius-dependent trace", () => {
  let s = createSession("raymarch-stepper");
  assert.equal(s.traceVisible, 0);
  s = reduceSession(s, { type: "step" });
  assert.equal(s.traceVisible, 1);
  assert.equal(s.paused, true);
  s = reduceSession(s, { type: "scene", patch: { sphereRadius: 1.1 } });
  s = reduceSession(s, { type: "play" });
  for (let i = 0; i < 256 && !s.paused; i++) s = reduceSession(s, { type: "tick" });
  assert.equal(s.paused, true);
  assert.equal(
    s.traceVisible,
    r.traceRay(inspectionRay(s), s.settings, { ...r.SPHERE_ONLY, sphereRadius: 1.1 }).trace.length,
  );
});

test("keyboard shortcuts respect modifiers, repeats and teaching stage", () => {
  const early = createSession("raymarch-screen"),
    late = createSession();
  assert.equal(keyboardAction({ key: "[" }, early), null);
  assert.equal(keyboardAction({ key: "r", ctrlKey: true }, late), null);
  assert.equal(keyboardAction({ key: "v", repeat: true }, late), null);
  assert.equal(keyboardAction({ key: " ", isComposing: true }, late), null);
  assert.equal(keyboardAction({ key: "w" }, early), null);
  assert.equal(keyboardAction({ key: "w" }, late).type, "move");
  assert.equal(keyboardAction({ key: "ArrowUp" }, createSession("raymarch-camera")).type, "look");
});

test("pointer ownership rejects secondary/foreign pointers and releases only its owner", () => {
  const p = new PointerOwner();
  assert.equal(p.begin(1, 2, true, 0, 0), false);
  assert.equal(p.begin(1, 0, false, 0, 0), false);
  assert.equal(p.begin(1, 0, true, 10, 20), true);
  assert.equal(p.begin(2, 0, true, 0, 0), false);
  assert.equal(p.move(2, 1, 90, 90), null);
  p.clear(2);
  assert.equal(p.id, 1);
  assert.deepEqual(p.move(1, 1, 13, 24), { dx: 3, dy: 4 });
  assert.equal(p.move(1, 0, 20, 20), null);
  p.clear();
  assert.equal(p.id, null);
});

test("preview has finite dimensions and per-step limits; disposed jobs cannot render more", () => {
  for (const [w, h] of [
    [760, 340],
    [3840, 2160],
    [280, 900],
    [1e9, 1],
    [NaN, Infinity],
  ]) {
    const size = sampleSize(w, h);
    assert.ok(size.width >= 1 && size.height >= 1);
    assert.ok(size.width * size.height <= MAX_PREVIEW_PIXELS);
  }
  const s = createSession("raymarch-normal");
  const job = createImageJob(s, 48, 32);
  assert.equal(job.count, 0);
  assert.equal(job.step(100000), 128);
  assert.equal(job.count, 128);
  job.dispose();
  assert.equal(job.step(128), 0);
  assert.equal(job.count, 128);
});

test("preview finishes finite batches and exposes required room colors/alpha", () => {
  const job = createImageJob(createSession(), 40, 26);
  let batches = 0;
  while (!job.done && batches++ < 100) job.step(64);
  assert.equal(job.done, true);
  assert.equal(job.count, 1040);
  assert.ok(job.pixels.some((v, i) => i % 4 !== 3 && v > 20));
  for (let i = 3; i < job.pixels.length; i += 4) assert.equal(job.pixels[i], 255);
});

test("Beauty color does not darken when only the same hit's step count changes", () => {
  const s = createSession();
  const hit = r.marchRay(axis, settings, r.SPHERE_ONLY);
  assert.deepEqual(shadeResult(axis, hit, s), shadeResult(axis, { ...hit, steps: 256 }, s));
});
