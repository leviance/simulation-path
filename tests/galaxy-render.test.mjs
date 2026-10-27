import assert from "node:assert/strict";
import test from "node:test";
import { makeGalaxyBodies } from "../lib/labs/barnes-hut-nbody.ts";
import { createGalaxy, presetBodies } from "../lib/labs/galaxy/scene.ts";
import {
  createGalaxyRaster,
  addStarLight,
  finishGalaxyRaster,
  starStyle,
} from "../lib/labs/galaxy/appearance.ts";
import { renderGalaxyRaster } from "../lib/labs/galaxy/render.ts";
import { dollyGalaxyCamera, projectGalaxy } from "../lib/labs/galaxy/projection.ts";

test("P31 real seeded bodies form a thick core and two scattered spiral arms, not decorative pixels", () => {
  const bodies = makeGalaxyBodies(4096, 0x31c0ffee);
  let core = 0,
    disk = 0,
    insideDisk = 0,
    count = 0,
    deepCore = 0,
    thickDisk = 0,
    halo = 0;
  for (let i = 1; i < bodies.length; i++) {
    const p = bodies[i].position;
    const r = Math.hypot(p.x, p.y);
    if (i % 3 === 0) {
      const ellipsoidRadius = Math.hypot(p.x, p.y, p.z / 0.85);
      assert.ok(ellipsoidRadius >= 0.06 && ellipsoidRadius <= 0.61);
      if (Math.abs(p.z) > 0.18) deepCore++;
      core++;
    } else if (i % 11 === 0) {
      assert.ok(Math.hypot(p.x, p.y, p.z) >= 0.5 && Math.hypot(p.x, p.y, p.z) <= 1.4);
      halo++;
    } else {
      if (Math.abs(p.z) > 0.08) thickDisk++;
      assert.ok(r >= 0.2 && r <= 1.6);
      disk++;
      if (r < 0.7) insideDisk++;
    }
    if (p.z !== 0) count++;
  }
  assert.equal(core, 1365);
  assert.equal(halo, 248);
  assert.ok(
    deepCore > 300 && thickDisk > 600,
    "core and disk must have substantial real depth, not epsilon jitter",
  );
  assert.equal(disk, 2482);
  assert.equal(count, 4095);
  // Independent integrated exponential-disk CDF, not the bisection sampler.
  const cumulative = (r) => 1 - (1 + r / 0.36) * Math.exp(-r / 0.36);
  assert.ok(Math.abs(insideDisk / disk - cumulative(0.5) / cumulative(1.4)) < 0.05);
  assert.deepEqual(bodies, makeGalaxyBodies(4096, 0x31c0ffee));
  assert.notDeepEqual(bodies, makeGalaxyBodies(4096, 1));
});

test("P31 dolly passes through the core, retains perspective and does not move simulation bodies", () => {
  const scene = createGalaxy();
  const before = structuredClone(scene.bodies);
  for (let i = 0; i < 30; i++) dollyGalaxyCamera(scene.camera, 1);
  assert.ok(scene.camera.distance < 0);
  const camera = { yaw: 0, pitch: 0, distance: 0, x: 0, y: 0 };
  assert.equal(projectGalaxy({ x: 0, y: 0, z: 0.5 }, camera, 800, 570).visible, true);
  assert.equal(projectGalaxy({ x: 0, y: 0, z: -0.5 }, camera, 800, 570).visible, false);
  for (let i = 0; i < 300; i++) dollyGalaxyCamera(scene.camera, -1);
  assert.equal(scene.camera.distance, 30);
  for (let i = 0; i < 300; i++) dollyGalaxyCamera(scene.camera, 1);
  assert.equal(scene.camera.distance, -16);
  dollyGalaxyCamera(scene.camera, NaN);
  assert.equal(scene.camera.distance, -16);
  assert.deepEqual(scene.bodies, before);
});

