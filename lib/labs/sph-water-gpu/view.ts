import type { Vec3 } from "./model.ts";
export type Camera = { yaw: number; pitch: number; zoom: number };
export const defaultCamera: Camera = { yaw: 0.6, pitch: -0.3, zoom: 1 };
export function project(p: Vec3, camera: Camera, width: number, height: number) {
  const dx = p.x - 0.5,
    dy = p.y - 0.5,
    dz = p.z - 0.5;
  const x = Math.cos(camera.yaw) * dx + Math.sin(camera.yaw) * dz;
  const depth = -Math.sin(camera.yaw) * dx + Math.cos(camera.yaw) * dz;
  const y = Math.cos(camera.pitch) * dy - Math.sin(camera.pitch) * depth;
  const z = Math.sin(camera.pitch) * dy + Math.cos(camera.pitch) * depth;
  const scale = Math.min(width, height) * 0.75 * camera.zoom;
  return { x: width / 2 + scale * x, y: height / 2 - scale * y, z, scale };
}
