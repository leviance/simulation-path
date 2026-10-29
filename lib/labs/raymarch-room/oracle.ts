import {
  subtract,
  dot,
  finite,
  validRay,
  normalize,
  clamp,
  type Ray,
  type Vec3,
} from "./geometry.ts";
export function intersectSphere(ray: Ray, center: Vec3, radius: number) {
  const result = { valid: false, hit: false, distance: 0 };
  if (!validRay(ray) || !finite(center) || !Number.isFinite(radius) || radius <= 0) return result;
  const offset = subtract(ray.origin, center);
  const a = dot(ray.direction, ray.direction),
    b = dot(offset, ray.direction),
    c = dot(offset, offset) - radius * radius;
  const discriminant = b * b - a * c;
  if (!Number.isFinite(discriminant)) return result;
  result.valid = true;
  if (discriminant < 0) return result;
  const root = Math.sqrt(discriminant);
  const q = -b - (b < 0 ? -root : root);
  let first = -b / a,
    second = first;
  if (Math.abs(q) > 1e-15) {
    first = q / a;
    second = c / q;
  }
  if (first > second) [first, second] = [second, first];
  if (first < 0) first = second;
  if (first >= 0 && Number.isFinite(first)) {
    result.hit = true;
    result.distance = first;
  }
  return result;
}
export function normalAngularError(normal: Vec3, point: Vec3, center: Vec3) {
  const expected = normalize(subtract(point, center));
  if (!finite(normal) || dot(normal, normal) < 0.5 || dot(expected, expected) < 0.5) return NaN;
  return Math.acos(clamp(dot(normal, expected), -1, 1));
}
export const tangentDistanceBound = (radius: number, epsilon: number) =>
  Math.sqrt(2 * radius * epsilon + epsilon * epsilon);
