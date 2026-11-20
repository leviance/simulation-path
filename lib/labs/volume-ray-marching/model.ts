export type Point = [number, number, number];
export type Mode = "mip" | "average" | "alpha";
export type Preset = "cloud" | "cores" | "slab" | "constant" | "ramp" | "empty";
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
  mode: Mode;
  stepLength: number;
  sigma: number;
  cutoff: number;
  palette: number;
  early: boolean;
  lighting: boolean;
}
export const defaultCamera: Camera = Object.freeze({
  yaw: 0.35,
  pitch: 0.16,
  distance: 3.0,
  inside: false,
});
export const defaultSettings: Settings = Object.freeze({
  mode: "alpha",
  stepLength: 0.02,
  sigma: 6,
  cutoff: 0,
  palette: 0,
  early: false,
  lighting: true,
});
export const presets: Preset[] = ["cloud", "cores", "slab", "constant", "ramp", "empty"];
export const presetNames = [
  "Mây nhiều lớp (dữ liệu tĩnh)",
  "Hai lõi mật độ",
  "Lớp slab",
  "Hằng 0,25",
  "Ramp XYZ",
  "Volume rỗng",
];
export const boxMinimum: Point = [-1, -1, -1];
export const boxMaximum: Point = [1, 1, 1];
export const maxSteps = 512;
export const stopThreshold = 0.0005;
export const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const multiply = (a: Point, s: number): Point => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Point, b: Point): Point => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export function normalize(point: Point): Point {
  const length = Math.sqrt(dot(point, point));
  if (!point.every(Number.isFinite) || !Number.isFinite(length) || length <= 0)
    throw new RangeError("Finite nonzero direction required");
  return multiply(point, 1 / length);
}
export function limitCamera(camera: Camera): Camera {
  if (![camera.yaw, camera.pitch, camera.distance].every(Number.isFinite))
    throw new RangeError("Nonfinite camera");
  return {
    ...camera,
    yaw: camera.yaw % (2 * Math.PI),
    pitch: Math.max(-1.45, Math.min(1.45, camera.pitch)),
    distance: Math.max(0.25, Math.min(8, camera.distance)),
  };
}
export function cameraBasis(input: Camera) {
  const camera = limitCamera(input);
  let origin: Point = [
    camera.distance * Math.cos(camera.pitch) * Math.sin(camera.yaw),
    camera.distance * Math.sin(camera.pitch),
    camera.distance * Math.cos(camera.pitch) * Math.cos(camera.yaw),
  ];
  const forward = normalize(multiply(origin, -1));
  const right = normalize(cross(forward, [0, 1, 0]));
  if (camera.inside) origin = [0, 0, 0];
  return { origin, forward, right, up: cross(right, forward) };
}
export function cameraRay(camera: Camera, u: number, v: number, aspect: number): Ray {
  if (![u, v, aspect].every(Number.isFinite) || aspect <= 0)
    throw new RangeError("Finite pixel and positive aspect required");
  const basis = cameraBasis(camera);
  const tangent = Math.tan((50 * Math.PI) / 360);
  return {
    origin: basis.origin,
    direction: normalize(
      add(
        add(basis.forward, multiply(basis.right, (2 * u - 1) * aspect * tangent)),
        multiply(basis.up, (1 - 2 * v) * tangent),
      ),
    ),
  };
}
export const at = (ray: Ray, t: number) => add(ray.origin, multiply(ray.direction, t));
export function boxInterval(ray: Ray) {
  if (
    ![...ray.origin, ...ray.direction].every(Number.isFinite) ||
    Math.abs(dot(ray.direction, ray.direction) - 1) > 1e-8
  )
    throw new RangeError("Finite unit ray required");
  let entry = 0,
    exit = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    if (ray.direction[axis] === 0) {
      if (ray.origin[axis] < -1 || ray.origin[axis] > 1) return null;
      continue;
    }
    let first = (-1 - ray.origin[axis]) / ray.direction[axis],
      last = (1 - ray.origin[axis]) / ray.direction[axis];
    if (first > last) [first, last] = [last, first];
    entry = Math.max(entry, first);
    exit = Math.min(exit, last);
    if (entry >= exit) return null;
  }
  return { entry, exit };
}
export function validate(settings: Settings) {
  if (
    !["mip", "average", "alpha"].includes(settings.mode) ||
    !Number.isInteger(settings.palette) ||
    settings.palette < 0 ||
    settings.palette > 2
  )
    throw new RangeError("Unknown mode or palette");
  if (
    !Number.isFinite(settings.stepLength) ||
    settings.stepLength < 0.008 ||
    settings.stepLength > 0.16
  )
    throw new RangeError("Step must be 0.008..0.16");
  if (!Number.isFinite(settings.sigma) || settings.sigma < 0 || settings.sigma > 12)
    throw new RangeError("Sigma must be 0..12");
  if (!Number.isFinite(settings.cutoff) || settings.cutoff < 0 || settings.cutoff > 0.8)
    throw new RangeError("Cutoff must be 0..0.8");
}
export function stageSettings(stage: number): Settings {
  if (!Number.isInteger(stage) || stage < 1 || stage > 10)
    throw new RangeError("Stage 1..10 required");
  const settings = { ...defaultSettings };
  if (stage < 6) settings.mode = "mip";
  if (stage < 7) {
    settings.palette = 2;
    settings.lighting = false;
  }
  return settings;
}
