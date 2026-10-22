import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyNearTriangle,
  clipNearTriangle,
  finiteNearVertex,
  intersectNearPlane,
  maximumNearViolation,
  nearTriangleAreaSquared,
  nearTriangleVertices,
  nearVertexIsInside,
  projectNearVertex,
  projectNearTriangle,
  traceNearPlaneClip,
  triangulateNearPolygon,
} from "../lib/labs/near-plane.ts";
import {
  initialNearScene,
  nearStage,
  nearPresets,
  nearPresetTriangle,
  nearCameraTriangle,
  nearFrame,
  editNearDepth,
  editNearPlane,
  editNearCamera,
  stepNearSweep,
  advanceNearScene,
  nearLogicalHeight,
  nearGridLines,
} from "../lib/labs/near-plane-scene.ts";
import { componentCallback, componentEffect, canvasCallback } from "./lab-handler-support.mjs";
const close = (a, b, epsilon = 1e-10) => assert.ok(Math.abs(a - b) <= epsilon, a + " != " + b);
const v = (x, y, z, red = 0) => ({ position: { x, y, z }, color: { red, green: 0, blue: 0 } });
const t = (a, b, c) => ({ a, b, c });
const area = (polygon) =>
  triangulateNearPolygon(polygon).reduce(
    (sum, triangle) => sum + Math.sqrt(nearTriangleAreaSquared(triangle)) / 2,
    0,
  );

test("P18 exact half-space agrees with projection; epsilon only labels on-plane", () => {
  const outside = v(0, 0, 1 - 0.5e-9),
    inside = v(1, 0, 2),
    upper = v(0, 1, 2);
  const input = t(outside, inside, upper);
  assert.equal(nearVertexIsInside(outside, 1), false);
  assert.deepEqual(classifyNearTriangle(input, 1), {
    inside: 2,
    outside: 1,
    onPlane: 1,
    valid: true,
  });
  assert.equal(projectNearVertex(outside, Math.PI / 3, 1, 1), undefined);
  const polygon = clipNearTriangle(input, 1);
  for (const triangle of triangulateNearPolygon(polygon))
    assert.ok(projectNearTriangle(triangle, Math.PI / 3, 1, 1));
  assert.equal(maximumNearViolation(polygon, 1), 0);
  assert.equal(nearVertexIsInside(v(0, 0, 1), 1), true);
});

test("P18 segment hit uses one real t for position and attributes, without fake parallel hits", () => {
  const a = v(-2, 0, 0.5, 0),
    b = v(2, 2, 1.5, 100);
  const hit = intersectNearPlane(a, b, 1);
  close(hit.t, 0.5);
  assert.deepEqual(hit.vertex, {
    position: { x: 0, y: 1, z: 1 },
    color: { red: 50, green: 0, blue: 0 },
  });
  assert.deepEqual(intersectNearPlane(b, a, 1).vertex, hit.vertex);
  assert.equal(intersectNearPlane(v(0, 0, 0.5), v(1, 1, 0.5), 1), undefined);
  assert.equal(intersectNearPlane(v(0, 0, 2), v(1, 1, 3), 1), undefined);
  const endpoint = v(0, 0, 1);
  assert.deepEqual(intersectNearPlane(endpoint, b, 1).vertex, endpoint);
  assert.notEqual(intersectNearPlane(endpoint, b, 1).vertex, endpoint);
  const tiny = 2 ** -42;
  const smallHit = intersectNearPlane(v(-1, 0, 1 - tiny), v(1, 0, 1 + tiny, 100), 1);
  close(smallHit.t, 0.5);
  close(smallHit.vertex.position.x, 0);
  close(smallHit.vertex.color.red, 50);
});

