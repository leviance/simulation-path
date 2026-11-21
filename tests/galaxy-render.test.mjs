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
import {
  dollyGalaxyCamera,
  galaxyCameraView,
  projectGalaxy,
} from "../lib/labs/galaxy/projection.ts";

test("P31 uses a continuous stellar disk, a thicker bulge and a sparse 3D halo", () => {
  const bodies = makeGalaxyBodies(4096, 0x31c0ffee);
  let bulge = 0,
    halo = 0,
    disk = 0,
    inner = 0,
    overlap = 0,
    diskZ2 = 0,
    bulgeZ2 = 0;
  let windingX = 0,
    windingY = 0,
    fixedX = 0,
    fixedY = 0,
    band = 0,
    interarm = 0;
  for (let id = 1; id < bodies.length; id++) {
    const { x, y, z } = bodies[id].position,
      r = Math.hypot(x, y);
    if (id % 5 === 0) {
      assert.ok(Math.hypot(r, z / 0.76) <= 0.66);
      bulgeZ2 += z * z;
      bulge++;
    } else if (id % 23 === 0) {
      const radius = Math.hypot(r, z / 0.86);
      assert.ok(radius >= 0.48 && radius <= 1.66);
      halo++;
    } else {
      assert.ok(r <= 1.82);
      disk++;
      diskZ2 += z * z;
      if (r < 0.7) inner++;
      if (r < 0.2) overlap++;
      if (r > 0.45 && r < 1.5) {
        // Remove an independent approximate logarithmic winding. A bar or a uniform disk fails.
        const a = Math.atan2(y, x),
          phase = 2 * (a - 4 * Math.log1p(r / 0.25));
        windingX += Math.cos(phase);
        windingY += Math.sin(phase);
        fixedX += Math.cos(2 * a);
        fixedY += Math.sin(2 * a);
        if (Math.cos(phase - 0.85) < 0) interarm++;
        band++;
      }
    }
  }
  assert.deepEqual([bulge, halo, disk], [819, 143, 3133]);
  assert.ok(overlap > 100, "disk enters the core without an artificial inner rim");
  assert.ok(diskZ2 / disk > 0.001 && bulgeZ2 / bulge > (2 * diskZ2) / disk);
  assert.ok(Math.hypot(windingX, windingY) > 0.32 * band);
  assert.ok(Math.hypot(windingX, windingY) > 2 * Math.hypot(fixedX, fixedY));
  assert.ok(interarm > 0.12 * band, "real stars remain between the arms");
  const cumulative = (r) => 1 - (1 + r / 0.47) * Math.exp(-r / 0.47);
  assert.ok(Math.abs(inner / disk - cumulative(0.7) / cumulative(1.82)) < 0.04);
  assert.deepEqual(bodies, makeGalaxyBodies(4096, 0x31c0ffee));
  assert.notDeepEqual(bodies, makeGalaxyBodies(4096, 1));
  assert.ok(
    Math.abs(bodies[1].position.y - 1.1827046559686794) < 1e-10,
    "C++ and web use the same seed sequence",
  );
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
  assert.ok(a.blue > 2 * a.red);
  assert.equal(a.blue, 1);
  assert.ok(Math.abs(b.red - 1) < 1e-12 && b.blue < 0.65);
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
  scene.camera.distance = 7.8;
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

test("Three camera views reveal the shape of the same snapshot, not three separate pictures", () => {
  const scene = createGalaxy();
  const raster = createGalaxyRaster(480, 320);
  const aspect = (view) => {
    assert.equal(renderGalaxyRaster(raster, scene.bodies, galaxyCameraView(view)).drawn, 4096);
    const samples = [];
    let weight = 0,
      mx = 0,
      my = 0;
    for (let y = 0; y < raster.height; y += 2)
      for (let x = 0; x < raster.width; x += 2) {
        const i = (y * raster.width + x) * 4;
        const w = Math.max(0, raster.pixels[i + 1] - 30);
        if (w > 0) {
          samples.push([x, y, w]);
          weight += w;
          mx += x * w;
          my += y * w;
        }
      }
    assert.ok(samples.length > 500);
    mx /= weight;
    my /= weight;
    let xx = 0,
      xy = 0,
      yy = 0;
    for (const [x, y, w] of samples) {
      xx += w * (x - mx) ** 2;
      xy += w * (x - mx) * (y - my);
      yy += w * (y - my) ** 2;
    }
    const trace = xx + yy,
      delta = Math.hypot(xx - yy, 2 * xy);
    return Math.sqrt((trace + delta) / (trace - delta));
  };
  const face = aspect(1),
    oblique = aspect(0),
    edge = aspect(2);
  assert.ok(face < 1.5 && oblique > face + 0.2 && edge > oblique * 1.8);
});
