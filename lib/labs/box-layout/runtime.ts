import { add, remove } from "../widget-tree/tree.ts";
import { cancel, reconcile, type Ui } from "../widget-tree/input.ts";
import { defaultStyle } from "./style.ts";
import { arrange, measure, type Measures } from "./layout.ts";
import { buildScene, find } from "./scene.ts";
export function createLab(stage = 9) {
  return {
    ...buildScene(stage),
    stage,
    width: 320,
    dirty: true,
    passes: 0,
    sizes: new Map() as Measures,
    extras: [] as number[],
    overflow: false,
  };
}
export type Lab = ReturnType<typeof createLab>;
export function invalidate(lab: Lab, ui: Ui) {
  lab.dirty = true;
  cancel(ui);
}
export function ensureLayout(lab: Lab, ui: Ui) {
  if (lab.stage >= 7 && !lab.dirty) return false;
  lab.sizes.clear();
  if (lab.stage >= 3) {
    measure(lab.tree.root, lab.width, lab.styles, lab.sizes);
    if (lab.stage >= 4) arrange(lab.tree.root, 936 - lab.width, 24, lab.styles, lab.sizes);
    lab.passes++;
  }
  lab.dirty = false;
  reconcile(lab.tree, ui);
  return true;
}
export function setWidth(lab: Lab, ui: Ui, value: number) {
  if (!Number.isFinite(value) || value < 220 || value > 420) return false;
  if (value !== lab.width) {
    lab.width = value;
    invalidate(lab, ui);
  }
  return true;
}
export function setSpacing(lab: Lab, ui: Ui, gap: number, padding: number) {
  if (
    !Number.isFinite(gap) ||
    gap < 0 ||
    gap > 32 ||
    !Number.isFinite(padding) ||
    padding < 0 ||
    padding > 48
  )
    return false;
  let changed = false;
  for (const id of [1, lab.group]) {
    const style = lab.styles.get(id);
    if (!style) continue;
    const targetPadding = id === 1 ? padding : Math.max(0, padding - 4);
    if (
      style.gap === gap &&
      style.padding.left === targetPadding &&
      style.padding.top === targetPadding &&
      style.padding.right === targetPadding &&
      style.padding.bottom === targetPadding
    )
      continue;
    style.gap = gap;
    style.padding = {
      left: targetPadding,
      top: targetPadding,
      right: targetPadding,
      bottom: targetPadding,
    };
    changed = true;
  }
  if (changed) invalidate(lab, ui);
  return true;
}
export function toggleReset(lab: Lab, ui: Ui) {
  const node = find(lab.tree.root, lab.reset)!;
  node.visible = !node.visible;
  invalidate(lab, ui);
}
export function appendLabel(lab: Lab, ui: Ui) {
  if (lab.extras.length >= 4 || !lab.group) return false;
  const id = add(lab.tree, lab.group, "Label", { x: 0, y: 0, width: 1, height: 24 }, "Added Label");
  lab.styles.set(id, defaultStyle(find(lab.tree.root, id)!));
  lab.extras.push(id);
  invalidate(lab, ui);
  return true;
}
export function removeLabel(lab: Lab, ui: Ui) {
  const id = lab.extras.pop();
  if (!id) return false;
  remove(lab.tree, id);
  lab.styles.delete(id);
  invalidate(lab, ui);
  return true;
}
export function setOverflow(lab: Lab, ui: Ui, enabled: boolean) {
  if (lab.overflow === enabled) return;
  const style = lab.styles.get(lab.slider)!;
  style.width = enabled ? "Fixed" : "Fill";
  style.fixedWidth = 320;
  lab.overflow = enabled;
  invalidate(lab, ui);
}