test("P18 all topologies preserve boundary order, area and input immutability", () => {
  for (const [preset, vertexCount, triangleCount] of [
    ["inside", 3, 1],
    ["one-out", 4, 2],
    ["two-out", 3, 1],
    ["outside", 0, 0],
    ["on-plane", 3, 1],
  ]) {
    const input = nearPresetTriangle(preset),
      before = structuredClone(input);
    const polygon = clipNearTriangle(input, 1);
    assert.equal(polygon.length, vertexCount, preset);
    assert.equal(triangulateNearPolygon(polygon).length, triangleCount, preset);
    assert.deepEqual(input, before);
    assert.equal(maximumNearViolation(polygon, 1), 0);
    assert.deepEqual(
      clipNearTriangle(
        { a: polygon[0] ?? input.a, b: polygon[1] ?? input.b, c: polygon[2] ?? input.c },
        1,
      ).every(finiteNearVertex),
      true,
    );
    for (let i = 0; i < polygon.length; i++) {
      if (polygon.length > 1)
        assert.notDeepEqual(polygon[i].position, polygon[(i + 1) % polygon.length].position);
    }
  }
  const base = t(v(0, 0, 0.5), v(2, 0, 1.5), v(0, 2, 1.5));
  const fullArea = Math.sqrt(nearTriangleAreaSquared(base)) / 2;
  close(area(clipNearTriangle(base, 1)) / fullArea, 0.75);
  const twoOut = t(v(0, 0, 1.5), v(2, 0, 0.5), v(0, 2, 0.5));
  close(area(clipNearTriangle(twoOut, 1)) / (Math.sqrt(nearTriangleAreaSquared(twoOut)) / 2), 0.25);
  const vertices = nearTriangleVertices(base);
  for (const indices of [
    [0, 1, 2],
    [0, 2, 1],
    [1, 0, 2],
    [1, 2, 0],
    [2, 0, 1],
    [2, 1, 0],
  ]) {
    close(area(clipNearTriangle(t(...indices.map((i) => vertices[i])), 1)), fullArea * 0.75);
  }
});

test("P18 point/edge contact does not create degenerate fan triangles", () => {
  const point = clipNearTriangle(t(v(0, 0, 1), v(1, 0, 0.5), v(0, 1, 0.5)), 1);
  const edge = clipNearTriangle(t(v(0, 0, 1), v(1, 0, 1), v(0, 1, 0.5)), 1);
  assert.equal(point.length, 1);
  assert.equal(edge.length, 2);
  assert.equal(triangulateNearPolygon(point).length, 0);
  assert.equal(triangulateNearPolygon(edge).length, 0);
  assert.equal(triangulateNearPolygon([v(0, 0, 1), v(1, 1, 1), v(2, 2, 1)]).length, 0);
  assert.equal(triangulateNearPolygon(Array.from({ length: 5 }, () => v(0, 0, 1))).length, 0);
  const input = nearPresetTriangle("on-plane");
  assert.deepEqual(clipNearTriangle(input, 1), nearTriangleVertices(input));
  const result = clipNearTriangle(nearPresetTriangle("one-out"), 1);
  const reclipped = triangulateNearPolygon(result).flatMap((triangle) =>
    triangulateNearPolygon(clipNearTriangle(triangle, 1)),
  );
  close(
    reclipped.reduce((sum, triangle) => sum + Math.sqrt(nearTriangleAreaSquared(triangle)) / 2, 0),
    area(result),
  );
});

test("P18 invalid values fail closed before projection and bounded raster allocation", () => {
  const input = nearPresetTriangle("inside");
  for (const value of [NaN, Infinity, -1, 0]) {
    assert.equal(classifyNearTriangle(input, value).valid, false);
    assert.deepEqual(clipNearTriangle(input, value), []);
    assert.equal(projectNearTriangle(input, Math.PI / 3, 1, value), undefined);
  }
  const invalid = structuredClone(input);
  invalid.b.color.red = NaN;
  assert.equal(classifyNearTriangle(invalid, 1).valid, false);
  assert.equal(intersectNearPlane(invalid.a, invalid.b, 1), undefined);
  assert.deepEqual(traceNearPlaneClip(invalid, 1), []);
  for (const fov of [NaN, Infinity, 0, Math.PI])
    assert.equal(projectNearVertex(input.a, fov, 1, 1), undefined);
  for (const aspect of [NaN, Infinity, 0, -1])
    assert.equal(projectNearVertex(input.a, 1, aspect, 1), undefined);
  for (const [width, height] of [
    [Infinity, 60],
    [80, NaN],
    [0, 60],
    [221, 60],
    [80, 161],
    [80.5, 60],
  ]) {
    assert.equal(nearFrame(initialNearScene(), 8, width, height).fragments.length, 0);
  }
});

