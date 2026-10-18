import assert from "node:assert/strict";
import test from "node:test";
import {
  initialCamera,
  cameraScale,
  screenToWorld,
  worldToScreen,
  panCamera,
  zoomCameraAt,
  gridSpacing,
  gridValues,
  hitCoordinatePoint,
  beginCoordinateDrag,
  moveCoordinatePoint,
} from "../lib/labs/coordinate.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";

const near = (a, b) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-9, JSON.stringify([a, b]));
const size = { width: 960, height: 540, dpr: 2 };
const newScene = () => ({
  camera: { ...initialCamera },
  points: [{ x: 2, y: 1 }],
  selected: -1,
  grabOffset: { x: 0, y: 0 },
  draggingPoint: false,
});

test("Coordinate independent fixtures fix origin, units and Y direction before round-trip checks", () => {
  near(worldToScreen({ x: 2, y: 1 }, initialCamera, size), { x: 590, y: 215 });
  near(screenToWorld({ x: 590, y: 215 }, initialCamera, size), { x: 2, y: 1 });
  near(worldToScreen({ x: 2, y: 1 }, { x: 1, y: -1, zoom: 55 }, size), { x: 535, y: 160 });
  for (const zoom of [5, 20, 55, 160, 800])
    for (const x of [-120.5, 0, 29.3]) {
      const camera = { x, y: -17.8, zoom };
      for (let n = -20; n <= 20; n++) {
        const p = { x: n * 3.7, y: n * -2.3 + 1 };
        near(screenToWorld(worldToScreen(p, camera, size), camera, size), p);
        const q = { x: n * 11, y: n * 7.1 };
        near(worldToScreen(screenToWorld(q, camera, size), camera, size), q);
      }
    }
});

test("Coordinate pan follows pixel delta without rewriting world positions", () => {
  const next = panCamera(initialCamera, { x: 55, y: 27.5 });
  near(next, { x: -1, y: 0.5 });
  const a = worldToScreen({ x: 2, y: 1 }, initialCamera, size),
    b = worldToScreen({ x: 2, y: 1 }, next, size);
  near({ x: b.x - a.x, y: b.y - a.y }, { x: 55, y: 27.5 });
  assert.equal(panCamera(initialCamera, { x: NaN, y: 0 }), initialCamera);
});

test("Coordinate zoom keeps anchors through clamping and rejects invalid factors as a no-op", () => {
  for (const screen of [
    { x: 0, y: 0 },
    { x: 960, y: 540 },
    { x: 590, y: 215 },
    { x: 300, y: 490 },
  ]) {
    let camera = { ...initialCamera };
    for (const factor of [2, 1e100, 1e-100, 0.1, 1.12, 1 / 1.12]) {
      const before = screenToWorld(screen, camera, size);
      const result = zoomCameraAt(camera, screen, factor, size);
      near(screenToWorld(screen, result.camera, size), before);
      assert.ok(result.anchorError < 1e-9);
      assert.ok(result.camera.zoom >= 5 && result.camera.zoom <= 800);
      camera = result.camera;
    }
    for (const invalid of [0, -1, NaN, Infinity])
      assert.equal(zoomCameraAt(camera, screen, invalid, size).camera, camera);
  }
  const doubled = zoomCameraAt(initialCamera, { x: 590, y: 215 }, 2, size).camera;
  near(doubled, { x: 1, y: 0.5 });
  assert.equal(doubled.zoom, 110);
  for (const zoom of [0, -1, NaN, Infinity]) assert.equal(cameraScale({ x: 0, y: 0, zoom }), 55);
});

test("Coordinate grid uses readable 1-2-5 spacing, negative world coordinates and bounded work", () => {
  for (let zoom = 5; zoom <= 800; zoom += 0.5) {
    const h = gridSpacing(zoom);
    assert.ok(h * zoom >= 40 - 1e-9 && h * zoom <= 100 + 1e-9);
    const left = -17.3 - size.width / (2 * zoom);
    const right = -17.3 + size.width / (2 * zoom);
    const values = gridValues(left, right, h);
    assert.ok(values[0] >= left - 1e-9 && values[0] < left + h + 1e-9);
    for (let n = 1; n < values.length; n++)
      assert.ok(Math.abs(values[n] - values[n - 1] - h) < 1e-9);
  }
  assert.deepEqual(gridValues(-2.2, 1.2, 1), [-2, -1, 0, 1, 2]);
  assert.deepEqual(gridValues(0, 1e20, 0.01), []);
  assert.deepEqual(gridValues(NaN, 2, 1), []);
  assert.deepEqual(gridValues(0, 2, 0), []);
});

