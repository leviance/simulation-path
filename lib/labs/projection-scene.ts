import type { Vec3 } from "./normal.ts";
import {
  finitePoint,
  projectPerspective,
  type PointLens,
  type PointViewport,
} from "./projection-point.ts";
export interface PointScene {
  point: Vec3;
  camera: { position: Vec3 };
  lens: PointLens;
  aspect: number;
  paused: boolean;
  debug: boolean;
  elapsed: number;
}
export const initialPointScene = (): PointScene => ({
  point: { x: 1, y: 0.6, z: 4 },
  camera: { position: { x: 0, y: 0, z: 0 } },
  lens: { verticalFovRadians: Math.PI / 3, nearPlane: 0.5, farPlane: 16 },
  aspect: 0,
  paused: true,
  debug: true,
  elapsed: 0,
});
export function viewportFor(scene: PointScene): PointViewport {
  if (scene.aspect === 1) return { x: 150, y: 100, width: 800, height: 600 };
  if (scene.aspect === 2) return { x: 250, y: 100, width: 600, height: 600 };
  return { x: 30, y: 107.5, width: 1040, height: 585 };
}
export function pointPreset(index: number): PointScene {
  const s = initialPointScene();
  if (index === 1) s.point.z = 8;
  if (index === 2) s.point = { x: 0, y: 0, z: 0.25 };
  if (index === 3) s.point = { x: 0, y: 0, z: -1 };
  if (index === 4) s.point = { x: 0, y: 0, z: 18 };
  if (index === 5) s.point = { x: 6, y: 0, z: 1 };
  return s;
}
export const pointStage = (mode?: string) =>
  ({
    "projection-point": 1,
    "projection-camera": 2,
    "projection-divide": 3,
    "projection-fov": 4,
    "projection-visibility": 5,
    "projection-motion": 6,
    "projection-drag": 7,
    "projection-full": 8,
  })[mode ?? "projection-full"] ?? 8;
const clamp = (x: number, min: number, max: number) => Math.max(min, Math.min(max, x));
export function changePoint(scene: PointScene, point: Vec3): PointScene {
  if (!finitePoint(point)) return scene;
  return {
    ...scene,
    paused: true,
    point: { x: clamp(point.x, -6, 6), y: clamp(point.y, -6, 6), z: clamp(point.z, -2, 20) },
  };
}
export function movePoint(scene: PointScene, delta: Vec3): PointScene {
  if (!finitePoint(delta)) return scene;
  return changePoint(scene, {
    x: scene.point.x + delta.x,
    y: scene.point.y + delta.y,
    z: scene.point.z + delta.z,
  });
}
export function changePointCamera(scene: PointScene, axis: keyof Vec3, value: number): PointScene {
  if (!Number.isFinite(value)) return scene;
  return {
    ...scene,
    paused: true,
    camera: { position: { ...scene.camera.position, [axis]: clamp(value, -2, 2) } },
  };
}
export function changePointLens(
  scene: PointScene,
  key: keyof PointLens,
  value: number,
): PointScene {
  if (!Number.isFinite(value)) return scene;
  const bounds = {
    verticalFovRadians: [(25 * Math.PI) / 180, (110 * Math.PI) / 180],
    nearPlane: [0.1, 2],
    farPlane: [8, 24],
  };
  return {
    ...scene,
    paused: true,
    lens: { ...scene.lens, [key]: clamp(value, ...(bounds[key] as [number, number])) },
  };
}
export function flightPoint(timeSeconds: number): Vec3 {
  return {
    x: Math.sin(0.9 * timeSeconds) * 2.2,
    y: Math.cos(1.3 * timeSeconds) * 1.3,
    z: 6 + Math.sin(0.55 * timeSeconds) * 4,
  };
}
export function advanceFlightTime(current: number, deltaTime: number) {
  if (!Number.isFinite(current) || !Number.isFinite(deltaTime) || deltaTime <= 0) return current;
  return current + Math.min(deltaTime, 0.1);
}
export function advancePoint(scene: PointScene, dt: number): PointScene {
  if (!Number.isFinite(dt) || dt <= 0) return scene;
  const elapsed = advanceFlightTime(scene.elapsed, dt);
  return { ...scene, elapsed, point: flightPoint(elapsed) };
}
export function pointDisplay(scene: PointScene, stage: number) {
  if (stage >= 3)
    return projectPerspective(scene.point, scene.camera, scene.lens, viewportFor(scene), stage);
  const p =
    stage === 1
      ? scene.point
      : {
          x: scene.point.x - scene.camera.position.x,
          y: scene.point.y - scene.camera.position.y,
          z: scene.point.z - scene.camera.position.z,
        };
  const v = viewportFor(scene),
    screen = { x: v.x + v.width * 0.5 + p.x * 70, y: v.y + v.height * 0.5 - p.y * 70 };
  return { status: "visible" as const, cameraPoint: p, ndc: null, screen };
}