test("P18 scene gates reveal a working baseline before clipping is taught", () => {
  assert.deepEqual(
    [
      "near-scene",
      "near-classify",
      "near-intersection",
      "near-polygon",
      "near-triangulate",
      "near-raster",
      "near-validation",
      "near-showcase",
    ].map(nearStage),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  const s = initialNearScene(1);
  assert.equal(s.preset, "inside");
  assert.ok(nearFrame(s, 1).covered > 0);
  for (let stage = 1; stage <= 5; stage++)
    assert.equal(nearFrame(initialNearScene(stage, "one-out"), stage).covered, 0);
  const final = initialNearScene(8);
  assert.equal(final.preset, "one-out");
  assert.equal(nearFrame(final, 8).rendered, 2);
  assert.ok(nearFrame(final, 8).covered > 0);
  assert.equal(nearFrame({ ...final, policy: "discard" }, 8).covered, 0);
  assert.deepEqual(nearPresetTriangle("one-out"), nearCameraTriangle(final));
  assert.equal(nearFrame(editNearDepth(final, -4), 8).covered, 0);
  assert.ok(
    nearTriangleVertices(nearCameraTriangle(editNearDepth(final, -4))).every(
      (v) => v.position.z < 0,
    ),
  );
  assert.equal(nearLogicalHeight({ ...final, debug: false }), 800);
  assert.ok(nearGridLines({ ...final, debug: false }).length > 0);
});

test("P18 sweep crosses the camera with finite topology, bounded pixel loops and no diagonal overdraw", () => {
  for (let i = 0; i <= 600; i++) {
    const scene = { ...initialNearScene(), depthOffset: -4 + (7 * i) / 600 };
    const polygon = clipNearTriangle(nearCameraTriangle(scene), scene.nearPlane);
    assert.ok(polygon.length <= 4);
    assert.equal(maximumNearViolation(polygon, scene.nearPlane), 0);
    for (const triangle of triangulateNearPolygon(polygon))
      assert.ok(projectNearTriangle(triangle, Math.PI / 3, 11 / 6, 1));
  }
  const frame = nearFrame(initialNearScene(), 8, 80, 60);
  assert.ok(frame.covered > 0);
  assert.ok(frame.candidates <= 2 * 80 * 60);
  assert.equal(new Set(frame.fragments.map((p) => p.x + "," + p.y)).size, frame.covered);
  for (const pixel of frame.fragments)
    assert.ok(
      Object.values(pixel.color).every((c) => Number.isFinite(c) && c >= -1e-8 && c <= 255 + 1e-8),
    );
});

// Independent oracle: intersect a camera ray with the ORIGINAL triangle, not the clipped polygon.
function rayHit(source, direction) {
  const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  const cross = (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  });
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const a = source.a.position,
    ab = sub(source.b.position, a),
    ac = sub(source.c.position, a);
  const p = cross(direction, ac),
    determinant = dot(ab, p);
  if (Math.abs(determinant) < 1e-12) return null;
  const origin = { x: -a.x, y: -a.y, z: -a.z };
  const u = dot(origin, p) / determinant,
    q = cross(origin, ab);
  const w = dot(direction, q) / determinant,
    z = dot(ac, q) / determinant;
  return { u, w, z };
}
test("P18 actual raster mask matches independent ray/triangle clipping oracle", () => {
  const scene = initialNearScene(),
    frame = nearFrame(scene, 8, 80, 60);
  const mask = new Set(frame.fragments.map((p) => p.x + "," + p.y));
  const focal = 1 / Math.tan(Math.PI / 6);
  let compared = 0;
  for (let y = 0; y < 60; y++)
    for (let x = 0; x < 80; x++) {
      const ray = {
        x: ((((x + 0.5) / 80) * 2 - 1) * (80 / 60)) / focal,
        y: (1 - ((y + 0.5) / 60) * 2) / focal,
        z: 1,
      };
      const hit = rayHit(frame.source, ray);
      if (!hit) continue;
      if ([hit.u, hit.w, 1 - hit.u - hit.w, hit.z - 1].some((value) => Math.abs(value) < 1e-8))
        continue;
      const expected = hit.u > 0 && hit.w > 0 && hit.u + hit.w < 1 && hit.z >= 1;
      assert.equal(mask.has(x + "," + y), expected, "sample " + x + "," + y);
      compared++;
    }
  assert.ok(compared > 4500);
});

