import { contains, type Point } from "./geometry.ts";
import {
  resetSimulation,
  setGravity,
  setPaused,
  floorY,
  ballRadius,
  fixedDt,
  stepPhysics,
  type Model,
} from "./simulation.ts";
export type Control = "None" | "Pause" | "Reset" | "Gravity";
export type Ui = { hot: Control; active: Control; focus: Control };
export const panel = { x: 664, y: 24, width: 272, height: 492 };
export const pauseButton = { x: 688, y: 80, width: 224, height: 44 };
export const resetButton = { x: 688, y: 140, width: 224, height: 44 };
export const gravitySlider = { x: 688, y: 232, width: 224, height: 40 };
export const scene = { x: 24, y: 24, width: 616, height: 492 };
export function createUi(): Ui {
  return { hot: "None", active: "None", focus: "None" };
}
export function hitTest(point: Point, stage = 7): Control {
  if (stage < 2) return "None";
  if (contains(pauseButton, point)) return "Pause";
  if (contains(resetButton, point)) return "Reset";
  if (stage >= 4 && contains(gravitySlider, point)) return "Gravity";
  return "None";
}
export function cancelPointer(ui: Ui) {
  ui.active = "None";
  ui.hot = "None";
}
export function activate(model: Model, control: Control) {
  if (control === "Pause") setPaused(model, !model.paused);
  if (control === "Reset") resetSimulation(model);
}
export function dragGravity(model: Model, x: number) {
  const t = (x - gravitySlider.x) / gravitySlider.width;
  setGravity(model, t * 1200);
}
export function pointerDown(model: Model, ui: Ui, point: Point, stage = 7) {
  if (ui.active !== "None") return true;
  ui.hot = hitTest(point, stage);
  if (stage < 3) return stage >= 2 && contains(panel, point);
  ui.active = ui.hot;
  if (stage >= 5) ui.focus = ui.hot;
  if (ui.active === "Gravity") dragGravity(model, point.x);
  return contains(panel, point);
}
export function pointerMove(model: Model, ui: Ui, point: Point, stage = 7) {
  ui.hot = hitTest(point, stage);
  if (ui.active === "Gravity") dragGravity(model, point.x);
}
export function pointerUp(model: Model, ui: Ui, point: Point, stage = 7) {
  if (stage < 3) return;
  const pressed = ui.active;
  if (pressed === "Gravity") dragGravity(model, point.x);
  ui.active = "None";
  ui.hot = hitTest(point, stage);
  if (pressed !== "None" && pressed === ui.hot) activate(model, pressed);
}
export function keyDown(
  model: Model,
  ui: Ui,
  key: string,
  shift = false,
  repeat = false,
  stage = 7,
) {
  if (key.toLowerCase() === "n" && ui.active === "None") {
    if (!repeat && model.paused) stepPhysics(model);
    return true;
  }
  if (stage < 5) {
    if (key === " ") {
      if (!repeat && ui.active === "None") setPaused(model, !model.paused);
      return true;
    }
    if (key !== "Escape") return false;
  }
  if (key === "Escape") {
    cancelPointer(ui);
    return true;
  }
  if (key === "Tab") {
    if (repeat) return true;
    cancelPointer(ui);
    if (shift) {
      if (ui.focus === "Reset") ui.focus = "Pause";
      else if (ui.focus === "Gravity") ui.focus = "Reset";
      else ui.focus = "Gravity";
    } else {
      if (ui.focus === "Pause") ui.focus = "Reset";
      else if (ui.focus === "Reset") ui.focus = "Gravity";
      else ui.focus = "Pause";
    }
    return true;
  }
  if (ui.active !== "None") return true;
  if (key === "Enter" || key === " ") {
    if (!repeat) activate(model, ui.focus);
    return ui.focus !== "None";
  }
  if (ui.focus !== "Gravity") return false;
  if (key === "ArrowLeft") {
    setGravity(model, model.gravity - 20);
    return true;
  }
  if (key === "ArrowRight") {
    setGravity(model, model.gravity + 20);
    return true;
  }
  if (key === "Home") {
    setGravity(model, 0);
    return true;
  }
  if (key === "End") {
    setGravity(model, 1200);
    return true;
  }
  return false;
}
export function scenePointerDown(model: Model, point: Point) {
  if (!contains(scene, point)) return;
  model.y = Math.max(48, Math.min(floorY - ballRadius, point.y));
  model.velocity = 0;
  model.accumulator = 0;
  model.scenePresses++;
  model.clockRevision++;
}
export function suspend(model: Model, ui: Ui) {
  cancelPointer(ui);
  setPaused(model, true);
  model.accumulator = 0;
}
export function audit(model: Model, ui: Ui) {
  const finite = [model.y, model.velocity, model.gravity, model.accumulator].every(Number.isFinite);
  const bounds =
    model.y >= 48 && model.y <= floorY - ballRadius && model.gravity >= 0 && model.gravity <= 1200;
  const clock = model.accumulator >= 0 && model.accumulator < fixedDt + 1e-12;
  const valid = ["None", "Pause", "Reset", "Gravity"];
  return (
    finite &&
    bounds &&
    clock &&
    [ui.hot, ui.active, ui.focus].every((c) => valid.includes(c)) &&
    model.scenePresses >= 0
  );
}
