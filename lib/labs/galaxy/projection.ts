import type { Camera } from "./scene.ts";
import type { Vec3 } from "../barnes-hut-nbody.ts";

export const galaxyFov = 0.62;

export function galaxyCameraView(view = 0): Camera {
  const camera = { yaw: -0.3, pitch: -0.97, distance: 4.85, x: 0, y: 0 };
  if (view === 1) return { ...camera, yaw: 0, pitch: 0, distance: 6.35 };
  if (view === 2) return { ...camera, yaw: 0, pitch: Math.PI / 2, distance: 4.4 };
  return camera;
}

// Dolly thay đổi vị trí camera, không thay góc mở. Khoảng cách có dấu cho
// phép camera đi qua tâm thay vì bị chặn ở một bán kính dương.
export function dollyGalaxyCamera(camera: Camera, amount: number) {
  if (!Number.isFinite(amount)) return;
  const step = Math.max(0.12, Math.abs(camera.distance) * 0.12);
  camera.distance = Math.max(
    -16,
    Math.min(30, camera.distance - Math.max(-3, Math.min(3, amount)) * step),
  );
}

export function projectGalaxy(point: Vec3, camera: Camera, width: number, height: number) {
  const x = point.x - camera.x;
  const y = point.y - camera.y;
  const z = point.z;
  const yawX = Math.cos(camera.yaw) * x - Math.sin(camera.yaw) * z;
  const yawZ = Math.sin(camera.yaw) * x + Math.cos(camera.yaw) * z;
  const cameraY = Math.cos(camera.pitch) * y - Math.sin(camera.pitch) * yawZ;
  const depth = Math.sin(camera.pitch) * y + Math.cos(camera.pitch) * yawZ + camera.distance;
  const scale = (height * 0.5) / Math.tan(galaxyFov / 2);
  return {
    x: width / 2 + (yawX * scale) / depth,
    y: height * 0.47 - (cameraY * scale) / depth,
    depth,
    visible: depth > 0.1,
  };
}