test("P18 dt movement, sweep bounds, manual reduced-motion controls and camera edit are separate", () => {
  const original = initialNearScene();
  for (const fps of [30, 60, 144]) {
    let s = original;
    for (let i = 0; i < fps; i++) s = advanceNearScene(s, 1 / fps, 1);
    close(s.depthOffset, 1);
  }
  const moving = { ...original, paused: false };
  close(advanceNearScene(moving, 0.02).depthOffset, 0.015);
  assert.equal(advanceNearScene(original, 0.02), original);
  for (const dt of [NaN, Infinity, -1]) assert.equal(advanceNearScene(moving, dt), moving);
  assert.equal(editNearDepth(original, NaN), original);
  assert.equal(editNearDepth(original, -100).depthOffset, -4);
  assert.equal(editNearPlane(original, 0).nearPlane, 0.25);
  assert.equal(editNearCamera(original, "x", 100).camera.x, 1);
  const movedCamera = editNearCamera(original, "z", 0.3);
  assert.deepEqual(nearPresetTriangle(original.preset), nearPresetTriangle(movedCamera.preset));
  close(nearCameraTriangle(movedCamera).a.position.z, 0.15);
  const edge = stepNearSweep({ ...original, depthOffset: 2.99, direction: 1 });
  assert.equal(edge.depthOffset, 3);
  assert.equal(edge.direction, -1);
});

const file = "near-plane-lab.tsx";
async function harness(stage = 8) {
  let scene = initialNearScene(stage),
    captured = false,
    axis = 0;
  const canvas = {
    focus() {},
    setPointerCapture() {
      captured = true;
    },
    hasPointerCapture() {
      return captured;
    },
    releasePointerCapture() {
      captured = false;
    },
  };
  const env = {
    stage,
    canvasRef: { current: canvas },
    sceneRef: { current: scene },
    drag: { current: null },
    held: { current: { toward: false, away: false } },
    size: { width: 550, height: 400, dpr: 2 },
    reducedMotion: false,
    nearPresets,
    initialNearScene,
    editNearDepth,
    editNearPlane,
    editNearCamera,
    stepNearSweep,
    advanceNearScene,
    setHeldAxis: (value) => {
      axis = value;
    },
    setCaptured: (value) => {
      captured = value;
    },
    commit: (next) => {
      scene = next;
      env.sceneRef.current = next;
    },
    nearPointFromEvent: (event) => ({ x: event.clientX, y: event.clientY }),
  };
  const callbacks = {};
  for (const name of [
    "cancelPointer",
    "clearInput",
    "pauseForEnvironment",
    "reset",
    "editDepth",
    "editPlane",
    "editCamera",
    "setPolicy",
    "togglePause",
    "step",
    "toggleDebug",
    "nextEdge",
    "movePointer",
    "onPointerDown",
    "onPointerMove",
    "onPointerUp",
    "onPointerCancel",
    "onKeyDown",
    "onKeyUp",
  ]) {
    callbacks[name] = await componentCallback(file, name, { ...env, ...callbacks });
    env[name] = callbacks[name];
  }
  return {
    env,
    callbacks,
    canvas,
    get scene() {
      return scene;
    },
    get captured() {
      return captured;
    },
    get axis() {
      return axis;
    },
  };
}
const pointer = (h, extra = {}) => ({
  currentTarget: h.canvas,
  pointerId: 1,
  isPrimary: true,
  button: 0,
  buttons: 1,
  pointerType: "mouse",
  clientX: 100,
  clientY: 100,
  preventDefault() {},
  ...extra,
});
const keyboard = (key, extra = {}) => ({ key, repeat: false, preventDefault() {}, ...extra });

test("P18 actual pointer callback owns one primary pointer and consumes final up coordinates", async () => {
  const h = await harness(),
    c = h.callbacks,
    old = structuredClone(h.scene);
  c.onPointerDown(pointer(h));
  assert.equal(h.captured, true);
  assert.deepEqual(h.scene, old);
  c.onPointerMove(pointer(h, { pointerId: 2, clientX: 200 }));
  c.onPointerUp(pointer(h, { pointerId: 2, clientX: 200, buttons: 0 }));
  assert.deepEqual(h.scene, old);
  assert.equal(h.captured, true);
  c.onPointerMove(pointer(h, { clientX: 150 }));
  close(h.scene.depthOffset, 0.6);
  c.onPointerUp(pointer(h, { clientX: 160, buttons: 0 }));
  close(h.scene.depthOffset, 0.72);
  assert.equal(h.captured, false);
  assert.deepEqual(h.scene.camera, old.camera);
  assert.deepEqual(nearPresetTriangle(h.scene.preset), nearPresetTriangle(old.preset));
});

