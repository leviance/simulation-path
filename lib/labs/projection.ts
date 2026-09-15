import { add3, subtract3, type Vec3 } from "./normal.ts";

export interface Camera3D {
  position: Vec3;
}

export interface PerspectiveLens {
  verticalFovRadians: number;
}

export type ProjectionStatus = "visible" | "behind" | "before-near" | "outside";

export interface ProjectionResult {
  status: ProjectionStatus;
  cameraPoint: Vec3;
  ndc: { x: number; y: number };
  screen: { x: number; y: number };
}

export function previewPoint(point: Vec3, pixelsPerUnit: number) {
  return { x: point.x * pixelsPerUnit, y: point.y * pixelsPerUnit };
}

export function worldToCamera(worldPoint: Vec3, camera: Camera3D): Vec3 {
  return subtract3(worldPoint, camera.position);
}

export function cameraToWorld(cameraPoint: Vec3, camera: Camera3D): Vec3 {
  return add3(cameraPoint, camera.position);
}

export function perspectiveDivide(cameraPoint: Vec3) {
  return { x: cameraPoint.x / cameraPoint.z, y: cameraPoint.y / cameraPoint.z };
}

export function verticalFocalScale(lens: PerspectiveLens): number {
  return 1 / Math.tan(lens.verticalFovRadians * 0.5);
}

export function cameraToNdc(cameraPoint: Vec3, lens: PerspectiveLens, aspectRatio: number) {
  const focalScale = verticalFocalScale(lens);
  return {
    x: (cameraPoint.x * focalScale) / (cameraPoint.z * aspectRatio),
    y: (cameraPoint.y * focalScale) / cameraPoint.z,
  };
}

export function ndcToScreen(ndc: { x: number; y: number }, width: number, height: number) {
  return {
    x: (ndc.x + 1) * 0.5 * width,
    y: (1 - ndc.y) * 0.5 * height,
  };
}

export function screenToNdc(screen: { x: number; y: number }, width: number, height: number) {
  return {
    x: (screen.x * 2) / width - 1,
    y: 1 - (screen.y * 2) / height,
  };
}

export function isInsideNdc(ndc: { x: number; y: number }): boolean {
  return Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1;
}

export function projectPerspective(
  worldPoint: Vec3,
  camera: Camera3D,
  lens: PerspectiveLens,
  nearPlane: number,
  width: number,
  height: number,
): ProjectionResult {
  const cameraPoint = worldToCamera(worldPoint, camera);
  const empty = { x: 0, y: 0 };
  if (cameraPoint.z <= 0) {
    return { status: "behind", cameraPoint, ndc: empty, screen: empty };
  }
  if (cameraPoint.z < nearPlane) {
    return { status: "before-near", cameraPoint, ndc: empty, screen: empty };
  }

  const aspectRatio = width / height;
  const ndc = cameraToNdc(cameraPoint, lens, aspectRatio);
  const screen = ndcToScreen(ndc, width, height);
  if (!isInsideNdc(ndc)) {
    return { status: "outside", cameraPoint, ndc, screen };
  }
  return { status: "visible", cameraPoint, ndc, screen };
}

export function screenToCameraAtDepth(
  screen: { x: number; y: number },
  cameraDepth: number,
  lens: PerspectiveLens,
  width: number,
  height: number,
): Vec3 {
  const ndc = screenToNdc(screen, width, height);
  const tanHalfFov = Math.tan(lens.verticalFovRadians * 0.5);
  const aspectRatio = width / height;
  return {
    x: ndc.x * cameraDepth * tanHalfFov * aspectRatio,
    y: ndc.y * cameraDepth * tanHalfFov,
    z: cameraDepth,
  };
}

export function flightPoint(timeSeconds: number): Vec3 {
  return {
    x: Math.sin(timeSeconds * 0.9) * 2.2,
    y: Math.cos(timeSeconds * 1.3) * 1.3,
    z: 4.5 + Math.sin(timeSeconds * 0.55) * 3,
  };
}

export function advanceFlightTime(current: number, deltaTime: number): number {
  const safeDeltaTime = Math.max(0, Math.min(deltaTime, 0.1));
  return current + safeDeltaTime;
}

export function projectionRoundTripError(
  worldPoint: Vec3,
  camera: Camera3D,
  lens: PerspectiveLens,
  width: number,
  height: number,
): number {
  const cameraPoint = worldToCamera(worldPoint, camera);
  if (cameraPoint.z <= 0) return 0;
  const ndc = cameraToNdc(cameraPoint, lens, width / height);
  const screen = ndcToScreen(ndc, width, height);
  const restored = screenToCameraAtDepth(screen, cameraPoint.z, lens, width, height);
  return Math.hypot(
    restored.x - cameraPoint.x,
    restored.y - cameraPoint.y,
    restored.z - cameraPoint.z,
  );
}
