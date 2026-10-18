import type { Rect } from "../widget-tree/geometry.ts";
import type { Widget } from "../widget-tree/tree.ts";
import { validStyle, type BoxStyle } from "./style.ts";
export type Size = { width: number; height: number; naturalHeight: number };
export type Styles = Map<number, BoxStyle>;
export type Measures = Map<number, Size>;
export function contentBox(box: Rect, style: BoxStyle): Rect {
  return {
    x: box.x + style.border + style.padding.left,
    y: box.y + style.border + style.padding.top,
    width: Math.max(0, box.width - 2 * style.border - style.padding.left - style.padding.right),
    height: Math.max(0, box.height - 2 * style.border - style.padding.top - style.padding.bottom),
  };
}
// availableWidth là chiều rộng ngoài, chưa trừ margin của node đang đo.
export function measure(
  node: Widget,
  availableWidth: number,
  styles: Styles,
  sizes: Measures,
): Size {
  const style = styles.get(node.id);
  if (
    !style ||
    !validStyle(style, node) ||
    !Number.isFinite(availableWidth) ||
    availableWidth < 0 ||
    availableWidth > 960
  )
    throw new RangeError("Invalid layout input");
  let width = style.fixedWidth;
  if (style.width === "Fill")
    width = Math.max(0, availableWidth - style.margin.left - style.margin.right);
  let naturalHeight = style.fixedHeight;
  if (node.kind === "Panel") {
    const innerWidth = contentBox({ x: 0, y: 0, width, height: 0 }, style).width;
    let childrenHeight = 0,
      visibleCount = 0;
    for (const child of node.children) {
      if (!child.visible) continue;
      const childSize = measure(child, innerWidth, styles, sizes);
      const childStyle = styles.get(child.id)!;
      if (visibleCount > 0) childrenHeight += style.gap;
      childrenHeight += childStyle.margin.top + childSize.height + childStyle.margin.bottom;
      visibleCount++;
    }
    naturalHeight = 2 * style.border + style.padding.top + childrenHeight + style.padding.bottom;
  }
  const height = style.height === "Auto" ? naturalHeight : style.fixedHeight;
  const result = { width, height, naturalHeight };
  sizes.set(node.id, result);
  return result;
}
// Chỉ bước arrange được ghi vào local; Style không bị dùng làm output.
export function arrange(node: Widget, x: number, y: number, styles: Styles, sizes: Measures) {
  const size = sizes.get(node.id)!;
  node.local = { x, y, width: size.width, height: size.height };
  const style = styles.get(node.id)!;
  const content = contentBox({ ...node.local, x: 0, y: 0 }, style);
  let cursorY = content.y,
    visibleCount = 0;
  for (const child of node.children) {
    if (!child.visible) continue;
    const childStyle = styles.get(child.id)!,
      childSize = sizes.get(child.id)!;
    if (visibleCount > 0) cursorY += style.gap;
    const childX = content.x + childStyle.margin.left;
    const childY = cursorY + childStyle.margin.top;
    arrange(child, childX, childY, styles, sizes);
    cursorY = childY + childSize.height + childStyle.margin.bottom;
    visibleCount++;
  }
}
