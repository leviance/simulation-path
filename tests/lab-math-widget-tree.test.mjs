import assert from "node:assert/strict";
import test from "node:test";
import * as w from "../lib/labs/widget-tree.ts";
import { componentCallback } from "./lab-handler-support.mjs";

test("tree66: actual Canvas pointerup commits the final coordinate and ignores foreign pointer IDs", async () => {
  const state = w.buildTree(),
    model = { current: w.createModel() },
    ui = { current: w.createUi() },
    pointer = { current: 11 };
  w.pointerDown(state.tree, model.current, ui.current, { x: 800, y: 252 });
  const env = {
    state,
    model,
    ui,
    pointer,
    stage: 8,
    point: () => ({ x: 1200, y: 252 }),
    pointerUp: w.pointerUp,
    cancel: w.cancel,
    reduced: false,
    setPaused: w.setPaused,
    publish() {},
    release() {
      pointer.current = null;
    },
  };
  const up = await componentCallback("widget-tree-lab.tsx", "up", env);
  up({ button: 0, pointerId: 22 });
  assert.equal(pointer.current, 11);
  assert.equal(model.current.gravity, 600);
  up({ button: 0, pointerId: 11 });
  assert.equal(pointer.current, null);
  assert.equal(model.current.gravity, 1200);
});
test("tree66: actual Shift+arrow routing moves the Panel without editing a focused Slider", async () => {
  const state = w.buildTree(),
    model = { current: w.createModel() },
    ui = { current: w.createUi() };
  ui.current.focus = state.slider;
  const x = state.tree.root.local.x;
  const keyboard = await componentCallback("widget-tree-lab.tsx", "keyboard", {
    state,
    model,
    ui,
    stage: 8,
    cancelGesture() {
      w.cancel(ui.current);
    },
    movePanel: w.movePanel,
    publish() {},
    keyDown() {
      throw Error("Shift+arrow leaked to Slider");
    },
  });
  keyboard({ shiftKey: true, key: "ArrowRight", preventDefault() {} });
  assert.equal(state.tree.root.local.x, x + 4);
  assert.equal(model.current.gravity, 480);
});
test("tree66: HTML button repeat guard does not block slider arrow repeat", async () => {
  const guard = await componentCallback("widget-tree-lab.tsx", "guardButtonRepeat", {});
  let prevented = 0;
  for (const [repeat, key, tag] of [
    [true, "Enter", "BUTTON"],
    [false, "Enter", "BUTTON"],
    [true, "ArrowRight", "INPUT"],
    [true, " ", "CANVAS"],
  ])
    guard({
      repeat,
      key,
      target: { tagName: tag },
      preventDefault() {
        prevented++;
      },
    });
  assert.equal(prevented, 1);
});

