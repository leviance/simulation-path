import assert from "node:assert/strict";
import test from "node:test";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";
import {
  createPixelBuffer,
  packRgba,
  unpackRgba,
  pixelIndex,
  putPixel,
  paintPixelPattern,
  packedHex,
} from "../lib/labs/pixel-memory.ts";

test("Pixel Lab packs RGBA as an unsigned 0xRRGGBBAA value", () => {
  assert.equal(packRgba(1, 2, 3, 4), 0x01020304);
  assert.equal(packRgba(255, 0, 0), 0xff0000ff);
  assert.equal(packRgba(255, 255, 255, 255), 0xffffffff);
  assert.deepEqual(unpackRgba(0x01020304), { r: 1, g: 2, b: 3, a: 4 });
  assert.equal(packedHex(0x01020304), "0x01020304");
  for (const value of [-1, 256, NaN, Infinity, 1.5]) {
    assert.throws(() => packRgba(value, 0, 0), RangeError);
  }
});

test("Pixel Lab row-major and bounds match the native 4x3 fixture", () => {
  const buffer = createPixelBuffer(4, 3);
  assert.equal(buffer.pixels.length, 12);
  assert.equal(pixelIndex(4, 0, 0), 0);
  assert.equal(pixelIndex(4, 0, 1), 4);
  assert.equal(pixelIndex(4, 3, 2), 11);
  const before = buffer.pixels.slice();
  for (const [x, y] of [
    [-1, 0],
    [0, -1],
    [4, 0],
    [0, 3],
    [NaN, 0],
    [0.5, 1],
  ]) {
    assert.equal(putPixel(buffer, x, y, 0xff0000ff), false);
    assert.deepEqual(buffer.pixels, before);
  }
  assert.equal(putPixel(buffer, 3, 2, 0x01020304), true);
  assert.equal(buffer.pixels[11], 0x01020304);
  assert.equal([...buffer.pixels].filter((color) => color === 0x01020304).length, 1);
});

test("Pixel Lab rejects invalid dimensions before allocation", () => {
  for (const [width, height] of [
    [0, 1],
    [1, 0],
    [-1, 3],
    [2.5, 1],
    [Infinity, 1],
    [1, NaN],
    [2 ** 31 - 1, 2 ** 31 - 1],
  ]) {
    assert.throws(() => createPixelBuffer(width, height), RangeError);
  }
});

test("Pixel Lab solid covers every element including alpha", () => {
  const buffer = createPixelBuffer(7, 5);
  paintPixelPattern(buffer, "solid", { color: 0x01020304 });
  assert.ok(buffer.pixels.every((color) => color === 0x01020304));
});

test("Pixel Lab gradient endpoints and midpoint match independent native fixtures", () => {
  const buffer = createPixelBuffer(3, 3);
  paintPixelPattern(buffer, "gradient");
  for (const [index, r, g] of [
    [0, 0, 0],
    [2, 255, 0],
    [6, 0, 255],
    [8, 255, 255],
    [4, 127, 127],
  ]) {
    assert.deepEqual(unpackRgba(buffer.pixels[index]), { r, g, b: 180, a: 255 });
  }
  for (const [width, height, r, g] of [
    [1, 1, 0, 0],
    [1, 3, 0, 255],
    [3, 1, 255, 0],
  ]) {
    const thin = createPixelBuffer(width, height);
    paintPixelPattern(thin, "gradient");
    assert.deepEqual(unpackRgba(thin.pixels.at(-1)), { r, g, b: 180, a: 255 });
  }
});

test("Pixel Lab checker uses cell dimensions rather than alternating every pixel", () => {
  const buffer = createPixelBuffer(4, 4);
  paintPixelPattern(buffer, "checker", { cell: 2 });
  assert.equal(buffer.pixels[0], buffer.pixels[5]);
  assert.notEqual(buffer.pixels[0], buffer.pixels[2]);
  assert.equal(buffer.pixels[0], buffer.pixels[10]);
  paintPixelPattern(buffer, "checker", { cell: 0 });
  assert.notEqual(buffer.pixels[0], buffer.pixels[1]);
  const zeroCell = buffer.pixels.slice();
  paintPixelPattern(buffer, "checker", { cell: -7 });
  assert.deepEqual(buffer.pixels, zeroCell);
});

test("Pixel Lab noise matches seed-17 constants, not a second copy of its own implementation", () => {
  const buffer = createPixelBuffer(3, 2);
  paintPixelPattern(buffer, "noise", { seed: 17 });
  const expected = [62, 210, 117, 76, 182, 85].map((value) =>
    packRgba(value, Math.floor(value / 2), 255 - value),
  );
  assert.deepEqual([...buffer.pixels], expected);
  paintPixelPattern(buffer, "noise", { seed: 18 });
  assert.notDeepEqual([...buffer.pixels], expected);
  paintPixelPattern(buffer, "noise", { seed: 17 });
  assert.deepEqual([...buffer.pixels], expected);
});

test("Pixel Lab allocates exactly the new source image on dimension change", () => {
  const before = createPixelBuffer(4, 3);
  putPixel(before, 3, 2, 0x01020304);
  const after = createPixelBuffer(5, 3);
  assert.equal(after.pixels.length, 15);
  assert.equal(pixelIndex(5, 3, 2), 13);
  assert.ok(after.pixels.every((color) => color === 0));
  assert.equal(before.pixels[11], 0x01020304);
});

