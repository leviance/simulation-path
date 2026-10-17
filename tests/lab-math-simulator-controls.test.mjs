import assert from "node:assert/strict";
import test from "node:test";
import * as lab from "../lib/labs/simulator-controls.ts";
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const create = () => [lab.createModel(), lab.createUi()];
test("controls: half-open hit-test shares native button rectangles", () => {
  assert.equal(lab.hitTest({ x: 688, y: 80 }), "Pause");
  assert.equal(lab.hitTest({ x: 912, y: 80 }), "None");
  assert.equal(lab.hitTest({ x: 688, y: 124 }), "None");
  assert.equal(lab.hitTest({ x: NaN, y: 100 }), "None");
});
test("controls: logical coordinates round-trip for wide, tall and doubled displays", () => {
  for (const [width, height] of [
    [960, 540],
    [1920, 1080],
    [1440, 540],
    [480, 720],
  ]) {
    const scale = Math.min(width / 960, height / 540);
    const p = lab.windowToLogical(
      { x: (width - 960 * scale) / 2 + 800 * scale, y: (height - 540 * scale) / 2 + 100 * scale },
      width,
      height,
    );
    assert.equal(lab.hitTest(p), "Pause");
    near(p.x, 800);
    near(p.y, 100);
  }
  assert.equal(lab.windowToLogical({ x: 0, y: 0 }, 0, 540), null);
  assert.equal(lab.hitTest(lab.windowToLogical({ x: 800, y: 20 }, 960, 720)), "None");
});
test("controls: free-flight agrees with independent arithmetic-series oracle", () => {
  const m = lab.createModel();
  lab.setPaused(m, false);
  const n = 60;
  for (let i = 0; i < n; i++) lab.advance(m, lab.fixedDt);
  near(m.velocity, m.gravity * lab.fixedDt * n);
  near(m.y, 90 + (m.gravity * lab.fixedDt ** 2 * n * (n + 1)) / 2);
});
test("controls: fixed-step partitions agree and long/invalid frames stay bounded", () => {
  const a = lab.createModel(),
    b = lab.createModel();
  lab.setPaused(a, false);
  lab.setPaused(b, false);
  for (let i = 0; i < 60; i++) lab.advance(a, lab.fixedDt);
  for (let i = 0; i < 15; i++) lab.advance(b, lab.fixedDt * 4);
  near(a.y, b.y);
  near(a.velocity, b.velocity);
  assert.equal(a.ticks, b.ticks);
  assert.equal(lab.advance(b, 1e9), 12);
  for (const bad of [NaN, Infinity, -1]) assert.equal(lab.advance(b, bad), 0);
});
test("controls: pause drops wait time, reset preserves gravity and Pause", () => {
  const m = lab.createModel();
  lab.advance(m, 3600);
  assert.equal(m.ticks, 0);
  lab.setGravity(m, 1000);
  lab.stepPhysics(m);
  lab.resetSimulation(m);
  assert.deepEqual(
    [m.y, m.velocity, m.ticks, m.accumulator, m.gravity, m.paused],
    [90, 0, 0, 0, 1000, true],
  );
  const revision = m.clockRevision;
  lab.setPaused(m, false);
  assert.equal(m.clockRevision, revision + 1);
  for (const bad of [NaN, Infinity, -Infinity]) lab.setGravity(m, bad);
  assert.equal(m.gravity, 1000);
});
test("controls: button requires same press/release, not an orphan or another target", () => {
  const [m, u] = create();
  lab.pointerUp(m, u, { x: 800, y: 100 });
  assert.equal(m.paused, true);
  lab.pointerDown(m, u, { x: 800, y: 100 });
  lab.pointerUp(m, u, { x: 800, y: 160 });
  assert.equal(m.paused, true);
  lab.pointerDown(m, u, { x: 800, y: 100 });
  lab.pointerMove(m, u, { x: 100, y: 100 });
  lab.pointerUp(m, u, { x: 100, y: 100 });
  assert.equal(m.paused, true);
  lab.pointerDown(m, u, { x: 800, y: 100 });
  lab.pointerUp(m, u, { x: 800, y: 100 });
  assert.equal(m.paused, false);
});
test("controls: hover cannot steal active or focus; leaving and reentering can click", () => {
  const [m, u] = create();
  lab.pointerDown(m, u, { x: 800, y: 100 });
  lab.pointerMove(m, u, { x: 800, y: 160 });
  assert.deepEqual([u.hot, u.active, u.focus], ["Reset", "Pause", "Pause"]);
  lab.pointerMove(m, u, { x: 800, y: 100 });
  lab.pointerUp(m, u, { x: 800, y: 100 });
  assert.equal(m.paused, false);
});
test("controls: slider midpoint and outside capture clamp without losing ownership", () => {
  const [m, u] = create();
  lab.pointerDown(m, u, { x: 800, y: 252 });
  near(m.gravity, 600);
  lab.pointerMove(m, u, { x: -500, y: 50 });
  assert.equal(m.gravity, 0);
  lab.pointerDown(m, u, { x: 800, y: 100 });
  assert.equal(u.active, "Gravity");
  lab.pointerMove(m, u, { x: 5000, y: 50 });
  assert.equal(m.gravity, 1200);
  lab.pointerUp(m, u, { x: 5000, y: 50 });
  assert.equal(u.active, "None");
});
test("controls: cancel/blur prevents stale release and pause remains explicit", () => {
  const [m, u] = create();
  lab.setPaused(m, false);
  lab.pointerDown(m, u, { x: 800, y: 100 });
  lab.suspend(m, u);
  lab.pointerUp(m, u, { x: 800, y: 100 });
  assert.equal(m.paused, true);
  assert.equal(u.active, "None");
});
test("controls: panel background consumes input but scene handles unconsumed down", () => {
  const [m, u] = create();
  for (const p of [
    { x: 800, y: 100 },
    { x: 800, y: 320 },
    { x: 320, y: 200 },
  ]) {
    if (!lab.pointerDown(m, u, p)) lab.scenePointerDown(m, p);
    lab.cancelPointer(u);
  }
  assert.equal(m.scenePresses, 1);
  assert.equal(m.y, 200);
});
test("controls: Tab focus order and reverse order match native", () => {
  const [m, u] = create();
  for (const wanted of ["Pause", "Reset", "Gravity", "Pause"]) {
    lab.keyDown(m, u, "Tab");
    assert.equal(u.focus, wanted);
  }
  for (const wanted of ["Gravity", "Reset", "Pause"]) {
    lab.keyDown(m, u, "Tab", true);
    assert.equal(u.focus, wanted);
  }
  lab.keyDown(m, u, "Tab", false, true);
  assert.equal(u.focus, "Pause");
});
test("controls: repeated activation is blocked while slider arrows may repeat", () => {
  const [m, u] = create();
  u.focus = "Pause";
  lab.keyDown(m, u, " ");
  lab.keyDown(m, u, " ", false, true);
  assert.equal(m.paused, false);
  u.focus = "Gravity";
  lab.keyDown(m, u, "Home");
  lab.keyDown(m, u, "ArrowRight", false, true);
  assert.equal(m.gravity, 20);
  lab.keyDown(m, u, "End");
  assert.equal(m.gravity, 1200);
  lab.pointerDown(m, u, { x: 800, y: 252 });
  lab.keyDown(m, u, "Escape");
  assert.equal(u.active, "None");
});
test("controls: deterministic long trace stays finite and audit detects corruption", () => {
  const [m, u] = create();
  lab.setPaused(m, false);
  for (let i = 0; i < 12000; i++) {
    lab.setGravity(m, i % 1201);
    lab.advance(m, 1 / 60);
    assert.equal(lab.audit(m, u), true);
  }
  m.gravity = -1;
  assert.equal(lab.audit(m, u), false);
  assert.equal(m.gravity, -1);
});
