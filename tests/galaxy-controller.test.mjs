import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { componentCallback, canvasCallback, componentEffect } from "./lab-handler-support.mjs";
import {
  createGalaxy,
  invalidateExperiment,
  cancelPhysics,
  validateGalaxy,
} from "../lib/labs/galaxy/scene.ts";
import { startGalaxyJob } from "../lib/labs/galaxy/jobs.ts";
import * as measurementRuntime from "../lib/labs/galaxy/jobs.ts";
import { pickGalaxy } from "../components/labs/galaxy-view.ts";
import { dollyGalaxyCamera } from "../lib/labs/galaxy/projection.ts";
import { performGalaxyAction, disposeGalaxy } from "../components/labs/galaxy-actions.ts";
const file = "barnes-hut-nbody-lab.tsx";

// Source-level regression, not a substitute for native desktop input testing.
test("P31 native single-step/cancel preserve completed diagnostics; new experiments clear them", async () => {
  const source = await readFile(
    new URL(
      "../examples/project-31-barnes-hut-nbody/source-template/include/application.hpp",
      import.meta.url,
    ),
    "utf8",
  );
  function blockAfter(marker) {
    const markerIndex = source.indexOf(marker);
    assert.ok(markerIndex >= 0, marker);
    const start = source.indexOf("{", markerIndex);
    let depth = 0;
    for (let index = start; index < source.length; index++) {
      if (source[index] === "{") depth++;
      if (source[index] === "}" && --depth === 0) return source.slice(start, index + 1);
    }
    assert.fail("Unclosed block: " + marker);
  }
  const cancel = blockAfter("const auto cancel =");
  assert.match(cancel, /physicsPending = false/);
  assert.doesNotMatch(cancel, /history|timestepRows|clearDiagnostics/);
  const clear = blockAfter("const auto clearDiagnostics =");
  assert.match(clear, /history\.clear\(\)/);
  assert.match(clear, /timestepRows\.clear\(\)/);
  const step = blockAfter("key == SDLK_N");
  assert.match(step, /cancel\(\)/);
  assert.match(step, /beginPhysics\(simulation\)/);
  assert.doesNotMatch(step, /clearDiagnostics/);
  for (const marker of [
    "key == SDLK_R ||",
    "key == SDLK_D)",
    "key == SDLK_M)",
    "key == SDLK_LEFTBRACKET ||",
    "key == SDLK_MINUS ||",
  ])
    assert.match(blockAfter(marker), /clearDiagnostics\(\)/, marker);
  for (const marker of ["key == SDLK_T", "key == SDLK_B", "key == SDLK_I"])
    assert.doesNotMatch(blockAfter(marker), /clearDiagnostics/, marker);
  assert.equal([...source.matchAll(/history\.clear\(\)/g)].length, 1);
  const hud = blockAfter("if (!history.empty())");
  assert.match(hud, /reference = history\.front\(\)/);
  assert.match(hud, /sample\.values\.totalEnergy - reference\.values\.totalEnergy/);
  assert.match(hud, /std::max\(std::abs\(reference\.values\.totalEnergy\), 1e-12\)/);
  assert.match(hud, /sample\.values\.momentum - reference\.values\.momentum/);
  assert.match(hud, /reference\.time/);
});

test("P31 actual controller keeps target/camera edits separate from physics and invalidates changed models", async () => {
  const model = { current: createGalaxy(10, 3) },
    jobRef = { current: null };
  let updates = 0;
  model.current.history = [
    {
      time: 0,
      count: 256,
      energy: 1,
      momentum: { x: 0, y: 0, z: 0 },
      center: { x: 0, y: 0, z: 0 },
    },
  ];
  const env = {
    model,
    jobRef,
    reduced: false,
    stage: 10,
    publish: () => updates++,
    publishJob: (value) => (jobRef.current = value),
    release: () => {},
    createGalaxy,
    invalidateExperiment,
    cancelPhysics,
    validateGalaxy,
    startGalaxyJob,
    performGalaxyAction,
    dollyGalaxyCamera,
    requestEpoch: { current: 0 },
    mounted: { current: true },
    jobsRuntime: { current: measurementRuntime },
    setLoadingJob: () => {},
    loadJobs: () => Promise.resolve(measurementRuntime),
  };
  env.startMeasurement = await componentCallback(file, "startMeasurement", env);
  const act = await componentCallback(file, "act", env),
    before = structuredClone(model.current.bodies),
    revision = model.current.revision;
  act("selected", 17);
  assert.equal(model.current.selected, 17);
  assert.equal(model.current.history.length, 1);
  assert.equal(model.current.revision, revision);
  act("camera");
  assert.deepEqual(model.current.bodies, before);
  for (let i = 0; i < 30; ++i) act("zoomIn");
  assert.ok(model.current.camera.distance < 0);
  assert.deepEqual(model.current.bodies, before);
  act("zoomOut");
  act("validate");
  assert.match(model.current.notice, /zeroSelfForce: đạt/);
  act("sweep");
  const job = jobRef.current;
  assert.equal(job.active, true);
  act("theta", 0.8);
  assert.equal(jobRef.current, null);
  assert.equal(model.current.theta, 0.8);
  assert.ok(model.current.revision > revision);
  assert.equal(model.current.history.length, 0);
  act("preset", 0);
  assert.equal(model.current.bodies.length, 4096);
  act("direct", 1);
  assert.equal(model.current.direct, false);
  assert.match(model.current.notice, /N≤256/);
  assert.ok(updates > 0);
});

