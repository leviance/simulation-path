import type { Widget } from "../widget-tree/tree.ts";
export type Edges = { left: number; top: number; right: number; bottom: number };
export type BoxStyle = {
  width: "Fill" | "Fixed";
  fixedWidth: number;
  height: "Auto" | "Fixed";
  fixedHeight: number;
  margin: Edges;
  padding: Edges;
  border: number;
  gap: number;
};
export const edges = (value: number): Edges => ({
  left: value,
  top: value,
  right: value,
  bottom: value,
});
export function defaultStyle(node: Widget): BoxStyle {
  let fixedHeight = 24;
  if (node.kind === "Button") fixedHeight = 36;
  if (node.kind === "Slider") fixedHeight = 32;
  return {
    width: "Fill",
    fixedWidth: 180,
    height: node.kind === "Panel" ? "Auto" : "Fixed",
    fixedHeight,
    margin: edges(4),
    padding: edges(node.kind === "Panel" ? 12 : 4),
    border: node.kind === "Panel" ? 2 : 1,
    gap: 8,
  };
}
function validEdges(value: Edges, maximum: number) {
  return [value.left, value.top, value.right, value.bottom].every(
    (v) => Number.isFinite(v) && v >= 0 && v <= maximum,
  );
}
export function validStyle(style: BoxStyle, node: Widget) {
  return (
    ["Fill", "Fixed"].includes(style.width) &&
    ["Auto", "Fixed"].includes(style.height) &&
    (style.height === "Fixed" || node.kind === "Panel") &&
    Number.isFinite(style.fixedWidth) &&
    style.fixedWidth >= 8 &&
    style.fixedWidth <= 600 &&
    Number.isFinite(style.fixedHeight) &&
    style.fixedHeight >= 8 &&
    style.fixedHeight <= 540 &&
    validEdges(style.margin, 64) &&
    validEdges(style.padding, 48) &&
    Number.isFinite(style.border) &&
    style.border >= 0 &&
    style.border <= 8 &&
    Number.isFinite(style.gap) &&
    style.gap >= 0 &&
    style.gap <= 32
  );
}
