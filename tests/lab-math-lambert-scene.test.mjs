import assert from "node:assert/strict";
import test from "node:test";
import { componentCallback, componentEffect, canvasCallback } from "./lab-handler-support.mjs";
import * as m from "../lib/labs/lambert.ts";
import * as s from "../lib/labs/lambert-scene.ts";

test("Lambert scene gates lesson controls and pauses at initialization", () => {
  for (let stage = 1; stage <= 7; stage++) {
    const initial = s.initialLambertScene(stage);
    assert.equal(initial.paused, true);
    assert.equal(initial.lighting, stage >= 4);
    assert.equal(initial.culling, stage >= 6);
    assert.equal(initial.debug, stage < 7);
    assert.equal(
      s.lambertStage(
        [
          "lambert-mesh",
          "lambert-normal",
          "lambert-light",
          "lambert-dot",
          "lambert-material",
          "lambert-culling",
          "lambert-validation",
        ][stage - 1],
      ),
      stage,
    );
    if (stage < 3)
      assert.equal(
        s.advanceLambert({ ...initial, paused: false }, 0.01, stage).lightAzimuth,
        initial.lightAzimuth,
      );
  }
});
test("Lambert scene distinguishes model rotation and camera orbit", () => {
  const initial = s.initialLambertScene();
  const model = s.dragLambert(initial, 30, 10, 7);
  assert.ok(Math.abs(model.yaw - 0.84) < 1e-12);
  assert.equal(model.cameraYaw, 0);
  const camera = s.dragLambert({ ...initial, target: "camera" }, 30, 10, 7);
  assert.equal(camera.yaw, initial.yaw);
  assert.ok(Math.abs(camera.cameraYaw - 0.24) < 1e-12);
  const before = s.lambertFaces(initial, 7),
    after = s.lambertFaces(camera, 7);
  assert.deepEqual(
    before.map((f) => f.sample),
    after.map((f) => f.sample),
  );
  assert.notDeepEqual(
    s.lambertFrame(initial, 7, 120, 80).owner,
    s.lambertFrame(camera, 7, 120, 80).owner,
  );
  for (let i = 0; i < 12; i++) {
    const light = s.orbitLight(i * 0.3, 0.5),
      n = before[i].normal;
    const nv = s.directionToView(n, camera),
      lv = s.directionToView(light, camera);
    assert.ok(Math.abs(m.lambertDot(n, light) - m.lambertDot(nv, lv)) < 1e-12);
  }
});
test("Lambert orbit is finite and single step has a fixed duration", () => {
  const initial = s.initialLambertScene(),
    running = { ...initial, paused: false };
  assert.equal(s.advanceLambert(initial, 0.1, 7), initial);
  const next = s.advanceLambert(running, 1 / 60, 7);
  assert.ok(Math.abs(next.lightAzimuth - running.lightAzimuth - 0.65 / 60) < 1e-12);
  assert.equal(s.advanceLambert(running, NaN, 7), running);
  assert.equal(s.dragLambert(initial, NaN, 1, 7), initial);
  assert.equal(s.editLambert(initial, "ambient", NaN), initial);
  assert.equal(s.editLambert(initial, "distance", 99).distance, 9);
  assert.ok(Math.abs(m.lambertLength(s.orbitLight(0.4, 0.6)) - 1) < 1e-12);
});
test("Lambert rendered pixels preserve geometry across lighting and draw-order changes", () => {
  const initial = s.initialLambertScene(),
    frame = s.lambertFrame(initial, 7, 144, 96);
  const reverse = s.lambertFrame(initial, 7, 144, 96, true);
  assert.deepEqual(frame.pixels, reverse.pixels);
  const off = s.lambertFrame({ ...initial, lighting: false }, 7, 144, 96);
  assert.deepEqual(frame.owner, off.owner);
  assert.deepEqual(frame.depth, off.depth);
  assert.notDeepEqual(frame.pixels, off.pixels);
  const noCull = s.lambertFrame({ ...initial, culling: false }, 7, 144, 96);
  assert.deepEqual(frame.pixels, noCull.pixels);
  const differentLight = s.lambertFrame(s.presetLambert(initial, 4), 7, 144, 96);
  assert.deepEqual(frame.owner, differentLight.owner);
  assert.notDeepEqual(frame.pixels, differentLight.pixels);
});
test("Lambert pixels match an independent local ray/AABB reference", () => {
  // Slab oracle has no dependency on face normals, clipper or triangle coverage.
  function hit(origin, direction) {
    let enter = -Infinity,
      leave = Infinity,
      normal = { x: 0, y: 0, z: 0 };
    for (const axis of ["x", "y", "z"]) {
      if (Math.abs(direction[axis]) < 1e-12) {
        if (origin[axis] < -1 || origin[axis] > 1) return;
        continue;
      }
      let a = (-1 - origin[axis]) / direction[axis],
        b = (1 - origin[axis]) / direction[axis],
        sign = -1;
      if (a > b) {
        [a, b] = [b, a];
        sign = 1;
      }
      if (a > enter) {
        enter = a;
        normal = { x: 0, y: 0, z: 0 };
        normal[axis] = sign;
      }
      leave = Math.min(leave, b);
    }
    if (enter > leave || enter <= 0) return;
    return { t: enter, normal };
  }
  for (let pose = 0; pose < 4; pose++) {
    const scene = {
      ...s.initialLambertScene(),
      pitch: -0.3 + pose * 0.12,
      yaw: 0.4 + pose * 0.51,
      cameraYaw: -pose * 0.3,
      cameraPitch: 0.1,
      lightAzimuth: pose * 1.1,
    };
    const frame = s.lambertFrame(scene, 7, 144, 96),
      light = s.orbitLight(scene.lightAzimuth, scene.lightElevation);
    const inverse = (p) => m.lambertRotateX(m.lambertRotateY(p, -scene.yaw), -scene.pitch);
    const origin = inverse(s.cameraPosition(scene)),
      focal = 48 / Math.tan(Math.PI / 6);
    let count = 0;
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 144; x++) {
        const ray = m.lambertRotateY(
          m.lambertRotateX(
            { x: (x + 0.5 - 72) / focal, y: -(y + 0.5 - 48) / focal, z: 1 },
            scene.cameraPitch,
          ),
          scene.cameraYaw,
        );
        const h = hit(origin, inverse(ray)),
          index = y * 144 + x;
        assert.equal(frame.owner[index] >= 0, !!h, "coverage at " + index);
        if (!h) continue;
        count++;
        const n = m.lambertRotateY(m.lambertRotateX(h.normal, scene.pitch), scene.yaw);
        const cosine = n.x * light.x + n.y * light.y + n.z * light.z,
          intensity = Math.min(1, scene.ambient + scene.diffuseStrength * Math.max(0, cosine));
        assert.ok(Math.abs(frame.depth[index] - 1 / h.t) < 1e-8);
        assert.deepEqual(
          [...frame.pixels.slice(index * 4, index * 4 + 3)],
          [100, 180, 240].map((base) => Math.round(base * intensity)),
        );
      }
    assert.ok(count > 300);
  }
});
async function handlerHarness(stage = 7) {
  const captured = new Set();
  const canvas = {
    focus() {},
    setPointerCapture: (id) => captured.add(id),
    hasPointerCapture: (id) => captured.has(id),
    releasePointerCapture: (id) => captured.delete(id),
    getBoundingClientRect: () => ({ left: 10, top: 20, width: 480, height: 320 }),
  };
  const env = {
    ...s,
    stage,
    current: { current: s.initialLambertScene(stage) },
    drag: { current: null },
    canvasRef: { current: canvas },
    reducedMotion: false,
  };
  env.commit = (next) => {
    env.current.current = next;
  };
  for (const name of ["cancel", "pause", "change", "reset", "step", "down", "move", "up", "key"])
    env[name] = await componentCallback("lambert-lab.tsx", name, env);
  env.pointerCancel = await canvasCallback("lambert-lab.tsx", "onPointerCancel", env);
  env.lostCapture = await canvasCallback("lambert-lab.tsx", "onLostPointerCapture", env);
  return {
    ...env,
    canvas,
    captured,
    event: (x, y, extra = {}) => ({
      clientX: x,
      clientY: y,
      pointerId: 1,
      isPrimary: true,
      button: 0,
      buttons: 1,
      pointerType: "mouse",
      currentTarget: canvas,
      preventDefault() {},
      ...extra,
    }),
  };
}
test("Lambert actual pointer keeps owner, uses final up position and handles failed capture", async () => {
  const h = await handlerHarness();
  h.down(h.event(100, 100));
  h.move(h.event(110, 105, { pointerId: 2 }));
  assert.equal(h.current.current.yaw, 0.6);
  h.move(h.event(110, 105));
  h.up(h.event(120, 110, { buttons: 0 }));
  assert.ok(Math.abs(h.current.current.yaw - (0.6 + 40 * 0.008)) < 1e-12);
  assert.equal(h.drag.current, null);
  assert.equal(h.captured.size, 0);
  h.canvas.setPointerCapture = () => {
    throw Error("capture denied");
  };
  assert.doesNotThrow(() => h.down(h.event(100, 100)));
  assert.equal(h.drag.current, null);
});
test("Lambert actual cancel/reset never lets a stale pointer mutate the next state", async () => {
  const h = await handlerHarness();
  h.down(h.event(100, 100));
  h.pointerCancel(h.event(0, 0, { pointerId: 2 }));
  assert.ok(h.drag.current);
  h.move(h.event(100, 100, { buttons: 0 }));
  assert.equal(h.drag.current, null);
  h.down(h.event(100, 100));
  h.reset();
  const reset = h.current.current;
  h.up(h.event(200, 200, { buttons: 0 }));
  assert.equal(h.current.current, reset);
  assert.equal(h.captured.size, 0);
  h.down(h.event(100, 100));
  h.lostCapture(h.event(0, 0));
  assert.equal(h.drag.current, null);
  h.down(h.event(NaN, 100));
  assert.equal(h.drag.current, null);
});
test("Lambert actual keyboard leaves Tab/modifiers free and respects reduced motion/stage", async () => {
  const h = await handlerHarness();
  let prevented = 0;
  h.key({
    key: "Tab",
    preventDefault() {
      prevented++;
    },
  });
  h.key({
    key: "r",
    ctrlKey: true,
    preventDefault() {
      prevented++;
    },
  });
  assert.equal(prevented, 0);
  h.key({ key: "m", repeat: false, preventDefault() {} });
  assert.equal(h.current.current.target, "camera");
  h.key({
    key: "ArrowRight",
    preventDefault() {
      prevented++;
    },
  });
  assert.equal(h.current.current.yaw, 0.6);
  assert.ok(h.current.current.cameraYaw > 0);
  const early = await handlerHarness(1);
  early.key({ key: "m", preventDefault() {} });
  early.key({ key: " ", preventDefault() {} });
  assert.equal(early.current.current.target, "model");
  assert.equal(early.current.current.paused, true);
  const reduced = await handlerHarness();
  reduced.reducedMotion = true;
  const key = await componentCallback("lambert-lab.tsx", "key", reduced);
  key({ key: " ", preventDefault() {} });
  assert.equal(reduced.current.current.paused, true);
  reduced.step();
  assert.ok(reduced.current.current.lightAzimuth > 0.6);
});
test("Lambert actual lifecycle releases capture and removes its listeners", async () => {
  const h = await handlerHarness(),
    added = new Map(),
    removed = [];
  h.down(h.event(100, 100));
  const target = {
    addEventListener: (k, f) => added.set(k, f),
    removeEventListener: (k) => removed.push(k),
  };
  const effect = await componentEffect("lambert-lab.tsx", "visibilitychange", {
    pause: h.pause,
    cancel: h.cancel,
    window: target,
    document: { ...target, hidden: true },
  });
  const cleanup = effect();
  added.get("visibilitychange")();
  assert.equal(h.drag.current, null);
  assert.equal(h.captured.size, 0);
  h.down(h.event(100, 100));
  cleanup();
  assert.equal(h.captured.size, 0);
  assert.deepEqual(removed.sort(), ["blur", "visibilitychange"]);
});
test("Lambert orbit stays in the slider domain across the angle seam", () => {
  let scene = { ...s.initialLambertScene(), lightAzimuth: Math.PI - 0.001, paused: false };
  for (let i = 0; i < 1000; i++) {
    scene = s.advanceLambert(scene, 1 / 30, 7);
    assert.ok(scene.lightAzimuth >= -Math.PI && scene.lightAzimuth <= Math.PI);
  }
});