test("Coordinate point hit radius stays 10 px, overlap chooses topmost and grab offset prevents snapping", () => {
  let scene = newScene();
  for (const zoom of [5, 55, 800]) {
    const camera = { ...initialCamera, zoom };
    const p = worldToScreen(scene.points[0], camera, size);
    assert.equal(hitCoordinatePoint(scene.points, { x: p.x + 10, y: p.y }, camera, size), 0);
    assert.equal(hitCoordinatePoint(scene.points, { x: p.x + 10.01, y: p.y }, camera, size), -1);
  }
  scene.points.push({ ...scene.points[0] });
  assert.equal(hitCoordinatePoint(scene.points, { x: 590, y: 215 }, scene.camera, size), 1);
  scene = beginCoordinateDrag(scene, { x: 596, y: 212 }, size);
  near(scene.points[1], { x: 2, y: 1 });
  scene = moveCoordinatePoint(scene, { x: 651, y: 239.5 }, size);
  near(scene.points[1], { x: 3, y: 0.5 });
  near(scene.points[0], { x: 2, y: 1 });
  const points = scene.points;
  scene = { ...scene, draggingPoint: false };
  assert.equal(moveCoordinatePoint(scene, { x: 0, y: 0 }, size), scene);
  scene.camera = panCamera(scene.camera, { x: 55, y: 55 });
  scene.camera = zoomCameraAt(scene.camera, { x: 90, y: 80 }, 2, size).camera;
  assert.equal(scene.points, points);
  near(
    worldToScreen({ x: scene.camera.x, y: scene.camera.y }, scene.camera, {
      width: 1280,
      height: 720,
    }),
    { x: 640, y: 360 },
  );
  scene = beginCoordinateDrag(
    { ...scene, points: Array.from({ length: 256 }, () => ({ x: 0, y: 0 })) },
    { x: 0, y: 0 },
    size,
  );
  assert.equal(scene.points.length, 256);
  assert.equal(scene.draggingPoint, false);
});

test("Coordinate actual event-to-canvas mapping applies CSS scaling once, not DPR twice", async () => {
  const point = await componentCallback("coordinate-lab-view.ts", "coordinatePoint", {});
  const currentTarget = {
    getBoundingClientRect: () => ({ left: 30, top: 40, width: 480, height: 270 }),
  };
  assert.deepEqual(point({ clientX: 325, clientY: 147.5, currentTarget }, size), {
    x: 590,
    y: 215,
  });
  assert.equal(point({ clientX: 510, clientY: 100, currentTarget }, size), null);
  assert.equal(point({ clientX: 29, clientY: 100, currentTarget }, size), null);
});

async function harness() {
  const sceneRef = { current: newScene() },
    owner = { current: null };
  const capture = new Set();
  const canvas = {
    focus() {},
    setPointerCapture(id) {
      capture.add(id);
    },
    hasPointerCapture(id) {
      return capture.has(id);
    },
    releasePointerCapture(id) {
      capture.delete(id);
    },
  };
  const updateScene = (next) => {
    sceneRef.current = next;
  };
  const release = await componentCallback("coordinate-lab.tsx", "release", {
    owner,
    sceneRef,
    updateScene,
    canvasRef: { current: canvas },
  });
  const env = {
    paused: false,
    canEdit: true,
    canPan: true,
    owner,
    sceneRef,
    size,
    release,
    coordinatePoint: (event) => event.point,
    setCursor() {},
    setPreset() {},
    updateScene,
    beginCoordinateDrag,
    moveCoordinatePoint,
    panCamera,
  };
  const start = await componentCallback("coordinate-lab.tsx", "start", env);
  const move = await componentCallback("coordinate-lab.tsx", "move", env);
  const end = await componentCallback("coordinate-lab.tsx", "end", env);
  const event = (id, point, rest = {}) => ({
    pointerId: id,
    isPrimary: true,
    button: 0,
    buttons: 1,
    currentTarget: canvas,
    point,
    preventDefault() {},
    ...rest,
  });
  return { sceneRef, owner, capture, start, move, end, release, event };
}