test("tree66: local/world fixture and parent movement preserve IDs and local Rect", () => {
  const { tree, pause } = w.buildTree();
  const local = { ...w.find(tree.root, pause).local };
  assert.deepEqual(w.locate(tree, pause).bounds, { x: 688, y: 80, width: 224, height: 44 });
  const ids = w.paintList(tree).map((p) => p.node.id);
  w.movePanel(tree, -16, 4);
  assert.deepEqual(w.locate(tree, pause).bounds, { x: 672, y: 84, width: 224, height: 44 });
  assert.deepEqual(w.find(tree.root, pause).local, local);
  assert.deepEqual(
    w.paintList(tree).map((p) => p.node.id),
    ids,
  );
});
test("tree66: intersection, half-open edges, ancestor clip and focus use the same visible region", () => {
  const { tree, reset, slider } = w.buildTree(8, 1),
    p = w.locate(tree, reset);
  assert.deepEqual(p.bounds, { x: 688, y: 140, width: 224, height: 44 });
  assert.deepEqual(p.clip, { x: 688, y: 140, width: 224, height: 36 });
  assert.equal(w.hitTest(tree, { x: 700, y: 175 }), reset);
  assert.notEqual(w.hitTest(tree, { x: 700, y: 176 }), reset);
  assert.notEqual(w.hitTest(tree, { x: 912, y: 145 }), reset);
  assert.equal(w.locate(tree, slider), null);
  assert.ok(w.find(tree.root, slider));
  assert.ok(!w.focusOrder(tree).includes(slider));
  assert.deepEqual(
    w.intersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 20, y: 20, width: 10, height: 10 }),
    { x: 20, y: 20, width: 0, height: 0 },
  );
});
test("tree66: last painted button wins, Label passes through and disabled overlay still blocks", () => {
  const { tree, pause } = w.buildTree(8, 2),
    last = tree.root.children[1].children.at(-1),
    p = { x: 700, y: 90 };
  assert.equal(w.hitTest(tree, p), last.id);
  w.add(tree, 3, "Label", { x: 0, y: 0, width: 224, height: 44 }, "Decoration");
  assert.equal(w.hitTest(tree, p), last.id);
  w.setEnabled(tree, last.id, false);
  const m = w.createModel(),
    ui = w.createUi();
  w.pointerDown(tree, m, ui, p);
  w.pointerUp(tree, m, ui, p);
  assert.equal(ui.active, 0);
  assert.equal(m.paused, true);
  assert.notEqual(w.hitTest(tree, p), pause);
  tree.root.children[1].children.reverse();
  assert.equal(w.hitTest(tree, p), pause);
});
test("tree66: click transitions, orphan release and end-of-drag sample use fresh ID lookup", () => {
  const { tree, pause, reset, slider } = w.buildTree(),
    m = w.createModel(),
    ui = w.createUi();
  w.pointerUp(tree, m, ui, { x: 700, y: 90 });
  assert.equal(m.paused, true);
  w.pointerDown(tree, m, ui, { x: 700, y: 90 });
  assert.equal(ui.active, pause);
  w.pointerMove(tree, m, ui, { x: 700, y: 150 });
  assert.equal(ui.active, pause);
  assert.equal(ui.hot, reset);
  w.pointerUp(tree, m, ui, { x: 700, y: 150 });
  assert.equal(m.paused, true);
  w.pointerDown(tree, m, ui, { x: 700, y: 90 });
  w.pointerUp(tree, m, ui, { x: 700, y: 90 });
  assert.equal(m.paused, false);
  w.pointerDown(tree, m, ui, { x: 800, y: 252 });
  assert.equal(ui.active, slider);
  w.pointerUp(tree, m, ui, { x: 1200, y: 252 });
  assert.equal(m.gravity, 1200);
  w.pointerDown(tree, m, ui, { x: 800, y: 252 });
  w.cancel(ui);
  w.pointerUp(tree, m, ui, { x: -200, y: 252 });
  assert.equal(m.gravity, 600);
});
test("tree66: slider world mapping follows a moved Panel and rejects invalid samples", () => {
  const { tree, slider } = w.buildTree(),
    m = w.createModel();
  w.movePanel(tree, -16, 0);
  w.drag(tree, m, slider, 672 + 112);
  assert.equal(m.gravity, 600);
  w.drag(tree, m, slider, -500);
  assert.equal(m.gravity, 0);
  w.drag(tree, m, slider, NaN);
  assert.equal(m.gravity, 0);
});
test("tree66: Tab derives order, hover does not steal focus and button repeat cannot toggle twice", () => {
  const { tree, pause, reset, slider } = w.buildTree(),
    m = w.createModel(),
    ui = w.createUi();
  assert.deepEqual(w.focusOrder(tree), [pause, reset, slider]);
  w.keyDown(tree, m, ui, "Tab");
  assert.equal(ui.focus, pause);
  w.pointerMove(tree, m, ui, { x: 700, y: 150 });
  assert.equal(ui.focus, pause);
  w.keyDown(tree, m, ui, "Enter");
  assert.equal(m.paused, false);
  w.keyDown(tree, m, ui, "Enter", false, true);
  assert.equal(m.paused, false);
  w.keyDown(tree, m, ui, "Tab");
  w.keyDown(tree, m, ui, "Tab");
  assert.equal(ui.focus, slider);
  w.keyDown(tree, m, ui, "End");
  assert.equal(m.gravity, 1200);
  w.keyDown(tree, m, ui, "ArrowLeft", false, true);
  assert.equal(m.gravity, 1180);
  w.keyDown(tree, m, ui, "Tab", true);
  assert.equal(ui.focus, reset);
});
test("tree66: hide/disable/delete repair IDs; new children cannot reuse removed IDs", () => {
  const { tree, group, slider } = w.buildTree(),
    m = w.createModel(),
    ui = w.createUi();
  w.pointerDown(tree, m, ui, { x: 800, y: 252 });
  ui.focus = slider;
  w.setVisible(tree, group, false);
  w.reconcile(tree, ui);
  assert.deepEqual(ui, { hot: 0, active: 0, focus: 0 });
  assert.ok(w.find(tree.root, slider));
  w.setVisible(tree, group, true);
  assert.ok(w.locate(tree, slider));
  w.pointerDown(tree, m, ui, { x: 800, y: 252 });
  w.setEnabled(tree, group, false);
  w.reconcile(tree, ui);
  assert.equal(ui.active, 0);
  assert.equal(ui.focus, 0);
  w.setEnabled(tree, group, true);
  w.pointerDown(tree, m, ui, { x: 800, y: 252 });
  const idBefore = tree.nextId;
  assert.equal(w.remove(tree, group), true);
  w.reconcile(tree, ui);
  assert.equal(tree.count, 3);
  assert.equal(w.find(tree.root, slider), null);
  const id = w.add(tree, 1, "Label", { x: 0, y: 0, width: 20, height: 20 });
  assert.equal(id, idBefore);
  const gravity = m.gravity;
  w.pointerUp(tree, m, ui, { x: 1200, y: 252 });
  assert.equal(m.gravity, gravity);
  assert.equal(w.remove(tree, 1), false);
  assert.equal(w.audit(tree, ui), 4);
});
test("tree66: invalid add is atomic; node/depth/ID budgets reject before mutation", () => {
  const { tree, pause } = w.buildTree();
  const before = { count: tree.count, nextId: tree.nextId, revision: tree.revision };
  for (const [parent, rect] of [
    [999, { x: 0, y: 0, width: 1, height: 1 }],
    [pause, { x: 0, y: 0, width: 1, height: 1 }],
    [1, { x: NaN, y: 0, width: 1, height: 1 }],
    [1, { x: 0, y: 0, width: 0, height: 1 }],
  ])
    assert.throws(() => w.add(tree, parent, "Label", rect));
  assert.deepEqual({ count: tree.count, nextId: tree.nextId, revision: tree.revision }, before);
  while (tree.count < w.maxWidgets) w.add(tree, 1, "Label", { x: 0, y: 0, width: 1, height: 1 });
  assert.throws(() => w.add(tree, 1, "Label", { x: 0, y: 0, width: 1, height: 1 }));
  const deep = w.createTree();
  let parent = 1;
  for (let i = 0; i < 6; i++)
    parent = w.add(deep, parent, "Panel", { x: 0, y: 0, width: 1, height: 1 });
  assert.throws(() => w.add(deep, parent, "Label", { x: 0, y: 0, width: 1, height: 1 }));
  const exhausted = w.createTree();
  exhausted.nextId = w.maxId + 1;
  assert.throws(() => w.add(exhausted, 1, "Label", { x: 0, y: 0, width: 1, height: 1 }));
  assert.equal(exhausted.count, 1);
});
test("tree66: 1000 reads/physics steps retain the same nodes, Reset does not reconstruct UI", () => {
  const { tree, pause } = w.buildTree(),
    root = tree.root,
    button = w.find(root, pause),
    m = w.createModel(),
    ui = w.createUi(),
    next = tree.nextId;
  w.setPaused(m, false);
  for (let i = 0; i < 1000; i++) {
    w.paintList(tree);
    w.hitTest(tree, { x: 700, y: 90 });
    w.advance(m, 1 / 120);
  }
  w.resetSimulation(m);
  assert.equal(tree.root, root);
  assert.equal(w.find(root, pause), button);
  assert.equal(tree.nextId, next);
  assert.equal(w.audit(tree, ui), 9);
});
test("tree66: teaching stages gate nesting, clip, hover, slider and input without final-preview leakage", () => {
  for (let stage = 1; stage <= 8; stage++) {
    const s = w.buildTree(stage, 1),
      m = w.createModel(),
      ui = w.createUi();
    assert.equal(s.group === 1, stage < 2);
    assert.equal(s.slider === 0, stage < 5);
    const hit = w.hitTest(s.tree, { x: 700, y: 90 }, stage);
    assert.equal(hit !== 0, stage >= 4);
    w.pointerDown(s.tree, m, ui, { x: 700, y: 90 }, stage);
    w.pointerUp(s.tree, m, ui, { x: 700, y: 90 }, stage);
    assert.equal(m.paused, stage < 5);
    assert.equal(w.keyDown(s.tree, m, ui, "Tab", false, false, stage), stage >= 6);
  }
});
test("tree66: audit catches duplicate IDs, stale focus and malformed geometry", () => {
  const s = w.buildTree(),
    ui = w.createUi(),
    pause = w.find(s.tree.root, s.pause);
  const id = pause.id;
  pause.id = 1;
  assert.throws(() => w.audit(s.tree, ui));
  pause.id = id;
  ui.focus = 999;
  assert.throws(() => w.audit(s.tree, ui));
  ui.focus = 0;
  pause.local.width = NaN;
  assert.throws(() => w.audit(s.tree, ui));
});
test("tree66: letterbox conversion and actual Canvas callbacks preserve pointer ownership", async () => {
  assert.deepEqual(w.windowToLogical({ x: 240, y: 270 }, 1440, 540), { x: 0, y: 270 });
  assert.deepEqual(w.windowToLogical({ x: 100, y: 270 }, 1440, 540), { x: -140, y: 270 });
  const pointer = { current: 11 };
  let cancelled = 0;
  const handler = await componentCallback("widget-tree-lab.tsx", "cancelled", {
    pointer,
    cancelGesture() {
      cancelled++;
      pointer.current = null;
    },
  });
  handler({ pointerId: 22 });
  assert.equal(pointer.current, 11);
  assert.equal(cancelled, 0);
  handler({ pointerId: 11 });
  assert.equal(cancelled, 1);
  assert.equal(pointer.current, null);
  const down = await componentCallback("widget-tree-lab.tsx", "down", { pointer: { current: 11 } });
  down({ button: 0, pointerId: 22 });
});
