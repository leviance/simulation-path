export type Point = [number, number, number];
export interface Camera {
  yaw: number;
  pitch: number;
  distance: number;
  inside: boolean;
}
export interface Ray {
  origin: Point;
  direction: Point;
}
export interface Settings {
  sigma: number;
  stepLength: number;
  warm: boolean;
  early: boolean;
}
export const defaultCamera: Camera = { yaw: 0.55, pitch: 0.2, distance: 8.5, inside: false };
export const defaultSettings: Settings = { sigma: 2, stepLength: 0.08, warm: true, early: false };
export const boxMinimum: Point = [-1.6, -1.92, -2.4],
  boxMaximum: Point = [1.6, 1.92, 2.4];
export const maxSteps = 512,
  stopThreshold = 0.001;
export const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const multiply = (a: Point, s: number): Point => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Point, b: Point): Point => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export function normalize(p: Point): Point {
  const length = Math.sqrt(dot(p, p));
  if (!Number.isFinite(length) || length === 0) throw new RangeError("Invalid direction");
  return multiply(p, 1 / length);
}
export function cameraBasis(camera: Camera) {
  let origin: Point = [
      camera.distance * Math.sin(camera.yaw) * Math.cos(camera.pitch),
      camera.distance * Math.sin(camera.pitch),
      -camera.distance * Math.cos(camera.yaw) * Math.cos(camera.pitch),
    ],
    forward = normalize(multiply(origin, -1));
  if (camera.inside) {
    origin = [0, 0, 0];
    forward = [0, 0, 1];
  }
  const right = normalize(cross([0, 1, 0], forward));
  return { origin, forward, right, up: cross(forward, right) };
}
export function cameraRay(camera: Camera, u: number, v: number, aspect: number): Ray {
  const b = cameraBasis(camera),
    tangent = Math.tan((55 * Math.PI) / 360),
    offset = add(
      multiply(b.right, (2 * u - 1) * aspect * tangent),
      multiply(b.up, (1 - 2 * v) * tangent),
    );
  return { origin: b.origin, direction: normalize(add(b.forward, offset)) };
}
export const at = (ray: Ray, t: number) => add(ray.origin, multiply(ray.direction, t));
export function boxInterval(ray: Ray, minimum = boxMinimum, maximum = boxMaximum) {
  if (Math.abs(dot(ray.direction, ray.direction) - 1) > 1e-6)
    throw new RangeError("Unit ray required");
  let entry = 0,
    exit = 20;
  for (let axis = 0; axis < 3; axis++) {
    if (
      ![ray.origin[axis], ray.direction[axis], minimum[axis], maximum[axis]].every(
        Number.isFinite,
      ) ||
      minimum[axis] >= maximum[axis]
    )
      throw new RangeError("Invalid ray or box");
    if (ray.direction[axis] === 0) {
      if (ray.origin[axis] < minimum[axis] || ray.origin[axis] > maximum[axis]) return null;
      continue;
    }
    let a = (minimum[axis] - ray.origin[axis]) / ray.direction[axis],
      b = (maximum[axis] - ray.origin[axis]) / ray.direction[axis];
    if (a > b) [a, b] = [b, a];
    entry = Math.max(entry, a);
    exit = Math.min(exit, b);
    if (entry >= exit) return null;
  }
  return { entry, exit };
}
export function validate(s: Settings) {
  if (
    !Number.isFinite(s.sigma) ||
    s.sigma < 0 ||
    s.sigma > 8 ||
    !Number.isFinite(s.stepLength) ||
    s.stepLength < 0.02 ||
    s.stepLength > 0.25
  )
    throw new RangeError("sigma 0..8; step 0.02..0.25");
}
