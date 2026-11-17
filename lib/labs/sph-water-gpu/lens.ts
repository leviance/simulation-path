import type { Vec3 } from "./state.ts";

export interface WaterCamera {
  yaw: number;
  pitch: number;
  distance: number;
}
export const initialWaterCamera: WaterCamera = { yaw: 0.72, pitch: 0.48, distance: 1.95 };
export const cameraTarget: Vec3 = [0.7, 0.22, 0.55];
export function limitWaterCamera(c: WaterCamera): WaterCamera {
  return {
    yaw: c.yaw,
    pitch: Math.max(0.1, Math.min(1.25, c.pitch)),
    distance: Math.max(1.35, Math.min(4.5, c.distance)),
  };
}
export function waterCameraFrame(camera: WaterCamera, height: number) {
  const sy = Math.sin(camera.yaw),
    cy = Math.cos(camera.yaw),
    sp = Math.sin(camera.pitch),
    cp = Math.cos(camera.pitch);
  const eye: Vec3 = [
    cameraTarget[0] + sy * cp * camera.distance,
    cameraTarget[1] + sp * camera.distance,
    cameraTarget[2] + cy * cp * camera.distance,
  ];
  const forward: Vec3 = [-sy * cp, -sp, -cy * cp],
    right: Vec3 = [cy, 0, -sy],
    up: Vec3 = [-sy * sp, cp, -cy * sp];
  return { eye, forward, right, up, focal: height / (2 * Math.tan((25 * Math.PI) / 180)) };
}
export function waterProject(point: Vec3, camera: WaterCamera, width: number, height: number) {
  const b = waterCameraFrame(camera, height),
    x = point[0] - b.eye[0],
    y = point[1] - b.eye[1],
    z = point[2] - b.eye[2];
  const depth = x * b.forward[0] + y * b.forward[1] + z * b.forward[2];
  if (depth < 0.05) return null;
  return {
    x: width / 2 + (b.focal * (x * b.right[0] + y * b.right[1] + z * b.right[2])) / depth,
    y: height / 2 - (b.focal * (x * b.up[0] + y * b.up[1] + z * b.up[2])) / depth,
    depth,
  };
}
export function waterGroundPick(
  camera: WaterCamera,
  width: number,
  height: number,
  x: number,
  y: number,
  planeY = 0.22,
): Vec3 | null {
  const b = waterCameraFrame(camera, height),
    sx = (x - width / 2) / b.focal,
    sy = (height / 2 - y) / b.focal;
  const d: Vec3 = b.forward.map((v, a) => v + sx * b.right[a] + sy * b.up[a]) as Vec3;
  if (Math.abs(d[1]) < 1e-9) return null;
  const t = (planeY - b.eye[1]) / d[1];
  if (t <= 0) return null;
  return [b.eye[0] + t * d[0], planeY, b.eye[2] + t * d[2]];
}
