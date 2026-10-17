export type Point = { x: number; y: number };
export type Rect = Point & { width: number; height: number };
export const canvasWidth = 960;
export const canvasHeight = 540;

// Half-open bounds match the C++ hit-test, including shared rectangle edges.
export function contains(rect: Rect, point: Point) {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= rect.x &&
    point.x < rect.x + rect.width &&
    point.y >= rect.y &&
    point.y < rect.y + rect.height
  );
}

export function windowToLogical(point: Point, width: number, height: number): Point | null {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return null;
  const scale = Math.min(width / canvasWidth, height / canvasHeight);
  const offsetX = (width - canvasWidth * scale) / 2;
  const offsetY = (height - canvasHeight * scale) / 2;
  const logical = { x: (point.x - offsetX) / scale, y: (point.y - offsetY) / scale };
  if (!Number.isFinite(logical.x) || !Number.isFinite(logical.y)) return null;
  return logical;
}
