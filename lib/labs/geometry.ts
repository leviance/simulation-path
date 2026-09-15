export type Point = { x: number; y: number };
export type ViewportSize = { width: number; height: number };

export function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function add(left: Point, right: Point): Point {
  return { x: left.x + right.x, y: left.y + right.y };
}

export function subtract(left: Point, right: Point): Point {
  return { x: left.x - right.x, y: left.y - right.y };
}

export function scale(vector: Point, scalar: number): Point {
  return { x: vector.x * scalar, y: vector.y * scalar };
}

export function length(vector: Point) {
  return Math.hypot(vector.x, vector.y);
}

export function normalize(vector: Point): Point {
  const magnitude = length(vector);
  if (!Number.isFinite(magnitude) || magnitude <= 1e-12) {
    return { x: 0, y: 0 };
  }
  return scale(vector, 1 / magnitude);
}

export function hasDirection(vector: Point) {
  const magnitude = length(vector);
  return Number.isFinite(magnitude) && magnitude > 1e-12;
}

export function distance(start: Point, end: Point) {
  return length(subtract(end, start));
}

export function lerp(start: Point, end: Point, t: number): Point {
  return add(start, scale(subtract(end, start), t));
}
