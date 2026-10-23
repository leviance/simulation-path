import assert from "node:assert/strict";
import test from "node:test";
import * as math from "../lib/labs/perspective-texture.ts";
import * as lab from "../lib/labs/texture-scene.ts";
import { componentCallback } from "./lab-handler-support.mjs";
const file = "perspective-texture-lab.tsx";
const near = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} != ${b}`);
const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a, b) => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

// Generic plane + orthogonal edge basis: not the local inverse transform in referenceTextureUv.
function planeOracle(quad, x, y, width, height) {
  const a = quad.vertices[0].position;
  const horizontal = sub(quad.vertices[1].position, a),
    vertical = sub(quad.vertices[3].position, a);
  const normal = cross(horizontal, vertical);
  const f = (height * 0.5) / Math.tan(Math.PI / 6);
  const direction = { x: (x + 0.5 - width * 0.5) / f, y: (height * 0.5 - y - 0.5) / f, z: 1 };
  const t = dot(normal, a) / dot(normal, direction);
  if (!Number.isFinite(t) || t < 1) return;
  const point = sub({ x: direction.x * t, y: direction.y * t, z: t }, a);
  const uv = {
    x: dot(point, horizontal) / dot(horizontal, horizontal),
    y: 1 - dot(point, vertical) / dot(vertical, vertical),
  };
  if (uv.x >= 0 && uv.x <= 1 && uv.y >= 0 && uv.y <= 1) return uv;
}

test("P20 rotates a rigid rectangle, not one stretched edge", () => {
  for (let preset = 1; preset <= 4; preset++) {
    const s = lab.presetTexture(lab.initialTextureScene(), preset);
    const q = math.makeTextureQuad(s.yaw, s.pitch, s.distance);
    near(
      Math.sqrt(
        dot(
          sub(q.vertices[1].position, q.vertices[0].position),
          sub(q.vertices[1].position, q.vertices[0].position),
        ),
      ),
      3.2,
    );
    near(
      Math.sqrt(
        dot(
          sub(q.vertices[3].position, q.vertices[0].position),
          sub(q.vertices[3].position, q.vertices[0].position),
        ),
      ),
      2,
    );
    assert.deepEqual(
      q.vertices.map((v) => v.uv),
      [
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: 0 },
        { x: 0, y: 0 },
      ],
    );
  }
});
test("P20 sampler has fixed contrast and defined boundary addressing", () => {
  assert.deepEqual(math.nearestTextureTexel({ x: 1, y: 1 }, 64, 64, "clamp"), { x: 63, y: 63 });
  assert.deepEqual(math.nearestTextureTexel({ x: 1, y: 1 }, 64, 64, "repeat"), { x: 0, y: 0 });
  assert.deepEqual(math.nearestTextureTexel({ x: -0.1, y: 1.1 }, 64, 64, "repeat"), {
    x: 57,
    y: 6,
  });
  assert.deepEqual(math.checkerTextureColor({ x: 0.01, y: 0.01 }, "clamp"), [236, 240, 248]);
  assert.deepEqual(math.checkerTextureColor({ x: 0.15, y: 0.01 }, "clamp"), [38, 48, 72]);
  assert.equal(math.addressTextureCoordinate(NaN, "clamp"), 0);
});
test("P20 clipped shared edge preserves identical XYZ and UV in either direction", () => {
  const a = { position: { x: -1, y: 0, z: 0.5 }, uv: { x: 0, y: 1 } },
    b = { position: { x: 1, y: 1, z: 3 }, uv: { x: 1, y: 0 } };
  const hit = math.intersectTextureNearPlane(a, b, 1),
    reverse = math.intersectTextureNearPlane(b, a, 1);
  near(hit.t, 0.2);
  near(hit.vertex.uv.x, 0.2);
  near(hit.vertex.uv.y, 0.8);
  assert.equal(hit.vertex.position.z, 1);
  assert.deepEqual(hit.vertex, reverse.vertex);
  const polygon = math.clipTextureTriangleNearPlane([
    a,
    b,
    { position: { x: 0, y: 1, z: 2 }, uv: { x: 0.5, y: 0 } },
  ]);
  assert.equal(polygon.length, 4);
  assert.ok(polygon.every((v) => v.position.z >= 1));
  assert.equal(
    math.projectTextureVertex(
      { position: { x: 0, y: 0, z: 1 - 1e-10 }, uv: { x: 0, y: 0 } },
      200,
      150,
    ),
    undefined,
  );
});
test("P20 frame UV, RGB and coverage agree with independent world-plane oracle for four presets", () => {
  for (let preset = 1; preset <= 4; preset++) {
    const s = lab.presetTexture(lab.initialTextureScene(), preset),
      width = 120,
      height = 90;
    const q = math.makeTextureQuad(s.yaw, s.pitch, s.distance);
    const frame = lab.textureFrame(s, 8, width, height, true),
      affine = lab.textureFrame(s, 8, width, height, false);
    let covered = 0,
      maxError = 0;
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const p = y * width + x,
          expected = planeOracle(q, x, y, width, height);
        assert.equal(frame.owners[p], expected ? 1 : 0, `pose ${preset}, pixel ${x},${y}`);
        assert.equal(affine.owners[p], frame.owners[p]);
        if (!expected) continue;
        covered++;
        near(frame.uv[p * 2], expected.x);
        near(frame.uv[p * 2 + 1], expected.y);
        const reference = lab.referenceTextureUv(s, { x: x + 0.5, y: y + 0.5 }, width, height);
        assert.ok(reference);
        near(reference.x, expected.x);
        near(reference.y, expected.y);
        maxError = Math.max(
          maxError,
          Math.hypot(affine.uv[p * 2] - expected.x, affine.uv[p * 2 + 1] - expected.y),
        );
        const cx = expected.x * 8,
          cy = expected.y * 8;
        if (Math.abs(cx - Math.round(cx)) > 1e-8 && Math.abs(cy - Math.round(cy)) > 1e-8) {
          const color =
            (Math.floor(cx) + Math.floor(cy)) % 2 === 0 ? [236, 240, 248] : [38, 48, 72];
          assert.deepEqual(Array.from(frame.pixels.slice(p * 4, p * 4 + 4)), [...color, 255]);
        }
      }
    assert.ok(covered > 100);
    if (preset === 1) assert.ok(maxError < 1e-9);
    if (preset === 3) assert.ok(maxError > 0.1);
  }
});
test("P20 stage gating keeps early lessons honest and inspector on actual pixel center", () => {
  for (let stage = 1; stage <= 8; stage++) {
    const s = lab.initialTextureScene(stage),
      frame = lab.textureFrame(s, stage, 160, 120, stage >= 6);
    if (stage < 3) assert.ok(frame.owners.every((v) => v === 0));
    if (stage < 4) assert.equal(frame.inspection, undefined);
    else {
      const i = frame.inspection;
      assert.ok(i);
      assert.deepEqual(i.pixel, { x: 80.5, y: 60.5 });
      near(i.weights.a + i.weights.b + i.weights.c, 1);
      assert.equal(i.correctedUv !== undefined, stage >= 6);
      assert.equal(i.denominator !== undefined, stage >= 5);
    }
  }
  const s = { ...lab.initialTextureScene(), sample: { x: 0, y: 0 } };
  assert.equal(lab.textureFrame(s, 8, 160, 120, true).inspection, undefined);
});
test("P20 pause and bounded deterministic stepping do not snap manual pose back to default", () => {
  const initial = lab.tiltTexture(lab.initialTextureScene(), 1, 0);
  assert.equal(lab.advanceTexture(initial, 1), initial);
  const next = lab.advanceTexture({ ...initial, paused: false }, 1 / 60);
  near(next.phase, 1 / 60);
  assert.ok(Math.abs(next.yaw - initial.yaw) < 0.01);
  const bounded = lab.advanceTexture({ ...initial, paused: false }, 1e6);
  near(bounded.phase, 0.05);
  assert.equal(lab.advanceTexture({ ...initial, paused: false }, NaN).phase, 0);
});

test("P20 actual pointer callbacks ignore secondary pointers, handle capture failure and use final up sample", async () => {
  let scene = lab.initialTextureScene();
  const drag = { current: null },
    current = { current: scene };
  const commit = (next) => {
    scene = next;
    current.current = next;
  };
  let captured = 0,
    focused = 0,
    canceled = 0,
    chosen = 0;
  const target = {
    focus() {
      focused++;
    },
    setPointerCapture() {
      captured++;
    },
  };
  const env = {
    stage: 8,
    target: "tilt",
    drag,
    current,
    commit,
    cancel: () => {
      canceled++;
      drag.current = null;
    },
    choosePoint: () => chosen++,
    tiltTexture: lab.tiltTexture,
  };
  const down = await componentCallback(file, "down", env),
    up = await componentCallback(file, "up", env),
    move = await componentCallback(file, "move", env);
  const e = {
    isPrimary: true,
    button: 0,
    pointerId: 1,
    clientX: 10,
    clientY: 10,
    currentTarget: target,
    pointerType: "mouse",
    buttons: 1,
  };
  down({ ...e, isPrimary: false });
  down({ ...e, button: 2 });
  assert.equal(captured, 0);
  down(e);
  assert.equal(captured, 1);
  assert.equal(focused, 1);
  move({ ...e, pointerId: 2, clientX: 100 });
  near(scene.yaw, -0.65);
  up({ ...e, clientX: 110 });
  near(scene.yaw, 0.15);
  assert.equal(canceled, 1);
  down({
    ...e,
    currentTarget: {
      ...target,
      setPointerCapture() {
        throw Error("capture denied");
      },
    },
  });
  assert.equal(drag.current, null);
  down(e);
  move({ ...e, buttons: 0 });
  assert.equal(drag.current, null);
  assert.equal(chosen, 0);
});
test("P20 actual keyboard callback preserves Tab/modifiers and gates future controls", async () => {
  for (const stage of [1, 5, 8]) {
    let state = lab.initialTextureScene(stage),
      prevented = 0,
      changed = 0;
    const current = { current: state },
      commit = (next) => {
        state = next;
        current.current = next;
        changed++;
      };
    const env = {
      stage,
      current,
      cancel() {},
      commit,
      change: commit,
      tiltTexture: lab.tiltTexture,
      presetTexture: lab.presetTexture,
      reducedMotion: false,
      reset: () => commit(lab.initialTextureScene(stage)),
      step: () =>
        commit({
          ...lab.advanceTexture({ ...current.current, paused: false }, 1 / 60, stage),
          paused: true,
        }),
    };
    const key = await componentCallback(file, "keyDown", env);
    const e = {
      key: "Tab",
      altKey: false,
      ctrlKey: false,
      metaKey: false,
      repeat: false,
      nativeEvent: { isComposing: false },
      preventDefault() {
        prevented++;
      },
    };
    key(e);
    key({ ...e, key: "m", ctrlKey: true });
    assert.equal(prevented, 0);
    assert.equal(changed, 0);
    key({ ...e, key: "m" });
    assert.equal(changed, stage >= 6 ? 1 : 0);
    key({ ...e, key: "ArrowRight" });
    assert.equal(state.preset, 0);
    near(state.yaw, -0.57);
  }
});
