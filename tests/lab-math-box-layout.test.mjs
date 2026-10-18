import assert from "node:assert/strict";
import test from "node:test";
import * as b from "../lib/labs/box-layout.ts";
import { componentCallback } from "./lab-handler-support.mjs";
const fresh = (stage = 9) => {
  const lab = b.createLab(stage),
    ui = b.createUi();
  b.ensureLayout(lab, ui);
  return { lab, ui, model: b.createModel() };
};

test("box67: audit rejects dirty, duplicate IDs, orphan styles and invalid hidden geometry", () => {
  const { lab, ui } = fresh();
  b.setWidth(lab, ui, 220);
  assert.throws(() => b.auditLayout(lab));
  b.ensureLayout(lab, ui);
  const node = b.find(lab.tree.root, lab.pause),
    id = node.id;
  node.id = 1;
  assert.throws(() => b.auditLayout(lab));
  node.id = id;
  const style = lab.styles.get(id);
  lab.styles.delete(id);
  assert.throws(() => b.auditLayout(lab));
  lab.styles.set(id, style);
  node.visible = false;
  node.local.width = NaN;
  assert.throws(() => b.auditLayout(lab));
});

test("box67: independent default nested border/content/world fixture", () => {
  const { lab } = fresh();
  assert.equal(lab.tree.count, 9);
  assert.deepEqual(b.locate(lab.tree, lab.pause).bounds, { x: 656, y: 96, width: 240, height: 36 });
  assert.equal(lab.sizes.get(lab.group).height, 252);
  assert.equal(lab.sizes.get(1).naturalHeight, 360);
  assert.equal(lab.tree.root.local.height, 492);
  assert.deepEqual(
    b.contentBox(
      { x: 10, y: 20, width: 100, height: 60 },
      b.defaultStyle(b.find(lab.tree.root, lab.pause)),
    ),
    { x: 15, y: 25, width: 90, height: 50 },
  );
});
test("box67: measure is separate from arrange and default stages do not leak nesting", () => {
  for (let stage = 1; stage <= 9; stage++) {
    const { lab } = fresh(stage);
    assert.equal(lab.group === 0, stage < 5);
    assert.equal(lab.sizes.size === 0, stage < 3);
    assert.equal(b.find(lab.tree.root, lab.pause).local.y === 58, stage < 4);
  }
  const { lab } = fresh(3),
    rect = { ...b.find(lab.tree.root, lab.pause).local };
  b.measure(lab.tree.root, 220, lab.styles, new Map());
  assert.deepEqual(b.find(lab.tree.root, lab.pause).local, rect);
});
test("box67: no edge gap, hidden nodes contribute no margin, one child has no gap", () => {
  const { lab } = fresh(),
    group = b.find(lab.tree.root, lab.group);
  group.children.forEach((n) => (n.visible = false));
  let sizes = new Map();
  assert.equal(b.measure(group, 284, lab.styles, sizes).height, 28);
  const only = b.find(lab.tree.root, lab.pause);
  only.visible = true;
  lab.styles.get(only.id).margin = { left: 3, top: 7, right: 9, bottom: 11 };
  sizes = new Map();
  assert.equal(b.measure(group, 284, lab.styles, sizes).height, 82);
  assert.equal(sizes.get(only.id).width, 236);
});
test("box67: neighboring margins add, gap zero does not remove margins", () => {
  const { lab, ui } = fresh();
  b.setSpacing(lab, ui, 0, 16);
  b.ensureLayout(lab, ui);
  const pause = b.locate(lab.tree, lab.pause),
    reset = b.locate(lab.tree, lab.reset);
  assert.equal(reset.bounds.y - (pause.bounds.y + pause.bounds.height), 8);
  assert.equal(lab.sizes.get(lab.group).height, 220);
});
test("box67: hide/show removes exactly 52 and restores Rect; disabled still occupies flow", () => {
  const { lab, ui } = fresh(),
    before = { ...b.find(lab.tree.root, lab.slider).local };
  b.toggleReset(lab, ui);
  b.ensureLayout(lab, ui);
  assert.equal(lab.sizes.get(lab.group).height, 200);
  assert.equal(b.find(lab.tree.root, lab.slider).local.y, before.y - 52);
  assert.equal(b.focusOrder(lab.tree).includes(lab.reset), false);
  b.toggleReset(lab, ui);
  b.ensureLayout(lab, ui);
  assert.deepEqual(b.find(lab.tree.root, lab.slider).local, before);
  b.find(lab.tree.root, lab.reset).enabled = false;
  b.invalidate(lab, ui);
  b.ensureLayout(lab, ui);
  assert.equal(lab.sizes.get(lab.group).height, 252);
  assert.equal(b.focusOrder(lab.tree).includes(lab.reset), false);
});
test("box67: append/remove keeps style ownership aligned and never reuses IDs", () => {
  const { lab, ui } = fresh();
  for (let i = 0; i < 4; i++) assert.equal(b.appendLabel(lab, ui), true);
  const next = lab.tree.nextId;
  assert.equal(b.appendLabel(lab, ui), false);
  assert.equal(lab.tree.nextId, next);
  b.ensureLayout(lab, ui);
  assert.equal(lab.sizes.get(1).naturalHeight, 520);
  assert.equal(lab.sizes.get(lab.group).height, 412);
  const id = lab.extras.at(-1);
  b.removeLabel(lab, ui);
  assert.equal(lab.styles.has(id), false);
  assert.equal(b.find(lab.tree.root, id), null);
  b.appendLabel(lab, ui);
  assert.equal(lab.extras.at(-1), next);
  while (b.removeLabel(lab, ui)) {}
  b.ensureLayout(lab, ui);
  assert.equal(lab.tree.count, 9);
  assert.equal(lab.styles.size, 9);
  assert.equal(lab.sizes.get(lab.group).height, 252);
});
test("box67: changing width cancels gesture, ensures new geometry before next input", () => {
  const { lab, ui, model } = fresh();
  b.pointerDown(lab.tree, model, ui, { x: 776, y: 250 });
  assert.equal(ui.active, lab.slider);
  assert.equal(model.gravity, 600);
  b.setWidth(lab, ui, 220);
  assert.equal(ui.active, 0);
  assert.equal(lab.dirty, true);
  b.ensureLayout(lab, ui);
  assert.deepEqual(b.locate(lab.tree, lab.slider).bounds, {
    x: 756,
    y: 240,
    width: 140,
    height: 32,
  });
  b.pointerUp(lab.tree, model, ui, { x: 1200, y: 250 });
  assert.equal(model.gravity, 600);
  b.pointerDown(lab.tree, model, ui, { x: 826, y: 250 });
  b.pointerUp(lab.tree, model, ui, { x: 826, y: 250 });
  assert.equal(model.gravity, 600);
});
test("box67: fixed overflow retains full bounds and picking respects clip", () => {
  const { lab, ui, model } = fresh();
  b.setWidth(lab, ui, 220);
  b.setOverflow(lab, ui, true);
  b.ensureLayout(lab, ui);
  const slider = b.locate(lab.tree, lab.slider);
  assert.equal(slider.bounds.width, 320);
  assert.equal(slider.clip.width, 158);
  assert.notEqual(b.hitTest(lab.tree, { x: 920, y: 250 }), lab.slider);
  b.pointerDown(lab.tree, model, ui, { x: 836, y: 250 });
  assert.equal(model.gravity, 300);
  b.pointerUp(lab.tree, model, ui, { x: 1200, y: 250 });
  assert.equal(model.gravity, 1200);
  assert.equal(ui.active, 0);
});
test("box67: zero content/Fill width is finite, not painted and cannot focus", () => {
  const { lab, ui } = fresh();
  b.setWidth(lab, ui, 220);
  b.setSpacing(lab, ui, 8, 48);
  lab.styles.get(lab.slider).margin = { left: 64, top: 4, right: 64, bottom: 4 };
  b.invalidate(lab, ui);
  b.ensureLayout(lab, ui);
  assert.equal(b.find(lab.tree.root, lab.slider).local.width, 0);
  assert.equal(b.locate(lab.tree, lab.slider), null);
  assert.equal(b.focusOrder(lab.tree).includes(lab.slider), false);
  assert.doesNotThrow(() => b.auditLayout(lab));
});
test("box67: cache survives 1000 frames and Model reset without rebuilding ownership", () => {
  const { lab, ui, model } = fresh(),
    root = lab.tree.root,
    passes = lab.passes,
    next = lab.tree.nextId;
  b.setPaused(model, false);
  for (let i = 0; i < 1000; i++) {
    b.ensureLayout(lab, ui);
    b.paintList(lab.tree);
    b.advance(model, 1 / 120);
  }
  b.resetSimulation(model);
  assert.equal(lab.tree.root, root);
  assert.equal(lab.passes, passes);
  assert.equal(lab.tree.nextId, next);
  b.setSpacing(lab, ui, 16, 16);
  b.ensureLayout(lab, ui);
  assert.equal(lab.passes, passes + 1);
  b.ensureLayout(lab, ui);
  assert.equal(lab.passes, passes + 1);
});
test("box67: setters reject invalid values atomically and identical inputs are no-ops", () => {
  const { lab, ui } = fresh(),
    before = JSON.stringify([...lab.styles]);
  for (const value of [NaN, Infinity, -1, 219, 421])
    assert.equal(b.setWidth(lab, ui, value), false);
  for (const [gap, padding] of [
    [-1, 16],
    [33, 16],
    [8, 49],
    [8, NaN],
  ])
    assert.equal(b.setSpacing(lab, ui, gap, padding), false);
  b.setWidth(lab, ui, 320);
  b.setSpacing(lab, ui, 8, 16);
  assert.equal(lab.dirty, false);
  assert.equal(JSON.stringify([...lab.styles]), before);
  lab.styles.get(1).padding.right = 30;
  b.setSpacing(lab, ui, 8, 16);
  assert.equal(lab.dirty, true);
  assert.equal(lab.styles.get(1).padding.right, 16);
  b.ensureLayout(lab, ui);
  lab.styles.get(lab.pause).height = "Auto";
  assert.throws(() => b.measure(lab.tree.root, 320, lab.styles, new Map()));
});
test("box67: actual pointer callbacks enforce owner, final sample and layout-before-input", async () => {
  const { lab, ui: state, model: stateModel } = fresh(),
    ui = { current: state },
    model = { current: stateModel },
    pointer = { current: 11 };
  b.pointerDown(lab.tree, model.current, ui.current, { x: 776, y: 250 });
  const up = await componentCallback("box-layout-lab.tsx", "up", {
    lab,
    ui,
    model,
    pointer,
    point: () => ({ x: 1200, y: 250 }),
    ensureLayout: b.ensureLayout,
    pointerUp: b.pointerUp,
    cancel: b.cancel,
    reduced: false,
    setPaused: b.setPaused,
    release() {
      pointer.current = null;
    },
    publish() {},
  });
  up({ button: 0, pointerId: 22 });
  assert.equal(pointer.current, 11);
  assert.equal(model.current.gravity, 600);
  up({ button: 0, pointerId: 11 });
  assert.equal(pointer.current, null);
  assert.equal(model.current.gravity, 1200);
  const cancelled = await componentCallback("box-layout-lab.tsx", "cancelled", {
    pointer,
    ui,
    cancel: b.cancel,
    release() {
      pointer.current = null;
    },
    publish() {},
  });
  pointer.current = 11;
  ui.current.active = lab.slider;
  cancelled({ pointerId: 22 });
  assert.equal(ui.current.active, lab.slider);
  cancelled({ pointerId: 11 });
  assert.equal(ui.current.active, 0);
});
test("box67: actual Shift+arrow changes constraint, never dispatches a slider arrow", async () => {
  const { lab, ui: state, model: stateModel } = fresh(),
    ui = { current: state },
    model = { current: stateModel };
  ui.current.focus = lab.slider;
  const keyboard = await componentCallback("box-layout-lab.tsx", "keyboard", {
    lab,
    ui,
    model,
    stage: 9,
    ensureLayout: b.ensureLayout,
    setWidth: b.setWidth,
    edit(fn) {
      fn();
      b.ensureLayout(lab, ui.current);
    },
  });
  keyboard({ key: "ArrowRight", shiftKey: true, preventDefault() {} });
  assert.equal(lab.width, 340);
  assert.equal(model.current.gravity, 480);
});
