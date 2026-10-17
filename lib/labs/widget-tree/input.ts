import { hitTest, locate, focusOrder } from "./traversal.ts";
import type { Point } from "./geometry.ts";
import type { Tree } from "./tree.ts";
import {
  setPaused,
  setGravity,
  resetSimulation,
  type Model,
} from "../simulator-controls/simulation.ts";
export type Ui = { hot: number; active: number; focus: number };
export function createUi(): Ui {
  return { hot: 0, active: 0, focus: 0 };
}
export function cancel(ui: Ui) {
  ui.active = 0;
  ui.hot = 0;
}
export function reconcile(tree: Tree, ui: Ui, stage = 8) {
  const valid = new Set(focusOrder(tree, stage));
  if (!valid.has(ui.active)) ui.active = 0;
  if (!valid.has(ui.focus)) ui.focus = 0;
  if (!locate(tree, ui.hot, stage)) ui.hot = 0;
}
export function activate(tree: Tree, model: Model, id: number, stage = 8) {
  const p = locate(tree, id, stage);
  if (!p || !p.enabled || p.node.kind !== "Button") return;
  if (p.node.action === "Pause") setPaused(model, !model.paused);
  if (p.node.action === "Reset") resetSimulation(model);
}
export function drag(tree: Tree, model: Model, id: number, x: number, stage = 8) {
  const p = locate(tree, id, stage);
  if (p?.enabled && p.node.kind === "Slider")
    setGravity(model, ((x - p.bounds.x) / p.bounds.width) * 1200);
}
export function pointerDown(tree: Tree, model: Model, ui: Ui, point: Point, stage = 8) {
  if (stage < 5) return false;
  reconcile(tree, ui, stage);
  if (ui.active) return true;
  ui.hot = hitTest(tree, point, stage);
  const p = locate(tree, ui.hot, stage);
  ui.focus = 0;
  if (p?.enabled && (p.node.kind === "Button" || p.node.kind === "Slider")) {
    ui.active = p.node.id;
    if (stage >= 6) ui.focus = p.node.id;
    drag(tree, model, ui.active, point.x, stage);
  }
  return ui.hot !== 0;
}
export function pointerMove(tree: Tree, model: Model, ui: Ui, point: Point, stage = 8) {
  reconcile(tree, ui, stage);
  ui.hot = hitTest(tree, point, stage);
  if (stage >= 5) drag(tree, model, ui.active, point.x, stage);
}
export function pointerUp(tree: Tree, model: Model, ui: Ui, point: Point, stage = 8) {
  if (stage < 5) return;
  reconcile(tree, ui, stage);
  const active = ui.active;
  drag(tree, model, active, point.x, stage);
  ui.active = 0;
  ui.hot = hitTest(tree, point, stage);
  if (active && active === ui.hot) activate(tree, model, active, stage);
}
export function keyDown(
  tree: Tree,
  model: Model,
  ui: Ui,
  key: string,
  shift = false,
  repeat = false,
  stage = 8,
) {
  reconcile(tree, ui, stage);
  if (key === "Escape") {
    cancel(ui);
    return true;
  }
  if (stage < 6) return false;
  const order = focusOrder(tree, stage);
  if (key === "Tab") {
    if (repeat) return true;
    cancel(ui);
    const index = order.indexOf(ui.focus);
    if (!order.length) {
      ui.focus = 0;
      return false;
    }
    let next = index + 1;
    if (shift) next = index < 0 ? order.length - 1 : index - 1;
    ui.focus = order[(next + order.length) % order.length];
    return true;
  }
  if (ui.active) return true;
  if (key === " " || key === "Enter") {
    if (!repeat) activate(tree, model, ui.focus, stage);
    return ui.focus !== 0;
  }
  const p = locate(tree, ui.focus, stage);
  if (p?.node.kind !== "Slider") return false;
  if (key === "ArrowLeft") setGravity(model, model.gravity - 20);
  else if (key === "ArrowRight") setGravity(model, model.gravity + 20);
  else if (key === "Home") setGravity(model, 0);
  else if (key === "End") setGravity(model, 1200);
  else return false;
  return true;
}
