import { validRect } from "./geometry.ts";
import { maxDepth, maxId, maxWidgets, type Tree, type Widget } from "./tree.ts";
import { focusOrder, locate } from "./traversal.ts";
import type { Ui } from "./input.ts";
export function audit(tree: Tree, ui: Ui) {
  const ids = new Set<number>();
  let count = 0;
  const check = (node: Widget, depth: number) => {
    if (
      ++count > maxWidgets ||
      depth > maxDepth ||
      !Number.isInteger(node.id) ||
      node.id < 1 ||
      node.id >= tree.nextId ||
      ids.has(node.id) ||
      !validRect(node.local) ||
      (node.kind !== "Panel" && node.children.length)
    )
      throw Error("invalid widget tree");
    ids.add(node.id);
    for (const child of node.children) check(child, depth + 1);
  };
  check(tree.root, 0);
  if (
    tree.root.kind !== "Panel" ||
    count !== tree.count ||
    !Number.isInteger(tree.nextId) ||
    tree.nextId > maxId + 1
  )
    throw Error("invalid tree counts");
  const focus = new Set(focusOrder(tree));
  if (
    (ui.active && !focus.has(ui.active)) ||
    (ui.focus && !focus.has(ui.focus)) ||
    (ui.hot && !locate(tree, ui.hot))
  )
    throw Error("stale widget id");
  return count;
}
