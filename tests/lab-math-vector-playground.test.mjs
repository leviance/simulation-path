import assert from "node:assert/strict";
import test from "node:test";
import {
  vectorScene,
  vectorNormalize,
  vectorArrowHead,
  vectorWorldToScreen,
  vectorScreenToWorld,
  vectorBoard,
  boundedEndpoint,
  hitVectorTarget,
  beginVectorDrag,
  moveVectorEndpoint,
  nudgeVector,
  vectorResults,
  vectorLayers,
} from "../lib/labs/vector-playground.ts";
import { length } from "../lib/labs/geometry.ts";
import { componentCallback, componentEffect } from "./lab-handler-support.mjs";

const near = (a, b) => assert.ok(Math.hypot(a.x - b.x, a.y - b.y) < 1e-9, JSON.stringify([a, b]));
const size = { width: 760, height: 520, dpr: 2 };

test("Vector normalize uses scaled components for subnormal/DBL_MAX and never invents a zero direction", () => {
  near(vectorNormalize({ x: 3, y: 4 }), { x: 0.6, y: 0.8 });
  for (const v of [
    { x: Number.MIN_VALUE, y: Number.MIN_VALUE },
    { x: 1e-300, y: -1e-300 },
    { x: Number.MAX_VALUE, y: Number.MAX_VALUE },
    { x: -Number.MAX_VALUE, y: 1 },
  ])
    assert.ok(Math.abs(length(vectorNormalize(v)) - 1) < 1e-12);
  for (const v of [
    { x: 0, y: 0 },
    { x: NaN, y: 1 },
    { x: Infinity, y: 1 },
  ])
    assert.deepEqual(vectorNormalize(v), { x: 0, y: 0 });
});

test("Vector arithmetic follows independent fixtures, both parallelogram edges and weighted interpolation", () => {
  for (let x = -40; x <= 40; x++)
    for (let y = -30; y <= 30; y++) {
      const scene = {
        ...vectorScene(),
        vectorA: { x: x / 10, y: y / 10 },
        vectorB: { x: -y * 0.07, y: x * 0.05 },
        interpolation: 0.25,
      };
      const r = vectorResults(scene),
        a = scene.vectorA,
        b = scene.vectorB;
      near(r.vectorSum, { x: a.x + b.x, y: a.y + b.y });
      near({ x: r.vectorSum.x - a.x, y: r.vectorSum.y - a.y }, b);
      near({ x: b.x + r.vectorDifference.x, y: b.y + r.vectorDifference.y }, a);
      near(r.point, { x: 0.75 * a.x + 0.25 * b.x, y: 0.75 * a.y + 0.25 * b.y });
      assert.ok(Math.abs(r.distanceAB - Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2)) < 1e-9);
      if (x || y) {
        const unit = r.unitA;
        assert.ok(Math.abs(length(unit) - 1) < 1e-12);
        assert.ok(a.x * unit.x + a.y * unit.y > 0);
      }
    }
  const scene = vectorScene();
  near(vectorResults(scene).vectorSum, { x: 2, y: 4 });
  near(vectorResults(scene).vectorDifference, { x: 4, y: -1 });
  for (const [t, p] of [
    [0, scene.vectorA],
    [1, scene.vectorB],
    [0.5, { x: 1, y: 2 }],
    [-1, { x: 7, y: 0.5 }],
    [2, { x: -5, y: 3.5 }],
  ]) {
    near(vectorResults({ ...scene, interpolation: t }).point, p);
  }
});

test("Vector arrow wings have fixed screen dimensions, symmetric perpendicular offsets and safe tiny/zero paths", () => {
  assert.deepEqual(vectorArrowHead({ x: 0, y: 0 }, { x: 100, y: 0 }), {
    leftWing: { x: 86, y: 6 },
    rightWing: { x: 86, y: -6 },
  });
  assert.equal(vectorArrowHead({ x: 0, y: 0 }, { x: 0, y: 0 }), null);
  assert.equal(vectorArrowHead({ x: NaN, y: 0 }, { x: 1, y: 1 }), null);
  for (let angle = 0; angle < Math.PI * 2; angle += 0.07)
    for (const distance of [0.1, 5, 100, 400]) {
      const u = { x: Math.cos(angle), y: Math.sin(angle) },
        end = { x: 20 + distance * u.x, y: 30 + distance * u.y };
      const head = vectorArrowHead({ x: 20, y: 30 }, end);
      const middle = {
        x: (head.leftWing.x + head.rightWing.x) / 2,
        y: (head.leftWing.y + head.rightWing.y) / 2,
      };
      const back = { x: end.x - middle.x, y: end.y - middle.y };
      const h = Math.min(14, distance * 0.6);
      near(back, { x: u.x * h, y: u.y * h });
      assert.ok(
        Math.abs(
          Math.hypot(head.leftWing.x - middle.x, head.leftWing.y - middle.y) - (h * 6) / 14,
        ) < 1e-9,
      );
    }
});

