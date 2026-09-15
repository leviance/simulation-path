import { magnitude3, subtract3, type Vec3 } from "./normal.ts";
import {
  projectPerspective,
  type Camera3D,
  type PerspectiveLens,
  type ProjectionResult,
} from "./projection.ts";
import {
  advanceEulerAngles,
  applyRotationMouseDrag,
  inverseRotateEuler3,
  rotateEuler3,
  type EulerAngles,
  type RotationOrder,
} from "./rotation3d.ts";

type CubeTuple<Value> = readonly [Value, Value, Value, Value, Value, Value, Value, Value];

export type CubeVertices = CubeTuple<Vec3>;

export interface CubeEdge {
  from: number;
  to: number;
}

export interface ProjectedWireframeCube {
  vertices: CubeTuple<ProjectionResult>;
  projectionCount: number;
}

export interface VisibleCubeEdge {
  edgeIndex: number;
  averageDepth: number;
  depthFactor: number;
}

export const CUBE_EDGES = [
  { from: 0, to: 1 },
  { from: 1, to: 2 },
  { from: 2, to: 3 },
  { from: 3, to: 0 },
  { from: 4, to: 5 },
  { from: 5, to: 6 },
  { from: 6, to: 7 },
  { from: 7, to: 4 },
  { from: 0, to: 4 },
  { from: 1, to: 5 },
  { from: 2, to: 6 },
  { from: 3, to: 7 },
] as const satisfies readonly CubeEdge[];

function mapCubeTuple<Input, Output>(
  values: CubeTuple<Input>,
  transform: (value: Input, index: number) => Output,
): CubeTuple<Output> {
  return [
    transform(values[0], 0),
    transform(values[1], 1),
    transform(values[2], 2),
    transform(values[3], 3),
    transform(values[4], 4),
    transform(values[5], 5),
    transform(values[6], 6),
    transform(values[7], 7),
  ];
}

export function makeCubeVertices(halfExtent: number, center: Vec3 = { x: 0, y: 0, z: 0 }) {
  const h = Math.abs(halfExtent);
  return [
    { x: center.x - h, y: center.y - h, z: center.z - h },
    { x: center.x + h, y: center.y - h, z: center.z - h },
    { x: center.x + h, y: center.y + h, z: center.z - h },
    { x: center.x - h, y: center.y + h, z: center.z - h },
    { x: center.x - h, y: center.y - h, z: center.z + h },
    { x: center.x + h, y: center.y - h, z: center.z + h },
    { x: center.x + h, y: center.y + h, z: center.z + h },
    { x: center.x - h, y: center.y + h, z: center.z + h },
  ] as const satisfies CubeVertices;
}

export function projectWireframeCube(
  worldVertices: CubeVertices,
  camera: Camera3D,
  lens: PerspectiveLens,
  nearPlane: number,
  width: number,
  height: number,
): ProjectedWireframeCube {
  const vertices = mapCubeTuple(worldVertices, (vertex) =>
    projectPerspective(vertex, camera, lens, nearPlane, width, height),
  );
  return { vertices, projectionCount: vertices.length };
}

export function isCubeEdgeValid(edge: CubeEdge) {
  return edge.from >= 0 && edge.from < 8 && edge.to >= 0 && edge.to < 8 && edge.from !== edge.to;
}

export function cubeVertexDegrees() {
  const degrees = Array.from({ length: 8 }, () => 0);
  for (const edge of CUBE_EDGES) {
    if (!isCubeEdgeValid(edge)) continue;
    degrees[edge.from] += 1;
    degrees[edge.to] += 1;
  }
  return degrees;
}

export function hasValidCubeTopology() {
  const keys = new Set<string>();
  for (const edge of CUBE_EDGES) {
    if (!isCubeEdgeValid(edge)) return false;
    const key = [edge.from, edge.to].sort((left, right) => left - right).join(":");
    if (keys.has(key)) return false;
    keys.add(key);
  }
  return keys.size === 12 && cubeVertexDegrees().every((degree) => degree === 3);
}

export function isProjectedCubeEdgeVisible(cube: ProjectedWireframeCube, edge: CubeEdge) {
  return (
    isCubeEdgeValid(edge) &&
    cube.vertices[edge.from].status === "visible" &&
    cube.vertices[edge.to].status === "visible"
  );
}

export function rotateCubeVertices(
  vertices: CubeVertices,
  angles: EulerAngles,
  order: RotationOrder,
) {
  return mapCubeTuple(vertices, (vertex) => rotateEuler3(vertex, angles, order));
}

export function translateCubeVertices(vertices: CubeVertices, translation: Vec3) {
  return mapCubeTuple(vertices, (vertex) => ({
    x: vertex.x + translation.x,
    y: vertex.y + translation.y,
    z: vertex.z + translation.z,
  }));
}

export function visibleCubeEdgesBackToFront(cube: ProjectedWireframeCube) {
  const visible = CUBE_EDGES.flatMap((edge, edgeIndex) => {
    if (!isProjectedCubeEdgeVisible(cube, edge)) return [];
    const fromDepth = cube.vertices[edge.from].cameraPoint.z;
    const toDepth = cube.vertices[edge.to].cameraPoint.z;
    return [{ edgeIndex, averageDepth: (fromDepth + toDepth) * 0.5, depthFactor: 1 }];
  });
  if (visible.length === 0) return [];

  const nearestDepth = Math.min(...visible.map((edge) => edge.averageDepth));
  const farthestDepth = Math.max(...visible.map((edge) => edge.averageDepth));
  const depthRange = farthestDepth - nearestDepth;
  for (const edge of visible) {
    edge.depthFactor = depthRange <= 1e-12 ? 1 : (farthestDepth - edge.averageDepth) / depthRange;
  }
  return visible.sort((left, right) => right.averageDepth - left.averageDepth);
}

export function cubeEdgeLengths(vertices: CubeVertices) {
  return CUBE_EDGES.map((edge) => magnitude3(subtract3(vertices[edge.to], vertices[edge.from])));
}

export function maximumCubeEdgeLengthError(original: CubeVertices, transformed: CubeVertices) {
  const before = cubeEdgeLengths(original);
  const after = cubeEdgeLengths(transformed);
  return Math.max(...before.map((length, index) => Math.abs(length - after[index])));
}

export function cubeRotationRoundTripError(
  vertices: CubeVertices,
  angles: EulerAngles,
  order: RotationOrder,
) {
  return Math.max(
    ...vertices.map((vertex) => {
      const rotated = rotateEuler3(vertex, angles, order);
      const restored = inverseRotateEuler3(rotated, angles, order);
      return magnitude3(subtract3(restored, vertex));
    }),
  );
}

export function applyCubeMouseDrag(
  angles: EulerAngles,
  deltaX: number,
  deltaY: number,
  sensitivity: number,
) {
  return applyRotationMouseDrag(angles, deltaX, deltaY, sensitivity);
}

export function advanceCubeAngles(
  angles: EulerAngles,
  angularVelocity: EulerAngles,
  deltaTime: number,
) {
  return advanceEulerAngles(angles, angularVelocity, deltaTime);
}
