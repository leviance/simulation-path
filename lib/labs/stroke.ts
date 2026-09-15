import type { Point } from "./geometry.ts";

export function interpolateStroke(points: Point[], spacing: number): Point[] {
  if (!points.length) return [];
  const result = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const start = points[index - 1];
    const end = points[index];
    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const steps = Math.max(1, Math.ceil(distance / Math.max(spacing, 0.5)));
    for (let step = 1; step <= steps; step += 1) {
      result.push({
        x: start.x + ((end.x - start.x) * step) / steps,
        y: start.y + ((end.y - start.y) * step) / steps,
      });
    }
  }
  return result;
}
