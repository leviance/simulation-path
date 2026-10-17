import { contains, intersect, viewport, type Point, type Rect } from "./geometry.ts";
import { type Tree, type Widget } from "./tree.ts";
export type Placed = { node: Widget; bounds: Rect; clip: Rect; enabled: boolean; depth: number };
export function place(
  node: Widget,
  origin: Point,
  clip: Rect,
  enabled: boolean,
  depth: number,
  stage = 8,
): Placed | null {
  if (stage >= 7 && !node.visible) return null;
  const bounds = { ...node.local, x: origin.x + node.local.x, y: origin.y + node.local.y };
  const effectiveClip = stage >= 3 ? intersect(bounds, clip) : clip;
  if (effectiveClip.width <= 0 || effectiveClip.height <= 0) return null;
  return {
    node,
    bounds,
    clip: effectiveClip,
    enabled: enabled && (stage < 7 || node.enabled),
    depth,
  };
}
export function paintList(tree: Tree, stage = 8): Placed[] {
  const result: Placed[] = [];
  const visit = (node: Widget, origin: Point, clip: Rect, enabled: boolean, depth: number) => {
    const p = place(node, origin, clip, enabled, depth, stage);
    if (!p) return;
    result.push(p);
    for (const child of node.children) visit(child, p.bounds, p.clip, p.enabled, depth + 1);
  };
  visit(tree.root, { x: 0, y: 0 }, viewport, true, 0);
  return result;
}
export function locate(tree: Tree, id: number, stage = 8) {
  return paintList(tree, stage).find((p) => p.node.id === id) ?? null;
}
export function hitTest(tree: Tree, point: Point, stage = 8): number {
  if (stage < 4 || !contains(viewport, point)) return 0;
  const pick = (
    node: Widget,
    origin: Point,
    clip: Rect,
    enabled: boolean,
    depth: number,
  ): number => {
    const p = place(node, origin, clip, enabled, depth, stage);
    if (!p || !contains(p.clip, point) || !contains(p.bounds, point)) return 0;
    for (let i = node.children.length - 1; i >= 0; i--) {
      const hit = pick(node.children[i], p.bounds, p.clip, p.enabled, depth + 1);
      if (hit) return hit;
    }
    if (node.kind === "Panel") return node.id;
    if (node.kind === "Button" || node.kind === "Slider") return node.id;
    return 0;
  };
  return pick(tree.root, { x: 0, y: 0 }, viewport, true, 0);
}
export function focusOrder(tree: Tree, stage = 8) {
  return paintList(tree, stage)
    .filter((p) => p.enabled && (p.node.kind === "Button" || p.node.kind === "Slider"))
    .map((p) => p.node.id);
}
