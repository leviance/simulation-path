import type { Point } from "./geometry.ts";

export const TAU = Math.PI * 2;

export function normalizeAngle(angle: number) {
  if (!Number.isFinite(angle)) {
    return 0;
  }
  const remainder = angle % TAU;
  return remainder < 0 ? remainder + TAU : remainder;
}

export function pointOnUnitCircle(angle: number): Point {
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

export function projectOntoXAxis(point: Point): Point {
  return { x: point.x, y: 0 };
}

export function projectOntoYAxis(point: Point): Point {
  return { x: 0, y: point.y };
}

export function mapSampleTimeToX(
  sampleTime: number,
  newestTime: number,
  visibleDuration: number,
  left: number,
  right: number,
) {
  if (
    !Number.isFinite(sampleTime) ||
    !Number.isFinite(newestTime) ||
    !Number.isFinite(visibleDuration) ||
    visibleDuration <= 0
  ) {
    return left;
  }
  const oldestTime = newestTime - visibleDuration;
  if (sampleTime <= oldestTime) {
    return left;
  }
  if (sampleTime >= newestTime) {
    return right;
  }
  const progress = (sampleTime - oldestTime) / visibleDuration;
  return left + (right - left) * progress;
}

export function angleFromPoint(point: Point) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return 0;
  }
  if (Math.abs(point.x) <= 1e-12 && Math.abs(point.y) <= 1e-12) {
    return 0;
  }
  return normalizeAngle(Math.atan2(point.y, point.x));
}
