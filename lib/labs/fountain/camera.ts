import type { Camera } from "./scene.ts";

export const fountainFocalScale = 1.20710678118;
export function fountainViewBasis(camera: Camera) {
  const cy = Math.cos(camera.yaw),
    sy = Math.sin(camera.yaw),
    cp = Math.cos(camera.pitch),
    sp = Math.sin(camera.pitch);
  const right = { x: cy, y: 0, z: -sy },
    up = { x: -sp * sy, y: cp, z: -sp * cy },
    forward = { x: cp * sy, y: sp, z: cp * cy };
  return {
    right,
    up,
    forward,
    eye: {
      x: camera.x - forward.x * camera.distance,
      y: camera.y - forward.y * camera.distance,
      z: camera.z - forward.z * camera.distance,
    },
  };
}

export function panFountainCamera(camera: Camera, dx: number, dy: number, height: number): Camera {
  if (!Number.isFinite(dx) || !Number.isFinite(dy) || !Number.isFinite(height) || height <= 0)
    throw new Error("Invalid camera pan");
  const scale = camera.distance / (height * fountainFocalScale);
  // Move the target along view-right/view-up, not the world's fixed X/Y axes.
  return {
    ...camera,
    x:
      camera.x -
      dx * scale * Math.cos(camera.yaw) -
      dy * scale * Math.sin(camera.pitch) * Math.sin(camera.yaw),
    y: camera.y + dy * scale * Math.cos(camera.pitch),
    z:
      camera.z +
      dx * scale * Math.sin(camera.yaw) -
      dy * scale * Math.sin(camera.pitch) * Math.cos(camera.yaw),
  };
}

export function projectFountainPoint(
  x: number,
  y: number,
  z: number,
  camera: Camera,
  width: number,
  height: number,
) {
  x -= camera.x;
  y -= camera.y;
  z -= camera.z;
  const rotatedX = Math.cos(camera.yaw) * x - Math.sin(camera.yaw) * z;
  const rotatedZ = Math.sin(camera.yaw) * x + Math.cos(camera.yaw) * z;
  const rotatedY = Math.cos(camera.pitch) * y - Math.sin(camera.pitch) * rotatedZ;
  const depth = Math.sin(camera.pitch) * y + Math.cos(camera.pitch) * rotatedZ + camera.distance;
  if (!Number.isFinite(depth) || depth <= 0.1) return null;
  const scale = (height * fountainFocalScale) / depth;
  const screenX = width * 0.5 + rotatedX * scale;
  const screenY = height * 0.5 - rotatedY * scale;
  return screenX >= 0 && screenY >= 0 && screenX < width && screenY < height
    ? { x: screenX, y: screenY, depth, scale }
    : null;
}
