import type { Point } from "./geometry.ts";

export type RasterStep = {
  point: Point;
  error?: number;
  e2?: number;
  movesX?: boolean;
  movesY?: boolean;
  x?: number;
  y?: number;
};

export type CircleStep = { x: number; y: number; decision: number; points: Point[] };

// std::lround chọn nửa đơn vị ra xa zero, khác Math.round với số âm.
export function roundLikeCpp(value: number) {
  const rounded = value < 0 ? -Math.round(-value) : Math.round(value);
  return rounded === 0 ? 0 : rounded;
}

function integerPoint(point: Point): Point | null {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) return null;
  const result = { x: roundLikeCpp(point.x), y: roundLikeCpp(point.y) };
  if (Math.abs(result.x) > 4096 || Math.abs(result.y) > 4096) return null;
  return result;
}

export function ddaSteps(first: Point, second: Point): RasterStep[] {
  const start = integerPoint(first);
  const end = integerPoint(second);
  if (!start || !end) return [];
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const count = Math.max(Math.abs(dx), Math.abs(dy));
  if (count === 0) return [{ point: start, x: start.x, y: start.y }];
  const output: RasterStep[] = [];
  for (let index = 0; index <= count; index++) {
    const t = index / count;
    const x = start.x + dx * t;
    const y = start.y + dy * t;
    output.push({ point: { x: roundLikeCpp(x), y: roundLikeCpp(y) }, x, y });
  }
  return output;
}

export function bresenhamSteps(first: Point, second: Point): RasterStep[] {
  const start = integerPoint(first);
  const end = integerPoint(second);
  if (!start || !end) return [];
  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const dy = -Math.abs(end.y - start.y);
  const stepX = start.x < end.x ? 1 : -1;
  const stepY = start.y < end.y ? 1 : -1;
  let error = dx + dy;
  const output: RasterStep[] = [];
  for (;;) {
    const e2 = 2 * error;
    if (x === end.x && y === end.y) {
      output.push({ point: { x, y }, error, e2, movesX: false, movesY: false });
      break;
    }
    const movesX = e2 >= dy;
    const movesY = e2 <= dx;
    output.push({ point: { x, y }, error, e2, movesX, movesY });
    if (movesX) {
      error += dy;
      x += stepX;
    }
    if (movesY) {
      error += dx;
      y += stepY;
    }
  }
  return output;
}

export function uniqueSortedPoints(points: Point[]) {
  const unique = new Map<string, Point>();
  for (const point of points) unique.set(`${point.x},${point.y}`, point);
  return [...unique.values()].sort((a, b) => a.x - b.x || a.y - b.y);
}

export function rectanglePixels(first: Point, second: Point, filled: boolean) {
  const a = integerPoint(first);
  const b = integerPoint(second);
  if (!a || !b) return [];
  const left = Math.min(a.x, b.x);
  const right = Math.max(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const bottom = Math.max(a.y, b.y);
  const points: Point[] = [];
  if (filled) {
    if (right - left + 1 > 1024 || bottom - top + 1 > 1024) return [];
    for (let y = top; y <= bottom; y++) for (let x = left; x <= right; x++) points.push({ x, y });
    return points;
  }
  const corners = [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
  for (let edge = 0; edge < 4; edge++)
    for (const step of bresenhamSteps(corners[edge], corners[(edge + 1) % 4]))
      points.push(step.point);
  return uniqueSortedPoints(points);
}

function symmetricCirclePoints(center: Point, x: number, y: number) {
  return uniqueSortedPoints([
    { x: center.x + x, y: center.y + y },
    { x: center.x + y, y: center.y + x },
    { x: center.x - y, y: center.y + x },
    { x: center.x - x, y: center.y + y },
    { x: center.x - x, y: center.y - y },
    { x: center.x - y, y: center.y - x },
    { x: center.x + y, y: center.y - x },
    { x: center.x + x, y: center.y - y },
  ]);
}

export function midpointCircleSteps(point: Point, radius: number): CircleStep[] {
  const center = integerPoint(point);
  if (!center || !Number.isFinite(radius)) return [];
  const safeRadius = roundLikeCpp(radius);
  if (safeRadius < 0 || safeRadius > 256) return [];
  let x = safeRadius;
  let y = 0;
  let decision = 1 - safeRadius;
  const steps: CircleStep[] = [];
  while (x >= y) {
    steps.push({ x, y, decision, points: symmetricCirclePoints(center, x, y) });
    y++;
    if (decision < 0) decision += 2 * y + 1;
    else {
      x--;
      decision += 2 * (y - x) + 1;
    }
  }
  return steps;
}

export function midpointCircle(center: Point, radius: number) {
  return uniqueSortedPoints(midpointCircleSteps(center, radius).flatMap((step) => step.points));
}

// Cùng quy tắc với filledCircle C++: tô tới viền midpoint, không dùng ctx.arc.
export function filledCircle(point: Point, radius: number) {
  const center = integerPoint(point);
  const outline = midpointCircle(point, radius);
  if (!center || outline.length === 0) return [];
  const safeRadius = roundLikeCpp(radius);
  const extents = Array<number>(2 * safeRadius + 1).fill(-1);
  for (const pixel of outline) {
    const row = pixel.y - center.y + safeRadius;
    extents[row] = Math.max(extents[row], Math.abs(pixel.x - center.x));
  }
  const points: Point[] = [];
  for (let row = 0; row <= 2 * safeRadius; row++)
    for (let x = center.x - extents[row]; x <= center.x + extents[row]; x++)
      points.push({ x, y: center.y - safeRadius + row });
  return points;
}
