export {
  contains,
  windowToLogical,
  type Point,
  type Rect,
} from "../simulator-controls/geometry.ts";
import type { Rect } from "../simulator-controls/geometry.ts";
export const viewport: Rect = { x: 0, y: 0, width: 960, height: 540 };
export function intersect(a: Rect, b: Rect): Rect {
  const x = Math.max(a.x, b.x),
    y = Math.max(a.y, b.y);
  return {
    x,
    y,
    width: Math.max(0, Math.min(a.x + a.width, b.x + b.width) - x),
    height: Math.max(0, Math.min(a.y + a.height, b.y + b.height) - y),
  };
}
export function validRect(r: Rect) {
  return (
    [r.x, r.y, r.width, r.height].every(Number.isFinite) &&
    Math.abs(r.x) <= 2000 &&
    Math.abs(r.y) <= 2000 &&
    r.width > 0 &&
    r.width <= 960 &&
    r.height > 0 &&
    r.height <= 540
  );
}
