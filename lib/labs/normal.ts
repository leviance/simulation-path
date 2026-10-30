export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Triangle3 {
  a: Vec3;
  b: Vec3;
  c: Vec3;
}

export const NORMAL_EPSILON = 1e-10;

export function add3(left: Vec3, right: Vec3): Vec3 {
  return { x: left.x + right.x, y: left.y + right.y, z: left.z + right.z };
}

export function subtract3(left: Vec3, right: Vec3): Vec3 {
  return { x: left.x - right.x, y: left.y - right.y, z: left.z - right.z };
}

export function scale3(vector: Vec3, scalar: number): Vec3 {
  return { x: vector.x * scalar, y: vector.y * scalar, z: vector.z * scalar };
}

export function dot3(left: Vec3, right: Vec3): number {
  return left.x * right.x + left.y * right.y + left.z * right.z;
}

export function cross3(left: Vec3, right: Vec3): Vec3 {
  return {
    x: left.y * right.z - left.z * right.y,
    y: left.z * right.x - left.x * right.z,
    z: left.x * right.y - left.y * right.x,
  };
}

export function magnitude3(vector: Vec3): number {
  return Math.hypot(vector.x, vector.y, vector.z);
}

export function normalize3(vector: Vec3, epsilon = 0): Vec3 {
  if (!Number.isFinite(epsilon) || epsilon < 0)
    throw new RangeError("Normalization epsilon must be finite and non-negative");
  const length = magnitude3(vector);
  if (!Number.isFinite(length) || length <= epsilon) return { x: 0, y: 0, z: 0 };
  return { x: vector.x / length, y: vector.y / length, z: vector.z / length };
}

export function triangleEdges(triangle: Triangle3): { ab: Vec3; ac: Vec3 } {
  return {
    ab: subtract3(triangle.b, triangle.a),
    ac: subtract3(triangle.c, triangle.a),
  };
}

export function triangleRawNormal(triangle: Triangle3): Vec3 {
  const { ab, ac } = triangleEdges(triangle);
  return cross3(ab, ac);
}

export function triangleUnitNormal(triangle: Triangle3): Vec3 {
  return isDegenerateTriangle(triangle)
    ? { x: 0, y: 0, z: 0 }
    : normalize3(triangleRawNormal(triangle));
}

export function triangleArea(triangle: Triangle3): number {
  return magnitude3(triangleRawNormal(triangle)) * 0.5;
}

export function triangleCentroid(triangle: Triangle3): Vec3 {
  return scale3(add3(add3(triangle.a, triangle.b), triangle.c), 1 / 3);
}

export function reverseWinding(triangle: Triangle3): Triangle3 {
  return { a: triangle.a, b: triangle.c, c: triangle.b };
}

export function isDegenerateTriangle(triangle: Triangle3, epsilon = NORMAL_EPSILON): boolean {
  if (!Number.isFinite(epsilon) || epsilon < 0)
    throw new RangeError("Normal area threshold must be finite and non-negative");
  if (
    ![triangle.a, triangle.b, triangle.c].every((point) =>
      [point.x, point.y, point.z].every(Number.isFinite),
    )
  )
    return true;
  const { ab, ac } = triangleEdges(triangle),
    a = magnitude3(ab),
    b = magnitude3(ac),
    n = magnitude3(triangleRawNormal(triangle));
  return !Number.isFinite(n) || a === 0 || b === 0 || n <= epsilon || n / (a * b) <= 1e-6;
}

export function orthogonalityError(triangle: Triangle3): number {
  const { ab, ac } = triangleEdges(triangle);
  const normal = triangleUnitNormal(triangle);
  return Math.max(Math.abs(dot3(normal, normalize3(ab))), Math.abs(dot3(normal, normalize3(ac))));
}

// Hướng từ centroid tới eye, không phải hướng camera nhìn vào cảnh.
export function facingAmount(triangle: Triangle3, towardViewer: Vec3): number {
  return dot3(triangleUnitNormal(triangle), normalize3(towardViewer));
}
