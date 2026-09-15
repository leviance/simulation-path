import { clamp, hasDirection, length, normalize, scale, subtract, type Point } from "./geometry.ts";
import { normalizeAngle, pointOnUnitCircle } from "./angle.ts";

export function dot(left: Point, right: Point) {
  return left.x * right.x + left.y * right.y;
}

export function clampCosine(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return clamp(value, -1, 1);
}

export function cosineBetween(left: Point, right: Point) {
  if (!hasDirection(left) || !hasDirection(right)) {
    return 0;
  }
  return clampCosine(dot(left, right) / (length(left) * length(right)));
}

export function angleBetween(left: Point, right: Point) {
  if (!hasDirection(left) || !hasDirection(right)) {
    return 0;
  }
  return Math.acos(cosineBetween(left, right));
}

export function scalarProjection(vector: Point, onto: Point) {
  if (!hasDirection(onto)) {
    return 0;
  }
  return dot(vector, normalize(onto));
}

export function vectorProjection(vector: Point, onto: Point): Point {
  if (!hasDirection(onto)) {
    return { x: 0, y: 0 };
  }
  const unitOnto = normalize(onto);
  return scale(unitOnto, dot(vector, unitOnto));
}

export function rejection(vector: Point, onto: Point): Point {
  return subtract(vector, vectorProjection(vector, onto));
}

export function crossZ(left: Point, right: Point) {
  return left.x * right.y - left.y * right.x;
}

export function signedAngleBetween(from: Point, to: Point) {
  if (!hasDirection(from) || !hasDirection(to)) {
    return 0;
  }
  const fromUnit = normalize(from);
  const toUnit = normalize(to);
  return Math.atan2(crossZ(fromUnit, toUnit), dot(fromUnit, toUnit));
}

export function rotateTowards(currentAngle: number, targetDirection: Point, maximumStep: number) {
  if (!Number.isFinite(maximumStep) || maximumStep <= 0 || !hasDirection(targetDirection)) {
    return normalizeAngle(currentAngle);
  }
  const currentDirection = pointOnUnitCircle(currentAngle);
  const remainingAngle = signedAngleBetween(currentDirection, targetDirection);
  const step = clamp(remainingAngle, -maximumStep, maximumStep);
  return normalizeAngle(currentAngle + step);
}

export function isWithinViewCone(forward: Point, toTarget: Point, halfAngle: number) {
  if (!hasDirection(forward) || !hasDirection(toTarget) || !Number.isFinite(halfAngle)) {
    return false;
  }
  const safeHalfAngle = clamp(halfAngle, 0, Math.PI);
  return cosineBetween(forward, toTarget) >= Math.cos(safeHalfAngle);
}
