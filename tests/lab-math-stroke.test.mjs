import assert from "node:assert/strict";
import test from "node:test";
import { sampleStroke, interpolateStroke, maximumGap, thinStroke } from "../lib/labs/stroke.ts";
import {
  insidePaint,
  paintBackground,
  paintInk,
  renderPaint,
  stampCircle,
  strokePresets,
} from "../lib/labs/paint.ts";
import { canvasCallback, componentCallback, componentEffect } from "./lab-handler-support.mjs";

const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-8, actual + " != " + expected);

test("Stroke 17/8 emits independent endpoints and exact interior fixture", () => {
  const result = sampleStroke({ x: 0, y: 0 }, { x: 17, y: 0 }, 8);
  assert.equal(result.length, 4);
  close(result[1].x, 17 / 3);
  close(result[2].x, 34 / 3);
  assert.deepEqual(result[0], { x: 0, y: 0 });
  assert.deepEqual(result.at(-1), { x: 17, y: 0 });
});

test("Stroke covers every octant without violating spacing", () => {
  for (const [x, y] of [
    [100, 0],
    [100, 50],
    [0, 100],
    [-50, 100],
    [-100, 0],
    [-100, -50],
    [0, -100],
    [50, -100],
  ]) {
    const result = sampleStroke({ x: 0, y: 0 }, { x, y }, 3);
    assert.deepEqual(result.at(-1), { x, y });
    assert.ok(maximumGap(result) <= 3 + 1e-9);
  }
});

test("Stroke zero/invalid/overlong input stays bounded instead of silent coarsening", () => {
  assert.deepEqual(sampleStroke({ x: 2, y: 3 }, { x: 2, y: 3 }, 0), [{ x: 2, y: 3 }]);
  for (const spacing of [0, -1, NaN, Infinity])
    assert.equal(sampleStroke({ x: 0, y: 0 }, { x: 100, y: 0 }, spacing).length, 201);
  assert.equal(sampleStroke({ x: 0, y: 0 }, { x: 2048, y: 0 }, 0).length, 4097);
  assert.deepEqual(sampleStroke({ x: 0, y: 0 }, { x: 2049, y: 0 }, 0.5), []);
  assert.deepEqual(sampleStroke({ x: NaN, y: 0 }, { x: 1, y: 0 }, 1), []);
  assert.deepEqual(sampleStroke({ x: 0, y: 0 }, { x: Infinity, y: 0 }, 1), []);
});

test("Stroke thinning always keeps the release endpoint", () => {
  const input = strokePresets.line[0];
  const kept = thinStroke(input, 8);
  assert.deepEqual(kept, [input[0], input.at(-1)]);
  assert.deepEqual(thinStroke(input, 0), input);
});

test("Stroke polyline helper preserves joins and total output budget", () => {
  const result = interpolateStroke(
    [
      { x: 0, y: 0 },
      { x: 17, y: 0 },
      { x: 17, y: 0 },
      { x: 17, y: 10 },
    ],
    8,
  );
  assert.deepEqual(result.at(-1), { x: 17, y: 10 });
  assert.ok(maximumGap(result) <= 8);
  assert.deepEqual(
    interpolateStroke(
      Array.from({ length: 513 }, () => ({ x: 0, y: 0 })),
      1,
    ),
    [],
  );
  const zigzag = Array.from({ length: 512 }, (_, index) => ({ x: (index % 2) * 2048, y: 0 }));
  assert.deepEqual(interpolateStroke(zigzag, 0.5), []);
});

test("Paint radius-two raster uses thirteen pixels, not Canvas arc coverage", () => {
  const pixels = new Uint32Array(40 * 40);
  stampCircle(pixels, 40, 40, { x: 20, y: 20 }, 2, paintInk);
  assert.equal([...pixels].filter((pixel) => pixel === paintInk).length, 13);
  assert.equal(pixels[20 * 40 + 22], paintInk);
  assert.equal(pixels[21 * 40 + 22], 0);
  for (let dy = -2; dy <= 2; dy++)
    for (let dx = -2; dx <= 2; dx++)
      assert.equal(pixels[(20 + dy) * 40 + 20 + dx], pixels[(20 + dx) * 40 + 20 + dy]);
});

