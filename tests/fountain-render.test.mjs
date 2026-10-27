import assert from "node:assert/strict";
import test from "node:test";
import { createFountain, beginConversion, tickPending } from "../lib/labs/fountain/scene.ts";
import {
  createFountainFrame,
  addWaterLight,
  projector,
  renderColor,
} from "../lib/labs/fountain/render-geometry.ts";
import { renderFountainFrame, fountainParticleColor } from "../lib/labs/fountain/render.ts";
import { emptyParticle } from "../lib/labs/fountain/state.ts";
import { prepareFountainSurface } from "../lib/labs/fountain/render-surface.ts";
import { fountainFocalScale } from "../lib/labs/fountain/camera.ts";

test("P32 opaque surfaces occlude water, and the Canvas raster has explicit RGBA bytes", () => {
  const frame = createFountainFrame(8, 8);
  frame.pixels.fill(renderColor(0, 0, 0));
  frame.depth.fill(1);
  assert.equal(addWaterLight(frame, 3, 3, 2, renderColor(255, 0, 0), 1), false);
  assert.equal(frame.pixels[27], 0xff000000);
  assert.equal(addWaterLight(frame, 3, 3, 0.5, renderColor(255, 0, 0), 1), true);
  assert.equal(frame.pixels[27], 0xff0000ff);
  assert.equal(addWaterLight(frame, -1, 3, 0.5, renderColor(255, 0, 0), 1), false);
  const fresh = emptyParticle(0),
    old = { ...fresh, age: 2 };
  assert.equal(fountainParticleColor(fresh), renderColor(228, 250, 255));
  assert.notEqual(fountainParticleColor(fresh), fountainParticleColor(old));
});

test("P32 grid plane depth follows an independent ray/plane oracle, even outside debug mode", () => {
  const frame = createFountainFrame(8, 8);
  const scene = createFountain(8, 3);
  scene.camera = { yaw: 0, pitch: 0, distance: 10, x: 0, y: 1, z: 0 };
  prepareFountainSurface(frame, scene, false);
  const expectedDepth = (8 * fountainFocalScale) / 2.5;
  assert.ok(Math.abs(frame.depth[6 * 8 + 4] - expectedDepth) < 1e-6);
  assert.equal(frame.depth[4], Infinity, "the horizon has no floor intersection");
  const key = frame.key;
  scene.config.emitterX = 2;
  prepareFountainSurface(frame, scene, false);
  assert.equal(frame.key, key, "the reference grid must not move with the emitter");
  const point = projector(scene.camera, 8, 8)({ x: 0, y: 0, z: -10 + expectedDepth });
  assert.ok(Math.abs(point.y - 6.5) < 1e-6);
});

test("P32 rendering is repeatable, preserves every particle and survives AoS/SoA conversion", () => {
  const scene = createFountain(8, 3),
    before = structuredClone(scene.aos),
    frame = createFountainFrame(320, 180);
  const first = renderFountainFrame(frame, scene, false, 128),
    pixels = frame.pixels.slice(),
    key = frame.key;
  assert.equal(first.sampled, 128);
  assert.ok(first.rendered > 0 && first.rendered <= 128);
  assert.deepEqual(scene.aos, before);
  assert.equal(scene.time, 0);
  assert.equal(scene.steps, 0);
  assert.ok(frame.pixels.every((pixel) => pixel >>> 24 === 255));
  assert.deepEqual(renderFountainFrame(frame, scene, false, 128), first);
  assert.deepEqual(
    frame.pixels,
    pixels,
    "cached surfaces must not accumulate light from the previous frame",
  );
  beginConversion(scene, 0);
  let clock = 0;
  while (scene.pending) tickPending(scene, () => ++clock, 0);
  assert.equal(scene.layout, "soa");
  assert.deepEqual(renderFountainFrame(frame, scene, false, 128), first);
  assert.deepEqual(frame.pixels, pixels, "changing memory layout must not change the image");
  renderFountainFrame(frame, scene, true, 128);
  assert.notEqual(frame.key, key);
  assert.notDeepEqual(frame.pixels, pixels);
  assert.equal(scene.active, 256);
  assert.equal(scene.committedUpdated, 0);
});

test("P32 raster allocation and draw budgets are finite", () => {
  assert.throws(() => createFountainFrame(4096, 4096), /budget/);
  assert.throws(() => createFountainFrame(-1, 100), /budget/);
  const scene = createFountain(8, 3),
    frame = createFountainFrame(64, 64);
  assert.deepEqual(renderFountainFrame(frame, scene, false, 0), { sampled: 0, rendered: 0 });
  assert.throws(() => renderFountainFrame(frame, scene, false, 20001), /budget/);
});
