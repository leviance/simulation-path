import type { Vec3 } from "./normal.ts";
import {
  worldToCamera,
  cameraToWorld,
  cameraToNdc,
  perspectiveDivide,
  verticalFocalScale,
} from "./projection.ts";
export { worldToCamera, cameraToWorld, cameraToNdc, perspectiveDivide, verticalFocalScale };
export type Point2 = { x: number; y: number };
export interface PointLens {
  verticalFovRadians: number;
  nearPlane: number;
  farPlane: number;
}
export interface PointViewport {
  x: number;
  y: number;
  width: number;
  height: number;
}
export type PointStatus =
  "visible" | "behind" | "before-near" | "beyond-far" | "outside" | "invalid";
export interface PointProjection {
  status: PointStatus;
  cameraPoint: Vec3;
  ndc: Point2 | null;
  screen: Point2 | null;
}
export const finitePoint = (p: Vec3) => [p.x, p.y, p.z].every(Number.isFinite);
export function validLens(lens: PointLens, v: PointViewport) {
  return (
    [lens.verticalFovRadians, lens.nearPlane, lens.farPlane, v.x, v.y, v.width, v.height].every(
      Number.isFinite,
    ) &&
    lens.verticalFovRadians > 0 &&
    lens.verticalFovRadians < Math.PI &&
    lens.nearPlane > 0 &&
    lens.farPlane > lens.nearPlane &&
    v.width > 0 &&
    v.height > 0
  );
}
export function ndcToPointScreen(ndc: Point2, v: PointViewport): Point2 {
  return { x: v.x + (ndc.x + 1) * 0.5 * v.width, y: v.y + (1 - ndc.y) * 0.5 * v.height };
}
export function projectPerspective(
  point: Vec3,
  camera: { position: Vec3 },
  lens: PointLens,
  v: PointViewport,
  stage = 8,
): PointProjection {
  let result: PointProjection = {
    status: "invalid",
    cameraPoint: { x: 0, y: 0, z: 0 },
    ndc: null,
    screen: null,
  };
  if (!finitePoint(point) || !finitePoint(camera.position) || !validLens(lens, v)) return result;
  const cameraPoint = worldToCamera(point, camera);
  result = { ...result, cameraPoint };
  if (!finitePoint(cameraPoint)) return result;
  if (cameraPoint.z <= 0) return { ...result, status: "behind" };
  if (cameraPoint.z < lens.nearPlane) return { ...result, status: "before-near" };
  if (cameraPoint.z > lens.farPlane) return { ...result, status: "beyond-far" };
  const divided = perspectiveDivide(cameraPoint);
  const ndc =
    stage >= 4
      ? cameraToNdc(cameraPoint, lens, v.width / v.height)
      : { x: divided.x / (v.width / v.height), y: divided.y };
  const screen = ndcToPointScreen(ndc, v);
  if (![ndc.x, ndc.y, screen.x, screen.y].every(Number.isFinite)) return result;
  return {
    ...result,
    ndc,
    screen,
    status: Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1 ? "visible" : "outside",
  };
}
export function screenToCameraAtDepth(
  screen: Point2,
  depth: number,
  lens: PointLens,
  v: PointViewport,
): Vec3 | null {
  if (
    !validLens(lens, v) ||
    ![screen.x, screen.y, depth].every(Number.isFinite) ||
    depth < lens.nearPlane ||
    depth > lens.farPlane
  )
    return null;
  const ndc = { x: ((screen.x - v.x) * 2) / v.width - 1, y: 1 - ((screen.y - v.y) * 2) / v.height };
  const tanHalfFov = Math.tan(lens.verticalFovRadians * 0.5),
    aspectRatio = v.width / v.height;
  const p = {
    x: ndc.x * depth * tanHalfFov * aspectRatio,
    y: ndc.y * depth * tanHalfFov,
    z: depth,
  };
  return finitePoint(p) ? p : null;
}
export function clipPointDepth(start: Vec3, end: Vec3, lens: PointLens): [Vec3, Vec3] | null {
  if (
    !finitePoint(start) ||
    !finitePoint(end) ||
    !Number.isFinite(lens.nearPlane) ||
    !Number.isFinite(lens.farPlane) ||
    lens.nearPlane <= 0 ||
    lens.farPlane <= lens.nearPlane
  )
    return null;
  for (const [plane, sign] of [
    [lens.nearPlane, 1],
    [lens.farPlane, -1],
  ]) {
    const a = (start.z - plane) * sign,
      b = (end.z - plane) * sign;
    if (![a, b].every(Number.isFinite)) return null;
    if (a < 0 && b < 0) return null;
    if (a < 0 || b < 0) {
      const denominator = a - b;
      if (!Number.isFinite(denominator)) return null;
      const t = a / denominator,
        hit = { x: start.x + t * (end.x - start.x), y: start.y + t * (end.y - start.y), z: plane };
      if (!finitePoint(hit)) return null;
      if (a < 0) start = hit;
      else end = hit;
    }
  }
  return [start, end];
}
export function clipPointScreen(
  start: Point2,
  end: Point2,
  v: PointViewport,
): [Point2, Point2] | null {
  if (
    ![
      start.x,
      start.y,
      end.x,
      end.y,
      v.x,
      v.y,
      v.width,
      v.height,
      v.x + v.width,
      v.y + v.height,
    ].every(Number.isFinite) ||
    v.width <= 0 ||
    v.height <= 0
  )
    return null;
  const dx = end.x - start.x,
    dy = end.y - start.y;
  if (![dx, dy].every(Number.isFinite)) return null;
  let first = 0,
    last = 1;
  for (const [direction, distance] of [
    [-dx, start.x - v.x],
    [dx, v.x + v.width - start.x],
    [-dy, start.y - v.y],
    [dy, v.y + v.height - start.y],
  ]) {
    if (direction === 0) {
      if (distance < 0) return null;
      continue;
    }
    const fraction = distance / direction;
    if (direction < 0) first = Math.max(first, fraction);
    else last = Math.min(last, fraction);
    if (first > last) return null;
  }
  return [
    { x: start.x + first * dx, y: start.y + first * dy },
    { x: start.x + last * dx, y: start.y + last * dy },
  ];
}
export function projectionRoundTripError(
  point: Vec3,
  camera: { position: Vec3 },
  lens: PointLens,
  v: PointViewport,
): number | null {
  const r = projectPerspective(point, camera, lens, v);
  if (r.status !== "visible" || !r.screen) return null;
  const p = screenToCameraAtDepth(r.screen, r.cameraPoint.z, lens, v);
  return p ? Math.hypot(p.x - r.cameraPoint.x, p.y - r.cameraPoint.y, p.z - r.cameraPoint.z) : null;
}
