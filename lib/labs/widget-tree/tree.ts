import { validRect, type Rect } from "./geometry.ts";
export type Kind = "Panel" | "Button" | "Slider" | "Label";
export type Action = "None" | "Pause" | "Reset";
export type Binding = "None" | "Gravity" | "Time";
export type Widget = {
  id: number;
  kind: Kind;
  local: Rect;
  text: string;
  action: Action;
  binding: Binding;
  visible: boolean;
  enabled: boolean;
  children: Widget[];
};
export type Tree = { root: Widget; nextId: number; count: number; revision: number };
export const maxWidgets = 32,
  maxDepth = 6,
  maxId = 1000000;
export function createTree(): Tree {
  return {
    root: {
      id: 1,
      kind: "Panel",
      local: { x: 664, y: 24, width: 272, height: 492 },
      text: "Panel",
      action: "None",
      binding: "None",
      visible: true,
      enabled: true,
      children: [],
    },
    nextId: 2,
    count: 1,
    revision: 0,
  };
}
export function find(node: Widget, id: number): Widget | null {
  if (node.id === id) return node;
  for (const child of node.children) {
    const result = find(child, id);
    if (result) return result;
  }
  return null;
}
export function depthOf(node: Widget, id: number, depth = 0): number {
  if (node.id === id) return depth;
  for (const child of node.children) {
    const result = depthOf(child, id, depth + 1);
    if (result >= 0) return result;
  }
  return -1;
}
export function add(
  tree: Tree,
  parentId: number,
  kind: Kind,
  local: Rect,
  text = "",
  action: Action = "None",
  binding: Binding = "None",
) {
  const parent = find(tree.root, parentId);
  if (
    !parent ||
    parent.kind !== "Panel" ||
    tree.count >= maxWidgets ||
    tree.nextId > maxId ||
    depthOf(tree.root, parentId) >= maxDepth ||
    !validRect(local) ||
    !["Panel", "Button", "Slider", "Label"].includes(kind) ||
    !["None", "Pause", "Reset"].includes(action) ||
    !["None", "Gravity", "Time"].includes(binding) ||
    text.length > 40
  )
    throw new RangeError("widget parent, geometry or capacity");
  const node: Widget = {
    id: tree.nextId,
    kind,
    local: { ...local },
    text,
    action,
    binding,
    visible: true,
    enabled: true,
    children: [],
  };
  parent.children.push(node);
  tree.nextId++;
  tree.count++;
  tree.revision++;
  return node.id;
}
export function subtreeSize(node: Widget): number {
  return 1 + node.children.reduce((sum, child) => sum + subtreeSize(child), 0);
}
export function remove(tree: Tree, id: number): boolean {
  if (id === tree.root.id) return false;
  const erase = (parent: Widget): boolean => {
    const index = parent.children.findIndex((child) => child.id === id);
    if (index >= 0) {
      tree.count -= subtreeSize(parent.children[index]);
      parent.children.splice(index, 1);
      tree.revision++;
      return true;
    }
    return parent.children.some(erase);
  };
  return erase(tree.root);
}