test("Vector CSS-to-board mapping applies letterbox and CSS scaling once, not DPR twice", async () => {
  near(vectorWorldToScreen({ x: 3, y: 1.5 }), { x: 685, y: 352.5 });
  near(vectorScreenToWorld({ x: 685, y: 352.5 }), { x: 3, y: 1.5 });
  const point = await componentCallback("vector-lab-view.ts", "vectorPointFromEvent", {
    vectorBoard,
  });
  const view = vectorBoard(size),
    rect = { left: 30, top: 40, width: 380, height: 260 };
  const event = (x, y) => ({
    clientX: rect.left + (view.x + x * view.scale) / 2,
    clientY: rect.top + (view.y + y * view.scale) / 2,
    currentTarget: { getBoundingClientRect: () => rect },
  });
  near(point(event(685, 352.5), size), { x: 685, y: 352.5 });
  assert.equal(point(event(-1, 200), size), null);
  near(point(event(-1, 200), size, true), { x: -1, y: 200 });
  assert.equal(point(event(Infinity, 1), size, true), null);
});

test("Vector hit selection includes exactly 14 logical px and uses selected endpoint for a tie", () => {
  let scene = vectorScene(),
    p = vectorWorldToScreen(scene.vectorA);
  assert.equal(hitVectorTarget(scene, { x: p.x + 14, y: p.y }), 0);
  assert.equal(hitVectorTarget(scene, { x: p.x + 14.01, y: p.y }), -1);
  scene = vectorScene("bothZero", 1);
  assert.equal(hitVectorTarget(scene, vectorWorldToScreen({ x: 0, y: 0 })), 1);
  assert.equal(beginVectorDrag(scene, { x: 20, y: 20 }).dragged, -1);
});

test("Vector grabbing preserves offset, captured outside samples clamp and cancelled/keyboard moves stay isolated", () => {
  let scene = vectorScene();
  const p = vectorWorldToScreen(scene.vectorA),
    grab = { x: p.x + 8, y: p.y - 3 };
  scene = beginVectorDrag(scene, grab);
  near(scene.vectorA, { x: 3, y: 1.5 });
  scene = moveVectorEndpoint(scene, { x: grab.x + 45, y: grab.y + 22.5 });
  near(scene.vectorA, { x: 4, y: 1 });
  near(scene.vectorB, { x: -1, y: 2.5 });
  scene = moveVectorEndpoint(scene, { x: -1000, y: 9000 });
  near(scene.vectorA, { x: -4, y: -3 });
  scene = { ...scene, dragged: -1 };
  assert.equal(moveVectorEndpoint(scene, { x: 0, y: 0 }), scene);
  scene = nudgeVector(scene, { x: 0.1, y: 0 });
  near(scene.vectorA, { x: -3.9, y: -3 });
  assert.equal(scene.dragged, -1);
  assert.deepEqual(boundedEndpoint({ x: 100, y: -100 }), { x: 4, y: -3 });
});

test("Vector endpoint domain keeps sum, difference and scalar results inside the logical viewport", () => {
  for (const ax of [-4, 4])
    for (const ay of [-3, 3])
      for (const bx of [-4, 4])
        for (const by of [-3, 3]) {
          const scene = {
            ...vectorScene(),
            vectorA: { x: ax, y: ay },
            vectorB: { x: bx, y: by },
            scalar: -2,
          };
          const r = vectorResults(scene);
          for (const p of [r.vectorSum, r.vectorDifference, r.scaledA]) {
            const s = vectorWorldToScreen(p);
            assert.ok(s.x >= 0 && s.x < 1100 && s.y >= 130 && s.y < 704);
          }
        }
});