test("P31 actual pointer callbacks keep owner, use final sample and roll camera back on cancel", async () => {
  const model = { current: createGalaxy(10, 3) },
    gesture = { current: null },
    captures = new Set();
  const canvas = {
    focus() {},
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 600, height: 400 }),
    setPointerCapture: (id) => captures.add(id),
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => captures.delete(id),
  };
  const env = {
    model,
    gesture,
    canvasRef: { current: canvas },
    publish: () => {},
    size: { width: 600, height: 400 },
    tool: "orbit",
    stage: 10,
    pickGalaxy,
    act: () => {},
  };
  env.release = await componentCallback(file, "release", env);
  env.applyGesture = await componentCallback(file, "applyGesture", env);
  const down = await componentCallback(file, "down", env),
    up = await componentCallback(file, "up", env),
    cancel = await canvasCallback(file, "onPointerCancel", env);
  const event = (id, x, y) => ({
    isPrimary: true,
    button: 0,
    buttons: 1,
    pointerId: id,
    clientX: x,
    clientY: y,
    currentTarget: canvas,
  });
  const before = { ...model.current.camera };
  down(event(1, 30, 40));
  assert.equal(captures.has(1), true);
  env.applyGesture(event(2, 90, 90));
  assert.deepEqual(model.current.camera, before);
  up(event(1, 60, 80));
  assert.equal(gesture.current, null);
  assert.equal(captures.size, 0);
  assert.ok(Math.abs(model.current.camera.yaw - before.yaw - 0.18) < 1e-12);
  down(event(3, 30, 40));
  const saved = { ...model.current.camera };
  env.applyGesture(event(3, 130, 140));
  cancel(event(3, 130, 140));
  assert.deepEqual(model.current.camera, saved);
  assert.equal(captures.size, 0);
  down(event(4, NaN, 40));
  assert.equal(gesture.current, null);
  canvas.setPointerCapture = () => {
    throw new Error("capture unavailable");
  };
  down(event(5, 30, 40));
  assert.equal(gesture.current, null);
});

test("P31 actual keyboard preserves browser shortcuts, gates lessons and disposes RAF/listeners", async () => {
  const model = { current: createGalaxy(1, 3) },
    calls = [];
  let prevented = 0;
  const key = await componentCallback(file, "key", {
    model,
    stage: 1,
    release: () => {},
    act: (...args) => calls.push(args),
    dollyGalaxyCamera,
    publish: () => {},
  });
  const event = (key, extra = {}) => ({
    key,
    preventDefault: () => prevented++,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    repeat: false,
    ...extra,
  });
  key(event("r", { ctrlKey: true }));
  key(event("Tab"));
  key(event("t"));
  key(event(" "));
  assert.equal(prevented, 0);
  assert.equal(calls.length, 0);
  key(event("ArrowLeft"));
  assert.equal(prevented, 1);
  const frames = new Map(),
    cancelled = [];
  let next = 0,
    published = 0;
  const effect = await componentEffect(file, "requestAnimationFrame", {
    active: true,
    stage: 4,
    model: { current: createGalaxy(4, 2) },
    jobRef: { current: null },
    tickPhysics: (scene) => {
      scene.steps++;
      return true;
    },
    jobsRuntime: { current: measurementRuntime },
    publish: () => published++,
    publishJob: () => {},
    requestAnimationFrame: (callback) => {
      frames.set(++next, callback);
      return next;
    },
    cancelAnimationFrame: (id) => cancelled.push(id),
  });
  const cleanup = effect(),
    callback = frames.get(1);
  callback();
  cleanup();
  const count = published;
  callback();
  assert.equal(published, count);
  assert.ok(cancelled.length > 0);
  const listeners = new Map(),
    removed = [];
  let stopped = 0;
  const target = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
      assert.equal(listeners.get(name), fn);
      removed.push(name);
    },
  };
  const jobRef = { current: { active: true } },
    current = { current: createGalaxy(4, 2) };
  const lifecycle = await componentEffect(file, "visibilitychange", {
    window: target,
    document: { ...target, hidden: true },
    stop: () => stopped++,
    release: () => {},
    model: current,
    jobRef,
    mounted: { current: true },
    requestEpoch: { current: 0 },
    disposeGalaxy,
  });
  const dispose = lifecycle();
  listeners.get("visibilitychange")();
  assert.equal(stopped, 1);
  dispose();
  assert.equal(jobRef.current.active, false);
  assert.deepEqual(removed.sort(), ["blur", "visibilitychange"]);
});

