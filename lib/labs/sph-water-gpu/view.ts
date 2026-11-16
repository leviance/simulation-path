import type { Vec3 } from "./model.ts";
export type Camera = { yaw: number; pitch: number; zoom: number };
export const defaultCamera: Camera = { yaw: 0.65, pitch: 0.45, zoom: 1 };
export const focalLength = 2.1445069205095586;
export const nearPlane = 0.02;
export const farPlane = 12;

export function orbit(camera: Camera, dx: number, dy: number): Camera {
  return {
    ...camera,
    yaw: Math.atan2(Math.sin(camera.yaw + dx), Math.cos(camera.yaw + dx)),
    pitch: Math.max(-1.2, Math.min(1.2, camera.pitch + dy)),
  };
}

export function zoomCamera(camera: Camera, factor: number): Camera {
  return { ...camera, zoom: Math.max(0.4, Math.min(2, camera.zoom * factor)) };
}
export function project(p: Vec3, camera: Camera, width: number, height: number) {
  const dx = p.x - 0.5,
    dy = p.y - 0.4,
    dz = p.z - 0.5;
  const x = Math.cos(camera.yaw) * dx + Math.sin(camera.yaw) * dz;
  const depth = -Math.sin(camera.yaw) * dx + Math.cos(camera.yaw) * dz;
  const y = Math.cos(camera.pitch) * dy - Math.sin(camera.pitch) * depth;
  const z = Math.sin(camera.pitch) * dy + Math.cos(camera.pitch) * depth - 1.75 / camera.zoom;
  const scale = (height * 0.5 * focalLength) / Math.max(nearPlane, -z);
  return {
    x: width / 2 + scale * x,
    y: height / 2 - scale * y,
    z,
    scale,
    visible: z < -nearPlane && z > -farPlane,
  };
}
