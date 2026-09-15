import { add3, magnitude3, subtract3, type Vec3 } from "./normal.ts";
import {
  projectPerspective,
  type Camera3D,
  type PerspectiveLens,
  type ProjectionResult,
} from "./projection.ts";

export interface TriangleModel3 {
  a: Vec3;
  b: Vec3;
  c: Vec3;
}

export interface EulerAngles {
  pitch: number;
  yaw: number;
  roll: number;
}

export type RotationOrder = "xyz" | "zyx";

export interface TriangleProjection {
  visible: boolean;
  vertices: readonly [ProjectionResult, ProjectionResult, ProjectionResult];
}

export const DEFAULT_WORLD_TRIANGLE: TriangleModel3 = {
  a: { x: -1.4, y: -0.9, z: 5.7 },
  b: { x: 1.3, y: -0.7, z: 6.4 },
  c: { x: 0.1, y: 1.6, z: 5.9 },
};

export function projectTriangle3(
  triangle: TriangleModel3,
  camera: Camera3D,
  lens: PerspectiveLens,
  nearPlane: number,
  width: number,
  height: number,
): TriangleProjection {
  const vertices = [
    projectPerspective(triangle.a, camera, lens, nearPlane, width, height),
    projectPerspective(triangle.b, camera, lens, nearPlane, width, height),
    projectPerspective(triangle.c, camera, lens, nearPlane, width, height),
  ] as const;
  return {
    visible: vertices.every((vertex) => vertex.status === "visible"),
    vertices,
  };
}

export function rotationTriangleCentroid(triangle: TriangleModel3): Vec3 {
  return {
    x: (triangle.a.x + triangle.b.x + triangle.c.x) / 3,
    y: (triangle.a.y + triangle.b.y + triangle.c.y) / 3,
    z: (triangle.a.z + triangle.b.z + triangle.c.z) / 3,
  };
}

export function toLocalTriangle3(triangle: TriangleModel3): TriangleModel3 {
  const pivot = rotationTriangleCentroid(triangle);
  return {
    a: subtract3(triangle.a, pivot),
    b: subtract3(triangle.b, pivot),
    c: subtract3(triangle.c, pivot),
  };
}

export function translateTriangle3(triangle: TriangleModel3, translation: Vec3): TriangleModel3 {
  return {
    a: add3(triangle.a, translation),
    b: add3(triangle.b, translation),
    c: add3(triangle.c, translation),
  };
}

export function rotateX3(point: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x,
    y: cosine * point.y - sine * point.z,
    z: sine * point.y + cosine * point.z,
  };
}

export function rotateY3(point: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: cosine * point.x + sine * point.z,
    y: point.y,
    z: -sine * point.x + cosine * point.z,
  };
}

export function rotateZ3(point: Vec3, angle: number): Vec3 {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: cosine * point.x - sine * point.y,
    y: sine * point.x + cosine * point.y,
    z: point.z,
  };
}

export function rotateEuler3(point: Vec3, angles: EulerAngles, order: RotationOrder): Vec3 {
  if (order === "zyx") {
    return rotateX3(rotateY3(rotateZ3(point, angles.roll), angles.yaw), angles.pitch);
  }
  return rotateZ3(rotateY3(rotateX3(point, angles.pitch), angles.yaw), angles.roll);
}

export function rotateTriangle3(
  triangle: TriangleModel3,
  angles: EulerAngles,
  order: RotationOrder,
): TriangleModel3 {
  return {
    a: rotateEuler3(triangle.a, angles, order),
    b: rotateEuler3(triangle.b, angles, order),
    c: rotateEuler3(triangle.c, angles, order),
  };
}

export function applyRotationMouseDrag(
  angles: EulerAngles,
  deltaX: number,
  deltaY: number,
  sensitivity: number,
): EulerAngles {
  const pitchLimit = (89 * Math.PI) / 180;
  return {
    ...angles,
    yaw: angles.yaw + deltaX * sensitivity,
    pitch: Math.max(-pitchLimit, Math.min(pitchLimit, angles.pitch - deltaY * sensitivity)),
  };
}

export function inverseRotateEuler3(point: Vec3, angles: EulerAngles, order: RotationOrder): Vec3 {
  if (order === "zyx") {
    return rotateZ3(rotateY3(rotateX3(point, -angles.pitch), -angles.yaw), -angles.roll);
  }
  return rotateX3(rotateY3(rotateZ3(point, -angles.roll), -angles.yaw), -angles.pitch);
}

export function triangleEdgeLengths3(triangle: TriangleModel3): readonly [number, number, number] {
  return [
    magnitude3(subtract3(triangle.b, triangle.a)),
    magnitude3(subtract3(triangle.c, triangle.b)),
    magnitude3(subtract3(triangle.a, triangle.c)),
  ];
}

export function maximumEdgeLengthError3(original: TriangleModel3, rotated: TriangleModel3): number {
  const before = triangleEdgeLengths3(original);
  const after = triangleEdgeLengths3(rotated);
  return Math.max(...before.map((length, index) => Math.abs(length - after[index])));
}

export function rotationRoundTripError3(
  point: Vec3,
  angles: EulerAngles,
  order: RotationOrder,
): number {
  const restored = inverseRotateEuler3(rotateEuler3(point, angles, order), angles, order);
  return magnitude3(subtract3(restored, point));
}

export function advanceEulerAngles(
  angles: EulerAngles,
  angularVelocity: EulerAngles,
  deltaTime: number,
): EulerAngles {
  const safeDeltaTime = Math.max(0, Math.min(deltaTime, 0.1));
  return {
    pitch: angles.pitch + angularVelocity.pitch * safeDeltaTime,
    yaw: angles.yaw + angularVelocity.yaw * safeDeltaTime,
    roll: angles.roll + angularVelocity.roll * safeDeltaTime,
  };
}