test("P31 encounter has two real massive cores, tilted disks and balanced total momentum", () => {
  const bodies = presetBodies(1, 4096);
  assert.equal(bodies.length, 4096);
  const cores = bodies.filter((body) => body.mass > 1);
  assert.equal(cores.length, 2);
  assert.deepEqual(
    cores.map((body) => body.mass),
    [60, 60],
  );
  assert.deepEqual(
    cores.map((body) => body.position.x),
    [-0.6, 0.6],
  );
  const momentum = bodies.reduce(
    (p, b) => ({
      x: p.x + b.mass * b.velocity.x,
      y: p.y + b.mass * b.velocity.y,
      z: p.z + b.mass * b.velocity.z,
    }),
    { x: 0, y: 0, z: 0 },
  );
  assert.ok(Math.hypot(momentum.x, momentum.y, momentum.z) < 1e-10);
  const second = bodies.slice(2048);
  assert.ok(second.some((body) => Math.abs(body.position.z) > 0.1));
});

test("P31 stellar color/size disclose core distance, speed brightness, mass and perspective with bounded halos", () => {
  const cold = { position: { x: 0, y: 0, z: 0 }, velocity: { x: 0.35, y: 0, z: 0 }, mass: 1 };
  const hot = { ...cold, velocity: { x: 1.3, y: 0, z: 0 } };
  const a = starStyle(cold, 2.5, 570, 1),
    b = starStyle(hot, 2.5, 570, 0);
  assert.equal(a.red, 0.14);
  assert.equal(a.blue, 1);
  assert.ok(Math.abs(b.red - 1) < 1e-12 && Math.abs(b.blue - 0.22) < 1e-12);
  assert.ok(b.intensity > a.intensity);
  assert.ok(starStyle(cold, 2, 570).radius > starStyle(cold, 4, 570).radius);
  assert.ok(starStyle({ ...cold, mass: 120 }, 2.5, 570).radius > a.radius);
  const raster = createGalaxyRaster(32, 32);
  addStarLight(raster, 16.5, 16.5, { red: 1, green: 0.5, blue: 0.25, radius: 1, intensity: 1 });
  const center = (16 * 32 + 16) * 3;
  assert.ok(Math.abs(raster.light[center] - 1.055) < 1e-6);
  assert.equal(raster.light[(16 * 32 + 23) * 3], 0);
  finishGalaxyRaster(raster);
  // Independent center-pixel oracle for the documented tone mapping.
  assert.equal(raster.pixels[(16 * 32 + 16) * 4], Math.round(255 * Math.sqrt(1.05525 / 2.05525)));
  assert.equal(raster.pixels[3], 255);
  assert.throws(() => createGalaxyRaster(0, 570), /framebuffer/);
  assert.throws(() => createGalaxyRaster(4097, 570), /framebuffer/);
});

test("P31 renderer reads every real body, preserves state and has no time/random animation", () => {
  const scene = createGalaxy();
  const before = structuredClone(scene.bodies);
  const frame = createGalaxyRaster(800, 570);
  // A wide camera contains the entire halo; a closer camera legitimately clips.
  scene.camera.distance = 4;
  const stats = renderGalaxyRaster(frame, scene.bodies, scene.camera);
  assert.deepEqual(stats, { simulated: 4096, drawn: 4096 });
  assert.deepEqual(scene.bodies, before);
  const pixels = frame.pixels.slice();
  renderGalaxyRaster(frame, scene.bodies, scene.camera);
  assert.deepEqual(frame.pixels, pixels);
  renderGalaxyRaster(frame, scene.bodies, { ...scene.camera, yaw: scene.camera.yaw + 0.5 });
  assert.notDeepEqual(frame.pixels, pixels);
  renderGalaxyRaster(frame, [], scene.camera);
  for (let i = 4; i < frame.pixels.length; i++) assert.equal(frame.pixels[i], frame.pixels[i % 4]);
  const hidden = [{ position: { x: 0, y: 0, z: -100 }, velocity: { x: 0, y: 0, z: 0 }, mass: 1 }];
  assert.equal(
    renderGalaxyRaster(frame, hidden, { yaw: 0, pitch: 0, distance: 2, x: 0, y: 0 }).drawn,
    0,
  );
});
