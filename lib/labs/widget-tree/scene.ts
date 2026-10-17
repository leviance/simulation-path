import { add, createTree, find, type Tree } from "./tree.ts";
export const presetNames = [
  "Panel lồng nhau",
  "Cắt ở mép Panel",
  "Hai button chồng nhau",
  "Panel che một phần cảnh",
];
export function buildTree(stage = 8, preset = 0) {
  if (
    !Number.isInteger(stage) ||
    stage < 1 ||
    stage > 8 ||
    !Number.isInteger(preset) ||
    preset < 0 ||
    preset > 3
  )
    throw new RangeError("stage/preset");
  const tree = createTree();
  if (preset === 3) tree.root.local.x = 520;
  add(tree, 1, "Label", { x: 24, y: 16, width: 224, height: 24 }, "SIMULATOR");
  let parent = 1;
  if (stage >= 2)
    parent = add(
      tree,
      1,
      "Panel",
      { x: 24, y: 56, width: 224, height: preset === 1 && stage >= 3 ? 96 : 300 },
      "Controls",
    );
  const offset = stage >= 2 ? { x: 0, y: 0 } : { x: 24, y: 56 };
  const pause = add(
    tree,
    parent,
    "Button",
    { ...offset, width: 224, height: 44 },
    "Pause / Resume",
    "Pause",
  );
  let reset = 0,
    slider = 0;
  if (stage >= 2)
    reset = add(
      tree,
      parent,
      "Button",
      { x: 0, y: 60, width: 224, height: 44 },
      "Reset scene",
      "Reset",
    );
  if (stage >= 5) {
    add(tree, parent, "Label", { x: 0, y: 128, width: 224, height: 24 }, "Gravity (px/s2)");
    slider = add(tree, parent, "Slider", { x: 0, y: 152, width: 224, height: 40 });
    add(tree, parent, "Label", { x: 0, y: 204, width: 224, height: 24 }, "", "None", "Gravity");
    add(tree, 1, "Label", { x: 24, y: 390, width: 224, height: 24 }, "", "None", "Time");
  }
  if (preset === 2 && stage >= 4)
    add(tree, parent, "Button", { ...offset, width: 224, height: 44 }, "Reset on top", "Reset");
  return { tree, group: parent, pause, reset, slider };
}
export function movePanel(tree: Tree, dx: number, dy: number) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return;
  tree.root.local.x = Math.max(0, Math.min(688, tree.root.local.x + dx));
  tree.root.local.y = Math.max(0, Math.min(48, tree.root.local.y + dy));
  tree.revision++;
}
export function setVisible(tree: Tree, id: number, visible: boolean) {
  const node = find(tree.root, id);
  if (node) {
    node.visible = visible;
    tree.revision++;
  }
}
export function setEnabled(tree: Tree, id: number, enabled: boolean) {
  const node = find(tree.root, id);
  if (node) {
    node.enabled = enabled;
    tree.revision++;
  }
}