test("Paint clips circle at corner and rejects invalid input before integer conversion", () => {
  const pixels = new Uint32Array(40 * 40);
  stampCircle(pixels, 40, 40, { x: 0, y: 0 }, 2, paintInk);
  assert.equal([...pixels].filter((pixel) => pixel === paintInk).length, 6);
  const before = pixels.slice();
  for (const point of [
    { x: -1, y: 0 },
    { x: 1e300, y: 0 },
    { x: NaN, y: 0 },
  ])
    stampCircle(pixels, 40, 40, point, 2, paintInk);
  stampCircle(pixels, 40, 40, { x: 20, y: 20 }, 999, paintInk);
  assert.deepEqual(pixels, before);
  assert.equal(insidePaint({ x: 320, y: 0 }), false);
  assert.equal(insidePaint({ x: 319.9, y: 179.9 }), true);
});

test("Paint interpolation fills a sparse input centerline without connecting separate strokes", () => {
  const before = renderPaint(strokePresets.line, 2, 8, false);
  const after = renderPaint(strokePresets.line, 2, 8, true);
  assert.equal(before.pixels[90 * 320 + 150], paintBackground);
  for (let x = 25; x <= 285; x++) assert.equal(after.pixels[90 * 320 + x], paintInk);
  assert.ok(after.stampGap <= 1.6 + 1e-9);
  assert.equal(after.inputGap, 260);
  const separate = renderPaint(strokePresets.separate, 2, 1, true);
  assert.equal(separate.pixels[90 * 320 + 160], paintBackground);
  assert.equal(separate.input.length, 2);
});

test("Paint interpolation cannot reconstruct a discarded corner", () => {
  const original = renderPaint(strokePresets.corner, 2, 1, true);
  const sparse = renderPaint(strokePresets.corner, 2, 8, true);
  assert.equal(original.pixels[35 * 320 + 30], paintInk);
  assert.equal(sparse.pixels[35 * 320 + 30], paintBackground);
  assert.ok(sparse.stampGap <= 1.6 + 1e-9);
});

test("Paint actual pointer-down accepts one primary left owner, never right-click or a second pointer", async () => {
  const owner = { current: null },
    keyboardDrawing = { current: true },
    captures = [];
  let starts = 0;
  const start = await componentCallback("stroke-lab.tsx", "startStroke", {
    brushOnly: false,
    paused: false,
    owner,
    keyboardDrawing,
    eventPoint: () => ({ x: 10, y: 10 }),
    beginPath() {
      starts++;
      return true;
    },
  });
  const currentTarget = {
    setPointerCapture(id) {
      captures.push(id);
    },
    focus() {},
  };
  start({ button: 2, isPrimary: true, pointerId: 1, currentTarget });
  start({ button: 0, isPrimary: false, pointerId: 1, currentTarget });
  start({ button: 0, isPrimary: true, pointerId: 1, currentTarget });
  start({ button: 0, isPrimary: true, pointerId: 2, currentTarget });
  assert.equal(starts, 1);
  assert.equal(owner.current, 1);
  assert.equal(keyboardDrawing.current, false);
  assert.deepEqual(captures, [1]);
});

test("Paint actual pointer-up includes final sample, cancel and unrelated pointer do not", async () => {
  const owner = { current: 1 },
    appended = [];
  let releases = 0;
  const end = await componentCallback("stroke-lab.tsx", "endStroke", {
    owner,
    paused: false,
    eventPoint: (event) => event.point,
    appendPoint(point, endpoint) {
      appended.push([point, endpoint]);
    },
    releasePointer() {
      releases++;
      owner.current = null;
    },
  });
  end({ pointerId: 2, point: { x: 40, y: 20 } });
  assert.equal(releases, 0);
  end({ pointerId: 1, point: { x: 40, y: 20 } });
  assert.deepEqual(appended, [[{ x: 40, y: 20 }, true]]);
  owner.current = 3;
  end({ pointerId: 3 }, true);
  assert.equal(appended.length, 1);
  assert.equal(releases, 2);
});

test("Paint actual motion requires matching owner and left-button state", async () => {
  const appended = [];
  let releases = 0;
  const move = await componentCallback("stroke-lab.tsx", "moveStroke", {
    paused: false,
    owner: { current: 1 },
    eventPoint: (event) => event.point,
    appendPoint(point) {
      appended.push(point);
    },
    releasePointer() {
      releases++;
    },
  });
  move({ pointerId: 2, buttons: 1 });
  move({ pointerId: 1, buttons: 0 });
  move({ pointerId: 1, buttons: 1, point: { x: 10, y: 20 } });
  assert.deepEqual(appended, [{ x: 10, y: 20 }]);
  assert.equal(releases, 1);
});