test("Vector lesson modes gate new concepts while final overlays never hide sum/difference", () => {
  for (const mode of ["vector-spaces", "vector-magnitude"])
    assert.equal(vectorLayers(mode).canDrag, false);
  assert.equal(vectorLayers("vector-spaces").heads, false);
  assert.equal(vectorLayers("vector-addition").subtraction, false);
  assert.equal(vectorLayers("vector-subtraction").addition, true);
  assert.equal(vectorLayers("vector-normalize").unit, true);
  for (const view of ["arithmetic", "scalar", "unit", "lerp", "all"]) {
    const layers = vectorLayers("vector-full", view);
    assert.equal(layers.addition, true);
    assert.equal(layers.subtraction, true);
    assert.equal(layers.canDrag, true);
  }
});

async function harness() {
  const owner = { current: null },
    sceneRef = { current: vectorScene() },
    captures = new Set();
  const canvas = {
    focus() {},
    setPointerCapture: (id) => captures.add(id),
    hasPointerCapture: (id) => captures.has(id),
    releasePointerCapture: (id) => captures.delete(id),
  };
  const updateScene = (next) => {
    sceneRef.current = next;
  };
  const release = await componentCallback("vector-lab.tsx", "release", {
    owner,
    sceneRef,
    canvasRef: { current: canvas },
    updateScene,
  });
  const env = {
    paused: false,
    layers: { canDrag: true },
    owner,
    sceneRef,
    size,
    release,
    updateScene,
    vectorPointFromEvent: (e) => e.point,
    setCursorScreen() {},
    setPreset() {},
    beginVectorDrag,
    moveVectorEndpoint,
  };
  const start = await componentCallback("vector-lab.tsx", "startDrag", env),
    move = await componentCallback("vector-lab.tsx", "moveEndpoint", env),
    end = await componentCallback("vector-lab.tsx", "endDrag", env);
  const event = (id, point, rest = {}) => ({
    pointerId: id,
    point,
    isPrimary: true,
    button: 0,
    buttons: 1,
    currentTarget: canvas,
    preventDefault() {},
    ...rest,
  });
  return { owner, sceneRef, captures, start, move, end, event, release };
}

test("Vector actual pointer callbacks reject foreign IDs/buttons and commit the final up coordinate", async () => {
  const h = await harness(),
    p = vectorWorldToScreen(h.sceneRef.current.vectorA);
  h.start(h.event(1, p, { button: 2 }));
  assert.equal(h.owner.current, null);
  h.start(h.event(1, p));
  h.start(h.event(2, { x: 550, y: 420 }));
  h.move(h.event(2, { x: 100, y: 100 }));
  h.end(h.event(2, { x: 100, y: 100 }));
  near(h.sceneRef.current.vectorA, { x: 3, y: 1.5 });
  assert.equal(h.owner.current, 1);
  h.end(h.event(1, { x: p.x + 45, y: p.y + 22.5 }, { button: 2 }));
  assert.equal(h.owner.current, 1);
  h.end(h.event(1, { x: p.x + 45, y: p.y + 22.5 }));
  near(h.sceneRef.current.vectorA, { x: 4, y: 1 });
  assert.equal(h.owner.current, null);
  assert.equal(h.captures.size, 0);
});

test("Vector actual captured outside motion, lost buttons and cancel clean ownership without invented samples", async () => {
  const h = await harness(),
    p = vectorWorldToScreen(h.sceneRef.current.vectorA);
  h.start(h.event(1, p));
  h.move(h.event(1, { x: -1000, y: 9000 }));
  near(h.sceneRef.current.vectorA, { x: -4, y: -3 });
  h.release();
  for (const cause of ["cancel", "buttons", "invalid"]) {
    const q = await harness(),
      p = vectorWorldToScreen(q.sceneRef.current.vectorA);
    q.start(q.event(5, p));
    if (cause === "cancel") q.end(q.event(5, { x: 100, y: 100 }), true);
    else
      q.move(
        q.event(5, cause === "invalid" ? null : { x: 100, y: 100 }, {
          buttons: cause === "buttons" ? 0 : 1,
        }),
      );
    near(q.sceneRef.current.vectorA, { x: 3, y: 1.5 });
    assert.equal(q.owner.current, null);
    assert.equal(q.captures.size, 0);
  }
});

