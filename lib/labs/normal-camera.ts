import { add3, subtract3, scale3, dot3, type Vec3 } from "./normal.ts";
export interface CompassCamera {
  yaw: number;
  pitch: number;
  radius: number;
}
export const initialCompassCamera = (): CompassCamera => ({ yaw: 0.7, pitch: 0.4, radius: 9 });
export function compassEye(camera: CompassCamera): Vec3 {
  const horizontal = Math.cos(camera.pitch);
  return {
    x: camera.radius * horizontal * Math.sin(camera.yaw),
    y: camera.radius * Math.sin(camera.pitch),
    z: camera.radius * horizontal * Math.cos(camera.yaw),
  };
}
export function worldToCompassCamera(point: Vec3, camera: CompassCamera): Vec3 {
  const sy = Math.sin(camera.yaw),
    cy = Math.cos(camera.yaw),
    sp = Math.sin(camera.pitch),
    cp = Math.cos(camera.pitch);
  return {
    x: dot3(point, { x: cy, y: 0, z: -sy }),
    y: dot3(point, { x: -sp * sy, y: cp, z: -sp * cy }),
    z: camera.radius - dot3(point, { x: cp * sy, y: sp, z: cp * cy }),
  };
}
export function projectCompassPoint(point: Vec3): { x: number; y: number } | null {
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    !Number.isFinite(point.z) ||
    point.z < 0.2 ||
    point.z > 30
  )
    return null;
  return { x: 550 + (420 * point.x) / point.z, y: 410 - (420 * point.y) / point.z };
}
export function clipCompassDepth(start: Vec3, end: Vec3): [Vec3, Vec3] | null {
  if (![start.x, start.y, start.z, end.x, end.y, end.z].every(Number.isFinite)) return null;
  for (const [plane, sign] of [
    [0.2, 1],
    [30, -1],
  ]) {
    const a = (start.z - plane) * sign,
      b = (end.z - plane) * sign;
    if (a < 0 && b < 0) return null;
    if (a < 0 || b < 0) {
      const hit = add3(start, scale3(subtract3(end, start), a / (a - b)));
      hit.z = plane;
      if (a < 0) start = hit;
      else end = hit;
    }
  }
  return [start, end];
}
export function orbitCompass(camera: CompassCamera, dx: number, dy: number): CompassCamera {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return camera;
  let yaw = (camera.yaw + dx * 0.008) % (2 * Math.PI);
  if (yaw > Math.PI) yaw -= 2 * Math.PI;
  if (yaw < -Math.PI) yaw += 2 * Math.PI;
  return { ...camera, yaw, pitch: Math.max(-1.2, Math.min(1.2, camera.pitch + dy * 0.008)) };
}