test("Paint actual append reserves a final endpoint slot without releasing early", async () => {
  const pathsRef = { current: [Array.from({ length: 127 }, (_, x) => ({ x, y: 10 }))] };
  let releases = 0;
  const append = await componentCallback("stroke-lab.tsx", "appendPoint", {
    pathsRef,
    insidePaint,
    maximumRawPoints: 128,
    releasePointer() {
      releases++;
    },
    setMessage() {},
    setCursor() {},
    replacePaths(next) {
      pathsRef.current = next;
    },
  });
  assert.equal(append({ x: 127, y: 10 }), false);
  assert.equal(releases, 0);
  assert.equal(append({ x: 128, y: 10 }, true), true);
  assert.equal(pathsRef.current[0].length, 128);
  assert.equal(append({ x: 129, y: 10 }, true), false);
  assert.equal(releases, 1);
});

test("Paint actual append rejects outside points instead of clamping them onto an edge", async () => {
  const pathsRef = { current: [[{ x: 1, y: 1 }]] };
  let releases = 0,
    writes = 0;
  const append = await componentCallback("stroke-lab.tsx", "appendPoint", {
    pathsRef,
    insidePaint,
    maximumRawPoints: 128,
    releasePointer() {
      releases++;
    },
    setMessage() {},
    replacePaths() {
      writes++;
    },
  });
  append({ x: -1, y: 30 });
  assert.equal(releases, 1);
  assert.equal(writes, 0);
});

test("Paint actual coordinate conversion accounts for letterbox and CSS scale", async () => {
  const convert = await componentCallback("stroke-lab.tsx", "eventPoint", {
    size: { width: 760, height: 340 },
    strokeBoard: () => ({ scale: 5 / 3, ox: 340 / 3, oy: 20 }),
  });
  const currentTarget = {
    getBoundingClientRect: () => ({ left: 100, top: 200, width: 760, height: 340 }),
  };
  const center = convert({ clientX: 480, clientY: 370, currentTarget });
  close(center.x, 160);
  close(center.y, 90);
  assert.equal(insidePaint(convert({ clientX: 110, clientY: 370, currentTarget })), false);
});

test("Paint actual keyboard moves without painting, toggles a stroke, and ignores shortcuts", async () => {
  const keyboardDrawing = { current: false },
    positions = [],
    appended = [];
  let starts = 0,
    prevented = 0;
  const keyDown = await componentCallback("stroke-lab.tsx", "keyDown", {
    cursor: { x: 100, y: 100 },
    keyboardDrawing,
    paused: false,
    brushOnly: false,
    insidePaint,
    setCursor(point) {
      positions.push(point);
    },
    togglePaused() {},
    reset() {},
    clear() {},
    releasePointer() {
      keyboardDrawing.current = false;
    },
    beginPath() {
      starts++;
      return true;
    },
    appendPoint(point) {
      appended.push(point);
    },
  });
  const event = (key, extra = {}) => ({
    key,
    preventDefault() {
      prevented++;
    },
    ...extra,
  });
  keyDown(event("Tab"));
  keyDown(event("r", { ctrlKey: true }));
  assert.equal(prevented, 0);
  keyDown(event("ArrowRight"));
  assert.deepEqual(positions, [{ x: 120, y: 100 }]);
  assert.equal(appended.length, 0);
  keyDown(event("Enter"));
  keyDown(event("ArrowRight"));
  keyDown(event("Enter", { repeat: true }));
  assert.equal(keyboardDrawing.current, true);
  keyDown(event("Enter"));
  keyDown(event("ArrowRight"));
  assert.equal(keyboardDrawing.current, false);
  assert.equal(starts, 1);
  assert.deepEqual(appended, [{ x: 120, y: 100 }]);
});

test("Paint actual capture loss and lifecycle cleanup never retain a drag owner", async () => {
  const owner = { current: 1 };
  const lost = await canvasCallback("stroke-lab.tsx", "onLostPointerCapture", { owner });
  lost({ pointerId: 2 });
  assert.equal(owner.current, 1);
  lost({ pointerId: 1 });
  assert.equal(owner.current, null);
  const listeners = new Map();
  let releases = 0;
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
  const effect = await componentEffect("stroke-lab.tsx", 'window.addEventListener("blur"', {
    document,
    window: document,
    releasePointer() {
      releases++;
    },
  });
  const dispose = effect();
  listeners.get("blur")();
  document.hidden = true;
  listeners.get("visibilitychange")();
  dispose();
  assert.equal(releases, 3);
  assert.equal(listeners.size, 0);
});
