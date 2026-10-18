import assert from "node:assert/strict";
import test from "node:test";
import {
  advanceMotion,
  createMotionTimeline,
  freshMotionState,
  remainingFrameNs,
  sanitizeDeltaTime,
  simulateMotion,
} from "../lib/labs/motion.ts";
import { canvasCallback, componentCallback, componentEffect } from "./lab-handler-support.mjs";

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, actual + " != " + expected);
for (const fps of [30, 60, 120]) {
  test("Motion uses real update steps at " + fps + " FPS", () => {
    const state = simulateMotion(fps, "even");
    close(state.elapsed, 5);
    close(state.timeDistance, 900);
    close(state.frameDistance, fps * 15);
    close(state.discarded, 0);
    assert.ok(state.history.length <= 601);
  });
}

test("Motion uneven timelines keep distance when no dt is clipped", () => {
  for (const fps of [30, 60, 120]) {
    const state = simulateMotion(fps, "jitter");
    close(state.elapsed, 5);
    close(state.timeDistance, 900);
    close(state.discarded, 0);
  }
});

test("Motion clamp exposes slowdown at 15 FPS, not a fabricated 900 px", () => {
  const state = simulateMotion(15, "even");
  close(state.timeDistance, 675);
  close(state.discarded, 1.25);
});

test("Motion stall exposes exactly 0.15 seconds of discarded time", () => {
  const state = simulateMotion(60, "stall");
  close(state.elapsed, 5);
  close(state.timeDistance, 873);
  close(state.discarded, 0.15);
});

test("Motion clips the final partial frame and does not advance after finish", () => {
  const state = freshMotionState();
  for (let i = 0; i < 167; i += 1) advanceMotion(state, 0.03);
  close(state.elapsed, 5);
  close(state.timeDistance, 900);
  close(state.frameDistance, 500);
  const before = structuredClone(state);
  advanceMotion(state, 1);
  assert.deepEqual(state, before);
});

test("Motion invalid dt or FPS cannot create unbounded stepping", () => {
  const state = freshMotionState();
  for (const dt of [NaN, Infinity, -1, 0]) advanceMotion(state, dt);
  close(state.elapsed, 0);
  close(sanitizeDeltaTime(0.2), 0.05);
  close(sanitizeDeltaTime(-1), 0);
  close(sanitizeDeltaTime(NaN), 0);
  for (const fps of [0, -1, 14, 121, 60.5, Infinity]) {
    assert.throws(() => createMotionTimeline(fps, "even"), RangeError);
  }
});

test("Motion limiter agrees with C++ nanosecond fixtures", () => {
  assert.equal(remainingFrameNs(60, 4_000_000), 12_666_666);
  assert.equal(remainingFrameNs(60, 20_000_000), 0);
  assert.equal(remainingFrameNs(0, 0), 0);
  assert.equal(remainingFrameNs(-1, 0), 0);
  assert.equal(remainingFrameNs(120, 8_333_333), 0);
});

test("Motion calculate callback calls the actual shared simulation and stays paused", async () => {
  const simulation = { current: freshMotionState() },
    playback = { current: {} },
    paused = [];
  let releases = 0,
    publishes = 0;
  const calculate = await componentCallback("motion-lab.tsx", "calculate", {
    simulation,
    playback,
    timeline: { current: createMotionTimeline(60, "stall") },
    fps: 60,
    preset: "stall",
    simulateMotion,
    clearPointer() {
      releases += 1;
    },
    setPaused(value) {
      paused.push(value);
    },
    publish() {
      publishes += 1;
    },
  });
  calculate();
  close(simulation.current.timeDistance, 873);
  assert.deepEqual(paused, [true]);
  assert.equal(releases, 1);
  assert.equal(publishes, 1);
  assert.equal(playback.current.last, 0);
});

test("Motion actual reset drops stale time, timeline and selected graph point", async () => {
  const simulation = { current: simulateMotion(60, "even") },
    playback = { current: { accumulator: 9 } },
    timeline = { current: [] };
  const paused = [],
    selected = [];
  const reset = await componentCallback("motion-lab.tsx", "reset", {
    fps: 60,
    preset: "even",
    clearPointer() {},
    simulation,
    playback,
    timeline,
    freshMotionState,
    createMotionTimeline,
    setPaused(value) {
      paused.push(value);
    },
    setSampleTime(value) {
      selected.push(value);
    },
    publish() {},
  });
  reset(30, "stall");
  close(simulation.current.elapsed, 0);
  assert.deepEqual(playback.current, { last: 0, accumulator: 0, index: 0 });
  assert.equal(timeline.current[0], 0.2);
  assert.deepEqual(paused, [true]);
  assert.deepEqual(selected, [5]);
});

test("Motion actual pause blocks reduced-motion animation and resets clock when resumed", async () => {
  const playback = { current: { last: 999 } };
  let changes = 0,
    resets = 0;
  const env = {
    playback,
    simulation: { current: freshMotionState() },
    reset() {
      resets += 1;
    },
    setPaused() {
      changes += 1;
    },
  };
  const blocked = await componentCallback("motion-lab.tsx", "togglePaused", {
    ...env,
    reducedMotion: true,
  });
  blocked();
  assert.equal(changes, 0);
  const normal = await componentCallback("motion-lab.tsx", "togglePaused", {
    ...env,
    reducedMotion: false,
  });
  normal();
  assert.equal(changes, 1);
  assert.equal(playback.current.last, 0);
  assert.equal(resets, 0);
});

