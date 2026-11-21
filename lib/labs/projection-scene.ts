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
  measureDepth: boolean;
  elapsed: number;
  forwardHeld: boolean;
  backwardHeld: boolean;
}
export const initialPointScene = (): PointScene => ({
  point: { x: 1, y: 0.6, z: 4 },
  camera: { position: { x: 0, y: 0, z: 0 } },
  lens: { verticalFovRadians: Math.PI / 3, nearPlane: 0.5, farPlane: 16 },
  aspect: 0,
  paused: true,
  debug: false,
  forwardHeld: false,
  backwardHeld: false,
  measureDepth: false,
  elapsed: 0,
});
export function viewportFor(scene: PointScene): PointViewport {
  if (scene.aspect === 1) return { x: 150, y: 100, width: 800, height: 600 };
  if (scene.aspect === 2) return { x: 250, y: 100, width: 600, height: 600 };
  return { x: 30, y: 107.5, width: 1040, height: 585 };
}
export function pointPreset(index: number): PointScene {
  const s = initialPointScene();
  if (index !== 0) s.debug = true;
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
    ...stopFlight(scene),
    debug: true,
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
  if (axis !== "z" || !Number.isFinite(value)) return scene;
  return {
    ...stopFlight(scene),
    camera: { position: { x: 0, y: 0, z: clamp(value, 0, flightLimit) } },
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
    ...stopFlight(scene),
    lens: { ...scene.lens, [key]: clamp(value, ...(bounds[key] as [number, number])) },
  };
}
export const flightLimit = 12;
export function stopFlight(scene: PointScene): PointScene {
  return { ...scene, paused: true, forwardHeld: false, backwardHeld: false };
}
export function flightDirection(scene: PointScene): number {
  if (scene.forwardHeld && scene.backwardHeld) return 0;
  if (scene.forwardHeld) return 1;
  if (scene.backwardHeld) return -1;
  if (!scene.paused) return 1;
  return 0;
}
export function advancePoint(scene: PointScene, dt: number, direction = 1): PointScene {
  if (!Number.isFinite(dt) || !Number.isFinite(direction) || dt <= 0 || direction === 0)
    return scene;
  const speed = 2;
  const start = scene.camera.position.z;
  const finish = clamp(start + clamp(direction, -1, 1) * speed * Math.min(dt, 0.1), 0, flightLimit);
  const next = {
    ...scene,
    camera: { position: { ...scene.camera.position, z: finish } },
    elapsed: scene.elapsed + Math.abs(finish - start) / speed,
  };
  if ((direction > 0 && finish >= flightLimit) || (direction < 0 && finish <= 0))
    return stopFlight(next);
  return next;
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