test("P31 actual wheel handler supports dolly, preserves browser zoom and removes its listener", async () => {
  const model = { current: createGalaxy() };
  const before = structuredClone(model.current.bodies);
  const listeners = new Map();
  let prevented = 0,
    published = 0;
  const canvas = {
    focus() {},
    addEventListener(name, fn, options) {
      assert.equal(options.passive, false);
      listeners.set(name, fn);
    },
    removeEventListener(name, fn) {
      assert.equal(listeners.get(name), fn);
      listeners.delete(name);
    },
  };
  const effect = await componentEffect(file, 'canvas.addEventListener("wheel"', {
    canvasRef: { current: canvas },
    model,
    size: { height: 570 },
    release() {},
    dollyGalaxyCamera,
    publish: () => published++,
  });
  const cleanup = effect();
  const wheel = listeners.get("wheel");
  const event = {
    deltaY: -100,
    deltaMode: 0,
    ctrlKey: false,
    metaKey: false,
    preventDefault: () => prevented++,
  };
  for (let i = 0; i < 30; i++) wheel(event);
  assert.ok(model.current.camera.distance < 0);
  const distance = model.current.camera.distance;
  wheel({ ...event, ctrlKey: true });
  assert.equal(model.current.camera.distance, distance);
  assert.equal(prevented, 30);
  assert.equal(published, 30);
  assert.deepEqual(model.current.bodies, before);
  cleanup();
  assert.equal(listeners.size, 0);
});

test("P31 lazy measurements reject stale, canceled, disposed and failed loads", async () => {
  async function fixture() {
    let resolve, reject;
    const pending = new Promise((yes, no) => {
      resolve = yes;
      reject = no;
    });
    const model = { current: createGalaxy(10, 3) };
    const jobRef = { current: null };
    const env = {
      model,
      jobRef,
      mounted: { current: true },
      requestEpoch: { current: 0 },
      jobsRuntime: { current: null },
      publish: () => {},
      publishJob: (value) => {
        jobRef.current = value;
      },
      setLoadingJob: () => {},
      cancelPhysics,
      loadJobs: () => pending,
    };
    return { env, resolve, reject, start: await componentCallback(file, "startMeasurement", env) };
  }
  for (const change of [
    (env) => {
      env.requestEpoch.current++;
    },
    (env) => {
      env.model.current.revision++;
    },
    (env) => {
      env.model.current = createGalaxy(10, 4);
    },
    (env) => {
      env.mounted.current = false;
    },
  ]) {
    const f = await fixture(),
      task = f.start("sweep");
    change(f.env);
    f.resolve(measurementRuntime);
    await task;
    assert.equal(f.env.jobRef.current, null);
  }
  const success = await fixture(),
    task = success.start("energy");
  success.resolve(measurementRuntime);
  await task;
  assert.equal(success.env.jobRef.current.kind, "energy");
  assert.doesNotMatch(success.env.model.current.notice, /Đang tải/);
  const failure = await fixture(),
    failedTask = failure.start("sweep");
  failure.reject(new Error("chunk unavailable"));
  await failedTask;
  assert.equal(failure.env.jobRef.current, null);
  assert.match(failure.env.model.current.notice, /Không tải được/);
});

test("P31 measurement labels distinguish snapshot, scaling datasets and two-body dt experiment", async () => {
  const context = await componentCallback("galaxy-results.tsx", "measurementContext", {});
  const scene = createGalaxy(10, 3);
  scene.time = 12;
  const sweep = startGalaxyJob(scene, "sweep");
  assert.match(context(sweep), /Snapshot t=12\.00000, N=256/);
  sweep.sweeps = [{}, {}, {}, {}];
  assert.match(context(sweep), /4\/4.*32\/32/);
  assert.doesNotMatch(context(sweep), /0\/32/);
  const runtime = startGalaxyJob(scene, "runtime");
  assert.match(context(runtime), /N=256, 512, 1024/);
  assert.doesNotMatch(context(runtime), /Snapshot|12\.00000/);
  const dt = startGalaxyJob(scene, "dt");
  assert.match(context(dt), /N=2, T=1/);
  assert.doesNotMatch(context(dt), /N=256|Snapshot/);
});