test("P18 actual input lifecycle rejects secondary/capture failure and cancels stale pointer state", async () => {
  const h = await harness(),
    c = h.callbacks;
  c.onPointerDown(pointer(h, { isPrimary: false }));
  c.onPointerDown(pointer(h, { button: 2 }));
  assert.equal(h.env.drag.current, null);
  h.canvas.setPointerCapture = () => {
    throw Error("capture unavailable");
  };
  c.onPointerDown(pointer(h));
  assert.equal(h.env.drag.current, null);
  h.canvas.setPointerCapture = () => {};
  for (const action of [
    () => c.reset("outside"),
    () => c.editDepth(0.5),
    () => c.editPlane(0.8),
    () => c.editCamera("x", 0.2),
    () => c.setPolicy("discard"),
    c.step,
    c.toggleDebug,
    c.pauseForEnvironment,
  ]) {
    c.onPointerDown(pointer(h));
    action();
    assert.equal(h.env.drag.current, null);
    assert.equal(h.captured, false);
    const before = h.scene;
    c.onPointerUp(pointer(h, { clientX: 200, buttons: 0 }));
    assert.equal(h.scene, before);
  }
  c.onPointerDown(pointer(h));
  c.onPointerMove(pointer(h, { buttons: 0 }));
  assert.equal(h.env.drag.current, null);
});

test("P18 actual keyboard uses held state, honors release, modifiers, repeat and stage gates", async () => {
  const h = await harness(),
    c = h.callbacks;
  c.onKeyDown(keyboard("d"));
  assert.equal(h.axis, 1);
  assert.equal(h.scene.depthOffset, 0);
  c.onKeyDown(keyboard("a"));
  assert.equal(h.axis, 0);
  c.onKeyUp(keyboard("D", { ctrlKey: true }));
  assert.equal(h.axis, -1);
  c.pauseForEnvironment();
  assert.equal(h.axis, 0);
  const before = h.scene;
  c.onKeyDown(keyboard("w", { ctrlKey: true }));
  c.onKeyDown(keyboard("Tab"));
  assert.equal(h.scene, before);
  c.onKeyDown(keyboard("v", { repeat: true }));
  assert.equal(h.scene.policy, "clip");
  c.onKeyDown(keyboard("v"));
  assert.equal(h.scene.policy, "discard");
  c.onKeyDown(keyboard("4"));
  c.reset();
  assert.equal(h.scene.preset, "outside");
  const early = await harness(1);
  early.callbacks.togglePause();
  early.callbacks.setPolicy("clip");
  early.callbacks.editCamera("x", 0.3);
  assert.equal(early.scene.paused, true);
  assert.equal(early.scene.policy, "discard");
  assert.equal(early.scene.camera.x, 0);
});

test("P18 actual RAF rechecks live pause/held input, caps dt and disposes scheduling", async () => {
  const h = await harness(),
    queue = new Map();
  let id = 0;
  h.callbacks.togglePause();
  const effect = await componentEffect(file, "requestAnimationFrame", {
    ...h.env,
    scene: h.scene,
    heldAxis: 0,
    performance: { now: () => 0 },
    requestAnimationFrame: (callback) => {
      queue.set(++id, callback);
      return id;
    },
    cancelAnimationFrame: (key) => queue.delete(key),
  });
  const cleanup = effect();
  queue.get(1)(1000);
  close(h.scene.depthOffset, 0.0375);
  h.callbacks.pauseForEnvironment();
  queue.get(2)(1100);
  assert.equal(queue.size, 2);
  close(h.scene.depthOffset, 0.0375);
  cleanup();
  assert.equal(queue.has(2), false);
  const reduced = await harness();
  const manual = await componentCallback(file, "togglePause", {
    ...reduced.env,
    reducedMotion: true,
  });
  manual();
  assert.equal(reduced.scene.paused, true);
  reduced.callbacks.step();
  close(reduced.scene.depthOffset, 0.08);
});

