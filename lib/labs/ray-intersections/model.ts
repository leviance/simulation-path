export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface Camera {
  origin: Vec3;
  target: Vec3;
  tanHalfFov: number;
}
export interface Ray {
  origin: Vec3;
  direction: Vec3;
  tMin: number;
  tMax: number;
}
export interface Hit {
  t: number;
  point: Vec3;
  normal: Vec3;
  frontFace: boolean;
  objectId: number;
  u: number;
  v: number;
}
export interface Scene {
  plane: { point: Vec3; normal: Vec3 };
  sphere: { center: Vec3; radius: number };
  box: { minimum: Vec3; maximum: Vec3 };
  triangle: { a: Vec3; b: Vec3; c: Vec3 };
}
export const scene: Scene = {
  plane: { point: { x: 0, y: -1, z: 0 }, normal: { x: 0, y: 1, z: 0 } },
  sphere: { center: { x: -1.5, y: 0, z: 0 }, radius: 0.85 },
  box: { minimum: { x: 0.3, y: -0.9, z: 0 }, maximum: { x: 1.7, y: 0.7, z: 1.4 } },
  triangle: {
    a: { x: -0.9, y: -0.6, z: 2.5 },
    b: { x: 1, y: -0.6, z: 2.5 },
    c: { x: 0.1, y: 1.3, z: 2.5 },
  },
};
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const subtract = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const multiply = (v: Vec3, s: number): Vec3 => ({ x: v.x * s, y: v.y * s, z: v.z * s });
export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const length = (v: Vec3) => Math.hypot(v.x, v.y, v.z);
export const finite = (v: Vec3) =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
export function normalize(v: Vec3): Vec3 {
  const magnitude = length(v);
  if (!Number.isFinite(magnitude) || magnitude <= 0) return { x: 0, y: 0, z: 0 };
  return multiply(v, 1 / magnitude);
}
export function cameraBasis(camera: Camera) {
  const forward = normalize(subtract(camera.target, camera.origin));
  const right = normalize(cross({ x: 0, y: 1, z: 0 }, forward));
  return { forward, right, up: cross(forward, right) };
}
export function presetCamera(preset = 0, geometry = scene): Camera {
  const camera: Camera = {
    origin: { x: 0, y: 1.5, z: -7 },
    target: { x: 0, y: 0.3, z: 0 },
    tanHalfFov: Math.tan((55 * Math.PI) / 360),
  };
  if (preset === 1) camera.origin = { ...geometry.sphere.center };
  if (preset === 2) camera.origin = multiply(add(geometry.box.minimum, geometry.box.maximum), 0.5);
  if (preset === 1 || preset === 2) camera.target = add(camera.origin, { x: 0, y: 0, z: 1 });
  if (preset === 3) camera.target = add(camera.origin, { x: 0, y: 0, z: -1 });
  return camera;
}
export function project(point: Vec3, camera: Camera, width: number, height: number) {
  const basis = cameraBasis(camera),
    relative = subtract(point, camera.origin),
    depth = dot(relative, basis.forward);
  if (depth <= 0.05 || width <= 0 || height <= 0) return null;
  const scale = height / (2 * camera.tanHalfFov * depth);
  return {
    x: width / 2 + scale * dot(relative, basis.right),
    y: height / 2 - scale * dot(relative, basis.up),
  };
}
export function cameraRay(camera: Camera, u: number, v: number, aspect: number, tMax = 30): Ray {
  const basis = cameraBasis(camera);
  const screenX = (2 * u - 1) * aspect * camera.tanHalfFov,
    screenY = (1 - 2 * v) * camera.tanHalfFov;
  const offset = add(multiply(basis.right, screenX), multiply(basis.up, screenY));
  return {
    origin: camera.origin,
    direction: normalize(add(basis.forward, offset)),
    tMin: 1e-6,
    tMax,
  };
}
export const at = (ray: Ray, t: number) => add(ray.origin, multiply(ray.direction, t));
export const valid = (ray: Ray) =>
  finite(ray.origin) &&
  finite(ray.direction) &&
  length(ray.direction) > 0 &&
  Number.isFinite(ray.tMin) &&
  Number.isFinite(ray.tMax) &&
  ray.tMin >= 0 &&
  ray.tMax >= ray.tMin;
export const inRange = (ray: Ray, t: number) =>
  Number.isFinite(t) && t >= ray.tMin && t <= ray.tMax;
export const makeHit = (ray: Ray, t: number, normal: Vec3, objectId: number): Hit => ({
  t,
  point: at(ray, t),
  normal,
  objectId,
  frontFace: dot(ray.direction, normal) < 0,
  u: 0,
  v: 0,
});
