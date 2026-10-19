import { clamp, scale, subtract, type Point } from "./geometry.ts";
import { normalizeAngle, pointOnUnitCircle } from "./angle.ts";

export function turretHasDirection(vector: Point) {
  return (
    Number.isFinite(vector.x) && Number.isFinite(vector.y) && (vector.x !== 0 || vector.y !== 0)
  );
}

export function turretNormalize(vector: Point): Point {
  if (!turretHasDirection(vector)) return { x: 0, y: 0 };
  const largest = Math.max(Math.abs(vector.x), Math.abs(vector.y));
  const scaled = { x: vector.x / largest, y: vector.y / largest };
  const magnitude = Math.hypot(scaled.x, scaled.y);
  return { x: scaled.x / magnitude, y: scaled.y / magnitude };
}

export function dot(a: Point, b: Point) {
  return a.x * b.x + a.y * b.y;
}

export function clampCosine(value: number) {
  return Number.isFinite(value) ? clamp(value, -1, 1) : 0;
}

export function cosineBetween(a: Point, b: Point) {
  if (!turretHasDirection(a) || !turretHasDirection(b)) return 0;
  return clampCosine(dot(turretNormalize(a), turretNormalize(b)));
}

export function angleBetween(a: Point, b: Point) {
  if (!turretHasDirection(a) || !turretHasDirection(b)) return 0;
  return Math.acos(clampCosine(cosineBetween(a, b)));
}

export function scalarProjection(vector: Point, onto: Point) {
  if (!turretHasDirection(onto)) return 0;
  return dot(vector, turretNormalize(onto));
}

export function vectorProjection(vector: Point, onto: Point): Point {
  if (!turretHasDirection(onto)) return { x: 0, y: 0 };
  const unitOnto = turretNormalize(onto);
  return scale(unitOnto, dot(vector, unitOnto));
}

export function rejection(vector: Point, onto: Point): Point {
  return subtract(vector, vectorProjection(vector, onto));
}

export function crossZ(a: Point, b: Point) {
  return a.x * b.y - a.y * b.x;
}

export function signedAngleBetween(from: Point, to: Point) {
  if (!turretHasDirection(from) || !turretHasDirection(to)) return 0;
  const a = turretNormalize(from),
    b = turretNormalize(to);
  const sine = crossZ(a, b),
    cosine = dot(a, b);
  if (sine === 0 && cosine < 0) return Math.PI;
  return Math.atan2(sine, cosine);
}

export function rotateTowards(currentAngle: number, targetDirection: Point, maximumStep: number) {
  const current = normalizeAngle(currentAngle);
  if (!Number.isFinite(maximumStep) || maximumStep <= 0 || !turretHasDirection(targetDirection))
    return current;
  const remaining = signedAngleBetween(pointOnUnitCircle(current), targetDirection);
  return normalizeAngle(current + clamp(remaining, -maximumStep, maximumStep));
}

export function isWithinViewCone(forward: Point, targetDirection: Point, halfAngle: number) {
  if (
    !turretHasDirection(forward) ||
    !turretHasDirection(targetDirection) ||
    !Number.isFinite(halfAngle)
  )
    return false;
  return cosineBetween(forward, targetDirection) >= Math.cos(clamp(halfAngle, 0, Math.PI)) - 1e-12;
}
