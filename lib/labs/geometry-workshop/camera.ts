import { add3, cross3, dot3, scale3, subtract3, type Vec3 } from "../normal.ts";
import { fullTurn, unit } from "./surfaces.ts";

export interface Camera {
  target: Vec3;
  yaw: number;
  pitch: number;
  zoom: number;
}

export interface ScreenPoint {
  x: number;
  y: number;
  depth: number;
}

export function defaultCamera(): Camera {
  return { target: { x: 0, y: 0.22, z: 0 }, yaw: -0.78, pitch: 0.52, zoom: 1 };
}

export function cameraBasis(camera: Camera) {
  const horizontal = Math.cos(camera.pitch);
  const forward = {
    x: -horizontal * Math.cos(camera.yaw),
    y: -Math.sin(camera.pitch),
    z: -horizontal * Math.sin(camera.yaw),
  };
  const right = unit(cross3(forward, { x: 0, y: 1, z: 0 }));
  return { forward, right, up: cross3(right, forward) };
}

function pixelScale(camera: Camera, width: number, height: number) {
  return Math.min(width / 5, height / 4.25) * camera.zoom;
}

// Orthographic projection keeps the small teaching grid legible at every depth.
export function makeProjector(camera: Camera, width: number, height: number) {
  const { right, up, forward } = cameraBasis(camera);
  const scale = pixelScale(camera, width, height);
  return (point: Vec3): ScreenPoint => {
    const relative = subtract3(point, camera.target);
    return {
      x: width / 2 + dot3(relative, right) * scale,
      y: height * 0.46 - dot3(relative, up) * scale,
      depth: dot3(relative, forward),
    };
  };
}

export function orbit(camera: Camera, dx: number, dy: number): Camera {
  return {
    ...camera,
    yaw: (camera.yaw - dx * 0.007) % fullTurn,
    pitch: Math.min(1.45, Math.max(-1.45, camera.pitch + dy * 0.007)),
  };
}

export function pan(camera: Camera, dx: number, dy: number, width: number, height: number): Camera {
  const { right, up } = cameraBasis(camera);
  const scale = pixelScale(camera, width, height);
  const offset = add3(scale3(right, -dx / scale), scale3(up, dy / scale));
  const target = add3(camera.target, offset);
  // Keep accidental long drags recoverable without losing camera controls.
  if (dot3(target, target) > 144) return camera;
  return { ...camera, target };
}

export function zoom(camera: Camera, steps: number): Camera {
  return { ...camera, zoom: Math.min(3.2, Math.max(0.35, camera.zoom * Math.exp(steps * 0.14))) };
}
