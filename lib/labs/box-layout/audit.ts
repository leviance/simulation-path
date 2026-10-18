import { paintList } from "../widget-tree/traversal.ts";
import type { Lab } from "./runtime.ts";
import { validStyle } from "./style.ts";
export function auditLayout(lab: Lab) {
  if (lab.dirty) throw new Error("Layout is dirty");
  let count = 0;
  const ids = new Set<number>();
  const walk = (node: Lab["tree"]["root"], depth: number) => {
    count++;
    const style = lab.styles.get(node.id);
    if (
      depth > 6 ||
      count > 32 ||
      node.id <= 0 ||
      node.id >= lab.tree.nextId ||
      ids.has(node.id) ||
      !style ||
      !validStyle(style, node) ||
      (node.kind !== "Panel" && node.children.length)
    )
      throw new Error("Invalid layout tree");
    ids.add(node.id);
    if (![node.local.x, node.local.y, node.local.width, node.local.height].every(Number.isFinite))
      throw new Error("Non-finite layout");
    if (node.local.width < 0 || node.local.height < 0) throw new Error("Negative layout size");
    for (const child of node.children) walk(child, depth + 1);
  };
  walk(lab.tree.root, 0);
  if (count !== lab.tree.count || lab.styles.size !== count)
    throw new Error("Ownership/style mismatch");
  return paintList(lab.tree).length;
}
