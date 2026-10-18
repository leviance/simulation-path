import type { Point } from "./geometry.ts";

export function sampleStroke(start: Point, end: Point, spacing: number): Point[] {
  if (![start.x, start.y, end.x, end.y].every(Number.isFinite)) return [];
  const length = Math.hypot(end.x - start.x, end.y - start.y);
  if (!Number.isFinite(length) || length > 2048) return [];
  if (length === 0) return [{ ...start }];
  const safeSpacing = Number.isFinite(spacing) ? Math.max(0.5, spacing) : 0.5;
  const steps = Math.max(1, Math.ceil(length / safeSpacing));
  const points = [{ ...start }];
  for (let index = 1; index < steps; index += 1) {
    const t = index / steps;
    points.push({ x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t });
  }
  points.push({ ...end });
  return points;
}

// Giới hạn bộ dữ liệu của lab; không tăng spacing để âm thầm che việc vượt budget.
export function interpolateStroke(points: Point[], spacing: number): Point[] {
  if (!points.length || points.length > 512) return [];
  const result = sampleStroke(points[0], points[0], spacing);
  if (!result.length) return [];
  for (let index = 1; index < points.length; index += 1) {
    const segment = sampleStroke(points[index - 1], points[index], spacing);
    if (!segment.length || result.length + segment.length - 1 > 65536) return [];
    result.push(...segment.slice(1));
  }
  return result;
}

export function maximumGap(points: Point[]): number {
  let maximum = 0;
  for (let index = 1; index < points.length; index += 1) {
    maximum = Math.max(
      maximum,
      Math.hypot(points[index].x - points[index - 1].x, points[index].y - points[index - 1].y),
    );
  }
  return maximum;
}

export function thinStroke(points: Point[], every: number): Point[] {
  if (points.length <= 1) return points.slice();
  const interval = Math.max(1, Math.trunc(every) || 1);
  const kept = points.filter((_, index) => index % interval === 0);
  const last = points.at(-1)!;
  if (kept.at(-1) !== last) kept.push(last);
  return kept;
}