test("Motion actual pointer callbacks accept one owner and release only that owner", async () => {
  const ownerPointer = { current: null },
    captures = [],
    inspected = [];
  let releases = 0;
  const env = {
    ownerPointer,
    inspect(x) {
      inspected.push(x);
    },
    clearPointer() {
      ownerPointer.current = null;
      releases += 1;
    },
  };
  const down = await canvasCallback("motion-lab.tsx", "onPointerDown", env);
  const move = await canvasCallback("motion-lab.tsx", "onPointerMove", env);
  const up = await canvasCallback("motion-lab.tsx", "onPointerUp", env);
  const target = {
    setPointerCapture(id) {
      captures.push(id);
    },
    focus() {},
  };
  down({ button: 2, pointerId: 1, currentTarget: target, clientX: 20 });
  assert.equal(ownerPointer.current, null);
  down({ button: 0, pointerId: 1, currentTarget: target, clientX: 20 });
  down({ button: 0, pointerId: 2, currentTarget: target, clientX: 30 });
  move({ pointerId: 2, clientX: 40 });
  up({ pointerId: 2 });
  assert.equal(releases, 0);
  move({ pointerId: 1, clientX: 50 });
  up({ pointerId: 1 });
  assert.deepEqual(captures, [1]);
  assert.deepEqual(inspected, [20, 50]);
  assert.equal(releases, 1);
});

test("Motion actual dispose removes visibility listener and clears capture", async () => {
  const listeners = new Map();
  let stops = 0,
    releases = 0;
  const document = {
    hidden: false,
    addEventListener(name, handler) {
      listeners.set(name, handler);
    },
    removeEventListener(name, handler) {
      assert.equal(listeners.get(name), handler);
      listeners.delete(name);
    },
  };
  const effect = await componentEffect("motion-lab.tsx", "visibilitychange", {
    document,
    window: document,
    stop() {
      stops += 1;
    },
    clearPointer() {
      releases += 1;
    },
  });
  const dispose = effect();
  listeners.get("visibilitychange")();
  assert.equal(stops, 0);
  document.hidden = true;
  listeners.get("visibilitychange")();
  assert.equal(stops, 1);
  dispose();
  assert.equal(listeners.size, 0);
  assert.equal(releases, 1);
});

test("Motion graph inspection clamps coordinates to five-second range", async () => {
  const selected = [];
  const inspect = await componentCallback("motion-lab.tsx", "inspect", {
    canvasRef: { current: { getBoundingClientRect: () => ({ left: 100, width: 760 }) } },
    size: { width: 760 },
    setSampleTime(value) {
      selected.push(value);
    },
  });
  inspect(-100);
  inspect(2000);
  assert.deepEqual(selected, [0, 5]);
});

test("Motion actual keyboard ignores shortcuts and repeat toggles, and lets Tab leave", async () => {
  let prevented = 0,
    toggles = 0,
    resets = 0,
    selected = 5;
  const keyDown = await canvasCallback("motion-lab.tsx", "onKeyDown", {
    togglePaused() {
      toggles += 1;
    },
    reset() {
      resets += 1;
    },
    setSampleTime(value) {
      selected = value(selected);
    },
  });
  const event = (key, extra = {}) => ({
    key,
    preventDefault() {
      prevented += 1;
    },
    ...extra,
  });
  keyDown(event("Tab"));
  keyDown(event("r", { ctrlKey: true }));
  keyDown(event("ArrowLeft", { altKey: true }));
  assert.equal(prevented, 0);
  keyDown(event(" ", { repeat: true }));
  assert.equal(toggles, 0);
  keyDown(event(" "));
  keyDown(event("R"));
  keyDown(event("ArrowLeft"));
  close(selected, 4.75);
  assert.equal(toggles, 1);
  assert.equal(resets, 1);
});

test("Motion actual animation uses the shared timeline with bounded work and disposes RAF", async () => {
  const callbacks = new Map(),
    cancelled = [],
    paused = [];
  let nextId = 0;
  const simulation = { current: freshMotionState() };
  const playback = { current: { last: 0, accumulator: 0, index: 0 } };
  const effect = await componentEffect("motion-lab.tsx", 'getContext("2d")', {
    canvasRef: { current: { getContext: () => ({}) } },
    simulation,
    playback,
    timeline: { current: createMotionTimeline(120, "even") },
    paused: false,
    reducedMotion: false,
    advanceMotion,
    size: { width: 760, height: 340, dpr: 2 },
    sampleTime: 5,
    showFrame: true,
    drawMotion() {},
    setReadout() {},
    setPaused(value) {
      paused.push(value);
    },
    requestAnimationFrame(callback) {
      callbacks.set(++nextId, callback);
      return nextId;
    },
    cancelAnimationFrame(id) {
      cancelled.push(id);
    },
  });
  const dispose = effect();
  callbacks.get(1)(100);
  callbacks.get(2)(1100);
  assert.equal(playback.current.index, 32, "one callback handles at most 32 steps");
  close(simulation.current.timeDistance, 48);
  callbacks.get(3)(1110);
  assert.equal(playback.current.index, 64, "unprocessed time is retained, not silently discarded");
  assert.deepEqual(paused, []);
  dispose();
  assert.deepEqual(cancelled, [4]);
});