test("P18 actual environment listeners clear keys/capture and remove listeners", async () => {
  const h = await harness(),
    listeners = new Map();
  const target = {
    addEventListener: (name, fn) => listeners.set(name, fn),
    removeEventListener: (name, fn) => {
      assert.equal(listeners.get(name), fn);
      listeners.delete(name);
    },
  };
  const doc = { ...target, hidden: true };
  const effect = await componentEffect(file, "visibilitychange", {
    ...h.env,
    window: target,
    document: doc,
  });
  const cleanup = effect();
  h.callbacks.onPointerDown(pointer(h));
  listeners.get("visibilitychange")();
  assert.equal(h.captured, false);
  h.callbacks.onKeyDown(keyboard("d"));
  listeners.get("blur")();
  assert.equal(h.axis, 0);
  assert.equal(h.scene.paused, true);
  cleanup();
  assert.equal(listeners.size, 0);
});

test("P18 actual letterbox coordinate conversion is DPR-independent and rejects HUD", async () => {
  const layout = (size) => {
    const scale = Math.min(size.width / 1100, size.height / 800);
    return { scale, x: (size.width - 1100 * scale) / 2, y: (size.height - 800 * scale) / 2 };
  };
  const actual = await componentCallback("near-plane-view.ts", "nearPointFromEvent", {
    layout,
    nearLogicalHeight,
  });
  const event = {
    clientX: 275,
    clientY: 150,
    currentTarget: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 550, height: 400 }) },
  };
  assert.deepEqual(actual(event, { width: 550, height: 400, dpr: 1 }, initialNearScene()), {
    x: 550,
    y: 300,
  });
  assert.deepEqual(actual(event, { width: 550, height: 400, dpr: 2 }, initialNearScene()), {
    x: 550,
    y: 300,
  });
  assert.equal(
    actual({ ...event, clientY: 350 }, { width: 550, height: 400, dpr: 2 }, initialNearScene()),
    null,
  );
  assert.ok(
    actual(
      { ...event, clientY: 350 },
      { width: 550, height: 400, dpr: 2 },
      { ...initialNearScene(), debug: false },
    ),
  );
});

test("P18 actual Canvas renderer retains world grid and RGB surface when debug is hidden", async () => {
  const lines = [],
    texts = [],
    draws = [];
  const rasterContext = {
    createImageData: (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: (image) => draws.push(image),
  };
  const canvas = {
    ownerDocument: {
      createElement: () => ({ width: 0, height: 0, getContext: () => rasterContext }),
    },
  };
  const ctx = {
    canvas,
    save() {},
    restore() {},
    translate() {},
    scale() {},
    fillRect() {},
    beginPath() {},
    rect() {},
    clip() {},
    drawImage() {},
    strokeRect() {},
    arc() {},
    fill() {},
    fillText: (text) => texts.push(text),
  };
  const draw = await componentCallback("near-plane-view.ts", "drawNearLab", {
    setupCanvas() {},
    layout: () => ({ x: 0, y: 0, scale: 0.5 }),
    nearLogicalHeight,
    nearGridLines,
    drawLine: (ctx, a, b, color) => lines.push({ a, b, color }),
    nearTriangleVertices,
    nearCssColor: () => "#ffffff",
    rasterCanvases: new WeakMap(),
  });
  const clean = { ...initialNearScene(), debug: false };
  draw(ctx, { width: 550, height: 400, dpr: 2 }, clean, 8, nearFrame(clean, 8));
  assert.ok(lines.some((line) => line.color === "#28334d"));
  assert.equal(texts.length, 0);
  assert.ok(draws[0].data.some((value, index) => index % 4 === 3 && value === 255));
  lines.length = 0;
  draw(
    ctx,
    { width: 550, height: 400, dpr: 2 },
    initialNearScene(),
    8,
    nearFrame(initialNearScene(), 8),
  );
  assert.ok(texts.some((text) => text.includes("Mặt cắt ZX")));
  assert.ok(lines.some((line) => line.color === "#53f0ae"));
});

test("P18 leaving the Canvas for its pause button clears input without reversing the intended toggle", async () => {
  const h = await harness();
  h.callbacks.togglePause();
  assert.equal(h.scene.paused, false);
  const blur = await canvasCallback(file, "onBlur", h.env);
  blur();
  assert.equal(
    h.scene.paused,
    false,
    "window blur pauses; moving focus to a control must not invert its action",
  );
  h.callbacks.togglePause();
  assert.equal(h.scene.paused, true);
});