test("Vector actual lifecycle cancels on blur/hidden/dispose and removes all listeners", async () => {
  const events = new Map();
  let releases = 0;
  const target = (prefix) => ({
    addEventListener: (name, fn) => events.set(prefix + name, fn),
    removeEventListener: (name) => events.delete(prefix + name),
  });
  const document = { ...target("d:"), hidden: true };
  const effect = await componentEffect("vector-lab.tsx", "visibilitychange", {
    window: target("w:"),
    document,
    release: () => releases++,
  });
  const dispose = effect();
  events.get("w:blur")();
  events.get("d:visibilitychange")();
  dispose();
  assert.equal(releases, 3);
  assert.equal(events.size, 0);
});

test("Vector actual resize preserves world state and mode changes reset the lesson without stale capture", async () => {
  const sceneRef = { current: vectorScene("opposite") };
  const original = sceneRef.current;
  let releases = 0;
  const previousMode = { current: "vector-drag" };
  const effect = (mode) =>
    componentEffect("vector-lab.tsx", "previousMode.current", {
      previousMode,
      mode,
      release: () => releases++,
      updateScene: (next) => (sceneRef.current = next),
      vectorScene,
      setPreset() {},
      setPaused() {},
      setCursorScreen() {},
    });
  (await effect("vector-drag"))();
  assert.equal(sceneRef.current, original);
  assert.equal(releases, 1);
  (await effect("vector-full"))();
  near(sceneRef.current.vectorA, { x: 3, y: 1.5 });
  assert.equal(releases, 2);
});

test("Vector actual keyboard blocks scrolling during pause, ignores repeat Space and never traps Tab/modifiers", async () => {
  let pauses = 0;
  const handler = await componentCallback("vector-lab.tsx", "onKeyDown", {
    paused: true,
    togglePause: () => pauses++,
    release() {},
  });
  for (const key of ["ArrowDown", " ", "r", "Escape"]) {
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
  assert.equal(pauses, 0);
  handler({ key: " ", repeat: false, preventDefault() {} });
  assert.equal(pauses, 1);
  for (const data of [
    { key: "Tab" },
    { key: "ArrowLeft", ctrlKey: true },
    { key: "r", metaKey: true },
  ]) {
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

test("Vector actual preset/pause/reset callbacks release capture before changing the displayed scene", async () => {
  let releases = 0;
  const sceneRef = { current: { ...vectorScene(), selected: 1, dragged: 1 } };
  const updateScene = (next) => (sceneRef.current = next);
  const env = {
    sceneRef,
    release: () => releases++,
    updateScene,
    vectorScene,
    setPreset() {},
    setPaused() {},
    setCursorScreen() {},
  };
  const preset = await componentCallback("vector-lab.tsx", "choosePreset", env);
  preset("bothZero");
  assert.equal(sceneRef.current.selected, 1);
  assert.equal(sceneRef.current.dragged, -1);
  near(sceneRef.current.vectorB, { x: 0, y: 0 });
  (await componentCallback("vector-lab.tsx", "togglePause", env))();
  (await componentCallback("vector-lab.tsx", "reset", env))();
  assert.equal(releases, 3);
  assert.equal(sceneRef.current.selected, 0);
  near(sceneRef.current.vectorA, { x: 3, y: 1.5 });
});

test("Vector actual renderer leaves lerp visible above endpoint fills at t=0 and t=1", async () => {
  const draw = await componentCallback("vector-lab-view.ts", "drawVectorLab", {
    setupCanvas() {},
    vectorBoard,
    vectorResults,
    vectorWorldToScreen,
    vectorArrowHead,
    drawLine() {},
  });
  for (const t of [0, 1]) {
    const fills = [];
    let arc;
    const ctx = new Proxy(
      {
        fillStyle: "",
        arc(x, y, r) {
          arc = { x, y, r };
        },
        fill() {
          fills.push({ ...arc, color: this.fillStyle });
        },
      },
      { get: (target, key) => (key in target ? target[key] : () => {}) },
    );
    const scene = { ...vectorScene(), interpolation: t, viewMode: "lerp" };
    draw(ctx, size, scene, vectorLayers("vector-full", "lerp"));
    const expected = vectorWorldToScreen(t === 0 ? scene.vectorA : scene.vectorB);
    assert.deepEqual(fills.at(-1), { ...expected, r: 6, color: "#ffe26c" });
  }
});
