import type { Vec3 } from "./model.ts";
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: Vec3, s: number): Vec3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export function unit(v: Vec3): Vec3 {
  const n = Math.hypot(...v);
  return n > 1e-12 ? mul(v, 1 / n) : [0, 1, 0];
}
export const mix = (a: Vec3, b: Vec3, t: number) => add(a, mul(sub(b, a), t));
export interface Camera {
  yaw: number;
  pitch: number;
  distance: number;
}
export const defaultCamera: Camera = { yaw: 0.58, pitch: 0.36, distance: 300 };
export function limitCamera(camera: Camera): Camera {
  if (![camera.yaw, camera.pitch, camera.distance].every(Number.isFinite))
    throw new RangeError("Finite camera required");
  return {
    yaw: camera.yaw,
    pitch: Math.max(-1.05, Math.min(1.25, camera.pitch)),
    distance: Math.max(280, Math.min(1000, camera.distance)),
  };
}
export function cameraFrame(input: Camera, width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1)
    throw new RangeError("Positive viewport dimensions required");
  const camera = limitCamera(input);
  const eye: Vec3 = [
    camera.distance * Math.cos(camera.pitch) * Math.sin(camera.yaw),
    camera.distance * Math.sin(camera.pitch),
    camera.distance * Math.cos(camera.pitch) * Math.cos(camera.yaw),
  ];
  const forward = unit(mul(eye, -1)),
    right = unit(cross(forward, [0, 1, 0]));
  return {
    eye,
    forward,
    right,
    up: cross(right, forward),
    width,
    height,
    focal: height / (2 * Math.tan(0.35)),
  };
}
export type CameraFrame = ReturnType<typeof cameraFrame>;
export function cameraRay(frame: CameraFrame, x: number, y: number) {
  return add(
    add(frame.forward, mul(frame.right, (x - frame.width * 0.5) / frame.focal)),
    mul(frame.up, (frame.height * 0.5 - y) / frame.focal),
  );
}
export function project(frame: CameraFrame, p: Vec3) {
  if (!p.every(Number.isFinite)) return undefined;
  const delta = sub(p, frame.eye),
    depth = dot(delta, frame.forward);
  if (depth <= 1) return undefined;
  return {
    x: frame.width * 0.5 + (frame.focal * dot(delta, frame.right)) / depth,
    y: frame.height * 0.5 - (frame.focal * dot(delta, frame.up)) / depth,
    depth,
  };
}