test("Coordinate actual pointer callbacks keep a single owner and consume the final up sample", async () => {
  const h = await harness();
  h.start(h.event(1, { x: 590, y: 215 }, { button: 1 }));
  assert.equal(h.owner.current, null);
  h.start(h.event(1, { x: 596, y: 212 }));
  h.start(h.event(2, { x: 100, y: 100 }));
  h.move(h.event(2, { x: 900, y: 400 }));
  h.end(h.event(2, { x: 900, y: 400 }));
  near(h.sceneRef.current.points[0], { x: 2, y: 1 });
  assert.equal(h.owner.current.id, 1);
  h.end(h.event(1, { x: 651, y: 239.5 }, { button: 2 }));
  assert.equal(h.owner.current.id, 1);
  h.end(h.event(1, { x: 651, y: 239.5 }));
  near(h.sceneRef.current.points[0], { x: 3, y: 0.5 });
  assert.equal(h.owner.current, null);
  assert.equal(h.sceneRef.current.draggingPoint, false);
  assert.equal(h.capture.size, 0);
});

test("Coordinate actual pan, outside, lost buttons and pointercancel never leave capture stuck", async () => {
  const h = await harness();
  h.start(h.event(3, { x: 100, y: 100 }, { button: 2, buttons: 2 }));
  h.move(h.event(3, { x: 155, y: 127.5 }, { buttons: 2 }));
  h.end(h.event(3, { x: 210, y: 155 }, { button: 2, buttons: 0 }));
  near(h.sceneRef.current.camera, { x: -2, y: 1 });
  near(h.sceneRef.current.points[0], { x: 2, y: 1 });
  for (const cause of ["outside", "lost-buttons", "cancel"]) {
    const h = await harness();
    h.start(h.event(1, { x: 590, y: 215 }));
    if (cause === "cancel") h.end(h.event(1, { x: 800, y: 400 }), true);
    else
      h.move(
        h.event(1, cause === "outside" ? null : { x: 800, y: 400 }, {
          buttons: cause === "lost-buttons" ? 0 : 1,
        }),
      );
    near(h.sceneRef.current.points[0], { x: 2, y: 1 });
    assert.equal(h.owner.current, null);
    assert.equal(h.capture.size, 0);
  }
});

test("Coordinate actual lifecycle removes listeners and cancels on blur, hidden and dispose", async () => {
  const events = new Map();
  let releases = 0;
  const target = (prefix) => ({
    addEventListener: (name, fn) => events.set(prefix + name, fn),
    removeEventListener: (name) => events.delete(prefix + name),
  });
  const document = { ...target("d:"), hidden: true };
  const effect = await componentEffect("coordinate-lab.tsx", "visibilitychange", {
    window: target("w:"),
    document,
    release: () => releases++,
  });
  const dispose = effect();
  events.get("w:blur")();
  events.get("d:visibilitychange")();
  assert.equal(releases, 2);
  dispose();
  assert.equal(events.size, 0);
  assert.equal(releases, 3);
});

test("Coordinate actual keyboard prevents scrolling when paused, ignores repeat Space and leaves Tab free", async () => {
  let toggles = 0;
  const handler = await componentCallback("coordinate-lab.tsx", "onKeyDown", {
    paused: true,
    togglePause: () => toggles++,
    release() {},
  });
  for (const key of ["ArrowDown", " ", "+", "Enter", "Delete"]) {
    let prevented = false;
    handler({
      key,
      repeat: true,
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, true);
  }
  assert.equal(toggles, 0);
  handler({ key: " ", repeat: false, preventDefault() {} });
  assert.equal(toggles, 1);
  for (const data of [{ key: "Tab" }, { key: "ArrowDown", ctrlKey: true }]) {
    let prevented = false;
    handler({
      ...data,
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, false);
  }
});

test("Coordinate actual native wheel listener handles units, pause and removes listener on cleanup", async () => {
  for (const paused of [false, true]) {
    let callback,
      option,
      removed = false,
      zoom;
    const canvas = {
      addEventListener(name, fn, opts) {
        assert.equal(name, "wheel");
        callback = fn;
        option = opts;
      },
      removeEventListener(name, fn) {
        removed = fn === callback;
      },
    };
    const effect = await componentEffect("coordinate-lab.tsx", 'canvas.addEventListener("wheel"', {
      canvasRef: { current: canvas },
      canZoom: true,
      paused,
      size,
      coordinatePoint: () => ({ x: 590, y: 215 }),
      setCursor() {},
      zoomAt: (point, factor) => {
        zoom = { point, factor };
      },
      clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    });
    const dispose = effect();
    assert.equal(option.passive, false);
    let prevented = false;
    callback({
      clientX: 0,
      clientY: 0,
      deltaY: -1,
      deltaMode: 1,
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, true);
    if (paused) assert.equal(zoom, undefined);
    else assert.ok(Math.abs(zoom.factor - Math.exp(0.032)) < 1e-12);
    dispose();
    assert.equal(removed, true);
  }
});