test("Pixel Lab actual pointer selection respects capture owner, source bounds and pause", async () => {
  const selected = [];
  const env = {
    paused: false,
    pointerRef: { current: 11 },
    canvasPoint: (event) => event.point,
    metrics: { ox: 10, oy: 20, pixelSize: 10 },
    width: 4,
    height: 3,
    setSelected: (point) => selected.push(point),
  };
  const select = await componentCallback("pixel-lab.tsx", "selectPointer", env);
  select({ isPrimary: true, pointerId: 22, point: { x: 45, y: 45 } });
  select({ isPrimary: false, pointerId: 11, point: { x: 45, y: 45 } });
  select({ isPrimary: true, pointerId: 11, point: { x: 50, y: 30 } });
  assert.deepEqual(selected, []);
  select({ isPrimary: true, pointerId: 11, point: { x: 45, y: 45 } });
  assert.deepEqual(selected, [{ x: 3, y: 2 }]);
  const paused = await componentCallback("pixel-lab.tsx", "selectPointer", {
    ...env,
    paused: true,
  });
  paused({ isPrimary: true, pointerId: 11, point: { x: 15, y: 25 } });
  assert.equal(selected.length, 1);
});

test("Pixel Lab actual pointerup takes the last sample while cancel only releases its owner", async () => {
  let samples = 0,
    releases = 0;
  const pointerRef = { current: 11 };
  const end = await componentCallback("pixel-lab.tsx", "endPointer", {
    pointerRef,
    selectPointer() {
      samples += 1;
    },
    releasePointer() {
      pointerRef.current = null;
      releases += 1;
    },
  });
  end({ pointerId: 22 });
  assert.equal(releases, 0);
  end({ pointerId: 11 });
  assert.equal(samples, 1);
  assert.equal(releases, 1);
  pointerRef.current = 33;
  end({ pointerId: 33 }, true);
  assert.equal(samples, 1);
  assert.equal(releases, 2);
});

test("Pixel Lab actual keyboard uses row-major steps and does not consume browser shortcuts", async () => {
  const points = [];
  let prevented = 0;
  const keyboard = await componentCallback("pixel-lab.tsx", "keyDown", {
    paused: false,
    index: 6,
    width: 4,
    buffer: createPixelBuffer(4, 3),
    setSelected(point) {
      points.push(point);
    },
  });
  for (const key of ["ArrowRight", "ArrowDown", "Home", "End"]) {
    keyboard({
      key,
      preventDefault() {
        prevented += 1;
      },
    });
  }
  keyboard({
    key: "ArrowRight",
    ctrlKey: true,
    preventDefault() {
      prevented += 1;
    },
  });
  assert.deepEqual(points, [
    { x: 3, y: 1 },
    { x: 2, y: 2 },
    { x: 0, y: 0 },
    { x: 3, y: 2 },
  ]);
  assert.equal(prevented, 4);
});

test("Pixel Lab actual write callback rejects invalid coordinates without changing the buffer", async () => {
  const buffer = createPixelBuffer(4, 3),
    before = buffer.pixels.slice();
  const written = [],
    messages = [],
    selected = [];
  const env = {
    buffer,
    putPixel,
    pixelIndex,
    width: 4,
    writeColor: 0x01020304,
    setWritten(value) {
      written.push(value);
    },
    setSelected(value) {
      selected.push(value);
    },
    setMessage(value) {
      messages.push(value);
    },
  };
  const outside = await componentCallback("pixel-lab.tsx", "writeProbe", {
    ...env,
    probe: { x: -1, y: 0 },
  });
  outside();
  assert.equal(written.length, 0);
  assert.match(messages[0], /không phần tử nào/);
  const inside = await componentCallback("pixel-lab.tsx", "writeProbe", {
    ...env,
    probe: { x: 3, y: 2 },
  });
  inside();
  assert.deepEqual(written, [{ x: 3, y: 2, color: 0x01020304 }]);
  assert.deepEqual(selected, [{ x: 3, y: 2 }]);
  assert.deepEqual(buffer.pixels, before, "React-derived buffer is never mutated in place");
});

test("Pixel Lab actual blur and dispose release capture and remove the global listener", async () => {
  const listeners = new Map(),
    released = [];
  const pointerRef = { current: 11 };
  const effect = await componentEffect("pixel-lab.tsx", 'window.addEventListener("blur"', {
    canvasRef: {
      current: {
        hasPointerCapture: () => true,
        releasePointerCapture(id) {
          released.push(id);
        },
      },
    },
    pointerRef,
    window: {
      addEventListener(name, callback) {
        listeners.set(name, callback);
      },
      removeEventListener(name, callback) {
        assert.equal(listeners.get(name), callback);
        listeners.delete(name);
      },
    },
  });
  const dispose = effect();
  listeners.get("blur")();
  assert.equal(pointerRef.current, null);
  pointerRef.current = 22;
  dispose();
  assert.deepEqual(released, [11, 22]);
  assert.equal(listeners.size, 0);
});
