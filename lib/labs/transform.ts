import type { Point } from "./geometry.ts";

export type Matrix3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export type TransformOrder = "scale-shear-rotate" | "rotate-shear-scale";

export type Matrix2 = readonly [number, number, number, number];

export function transformVector2(matrix: Matrix2, vector: Point): Point {
  return {
    x: matrix[0] * vector.x + matrix[1] * vector.y,
    y: matrix[2] * vector.x + matrix[3] * vector.y,
  };
}

export function multiplyMatrices2(left: Matrix2, right: Matrix2): Matrix2 {
  const result = [0, 0, 0, 0];
  for (let row = 0; row < 2; row++) {
    for (let column = 0; column < 2; column++) {
      for (let index = 0; index < 2; index++) {
        result[row * 2 + column] += left[row * 2 + index] * right[index * 2 + column];
      }
    }
  }
  return result as unknown as Matrix2;
}

export interface TransformParameters {
  scaleX: number;
  scaleY: number;
  angle: number;
  shearX: number;
  shearY: number;
  translation: Point;
}

export function scalePoint(point: Point, scaleX: number, scaleY: number): Point {
  return { x: point.x * scaleX, y: point.y * scaleY };
}

export function rotatePoint(point: Point, angle: number): Point {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: cosine * point.x - sine * point.y,
    y: sine * point.x + cosine * point.y,
  };
}

export function shearPoint(point: Point, shearX: number, shearY: number): Point {
  return {
    x: point.x + shearX * point.y,
    y: shearY * point.x + point.y,
  };
}

export function identityMatrix(): Matrix3 {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

export function translationMatrix(offset: Point): Matrix3 {
  return [1, 0, offset.x, 0, 1, offset.y, 0, 0, 1];
}

export function scaleMatrix(scaleX: number, scaleY: number): Matrix3 {
  return [scaleX, 0, 0, 0, scaleY, 0, 0, 0, 1];
}

export function rotationMatrix(angle: number): Matrix3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return [cosine, -sine, 0, sine, cosine, 0, 0, 0, 1];
}

export function shearMatrix(shearX: number, shearY: number): Matrix3 {
  return [1, shearX, 0, shearY, 1, 0, 0, 0, 1];
}

export function multiplyMatrices(left: Matrix3, right: Matrix3): Matrix3 {
  const result = Array<number>(9).fill(0);
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      for (let index = 0; index < 3; index += 1) {
        result[row * 3 + column] += left[row * 3 + index] * right[index * 3 + column];
      }
    }
  }
  return result as unknown as Matrix3;
}

export function transformPoint(matrix: Matrix3, point: Point): Point {
  // Affine contract: last row is [0,0,1]; no projective divide or silent fallback.
  const x = matrix[0] * point.x + matrix[1] * point.y + matrix[2];
  const y = matrix[3] * point.x + matrix[4] * point.y + matrix[5];
  return { x, y };
}

export function transformDirection(matrix: Matrix3, direction: Point): Point {
  return transformVector2([matrix[0], matrix[1], matrix[3], matrix[4]], direction);
}

export function composeTransform(parameters: TransformParameters, order: TransformOrder): Matrix3 {
  const translation = translationMatrix(parameters.translation);
  const scale = scaleMatrix(parameters.scaleX, parameters.scaleY);
  const shear = shearMatrix(parameters.shearX, parameters.shearY);
  const rotation = rotationMatrix(parameters.angle);

  if (order === "rotate-shear-scale") {
    return multiplyMatrices(
      translation,
      multiplyMatrices(scale, multiplyMatrices(shear, rotation)),
    );
  }
  return multiplyMatrices(translation, multiplyMatrices(rotation, multiplyMatrices(shear, scale)));
}

export function determinantLinearPart(matrix: Matrix3): number {
  return matrix[0] * matrix[4] - matrix[1] * matrix[3];
}

export function polygonArea(points: readonly Point[]): number {
  if (points.length < 3) return 0;
  let doubledArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    doubledArea += current.x * next.y - current.y * next.x;
  }
  return Math.abs(doubledArea) * 0.5;
}
