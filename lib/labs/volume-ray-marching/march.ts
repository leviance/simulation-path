import {
  at,
  boxInterval,
  cameraRay,
  defaultSettings,
  dot,
  normalize,
  stopThreshold,
  validate,
  type Camera,
  type Mode,
  type Point,
  type Ray,
  type Settings,
} from "./model.ts";
import { sampleFast, type Volume } from "./volume.ts";
export interface Sample {
  distance: number;
  ds: number;
  raw: number;
  density: number;
  transmittance: number;
  maximum: number;
  mean: number;
}
export interface Result {
  color: Point;
  transmittance: number;
  maximum: number;
  mean: number;
  length: number;
  samples: number;
  profile: Sample[];
}
const warm: Point[] = [
  [0.38, 0.49, 0.58],
  [0.65, 0.72, 0.77],
  [0.82, 0.86, 0.89],
  [0.95, 0.96, 0.96],
  [1, 0.98, 0.94],
];
const cool: Point[] = [
  [0.07, 0.16, 0.24],
  [0.08, 0.49, 0.57],
  [0.35, 0.78, 0.74],
  [1, 0.55, 0.22],
  [1, 0.92, 0.72],
];
export const classifiedDensity = (density: number, cutoff: number) =>
  Math.max(0, Math.min(1, (density - cutoff) / (1 - cutoff)));
export function transfer(density: number, palette: number): Point {
  if (palette === 2) return [1, 1, 1];
  const colors = palette === 1 ? cool : warm;
  const position = Math.max(0, Math.min(1, density)) * 4,
    first = Math.min(3, Math.floor(position)),
    fraction = position - first;
  return colors[first].map(
    (value, i) => value * (1 - fraction) + colors[first + 1][i] * fraction,
  ) as Point;
}
export function segmentAlpha(density: number, sigma: number, ds: number) {
  if (![density, sigma, ds].every(Number.isFinite) || density < 0 || sigma < 0 || ds <= 0)
    throw new RangeError("Finite nonnegative coefficients and positive segment length required");
  return -Math.expm1(-sigma * density * ds);
}
const light = normalize([-0.6, 0.8, 0.5]);
function litColor(
  volume: Volume,
  x: number,
  y: number,
  z: number,
  density: number,
  settings: Settings,
): Point {
  const color = transfer(density, settings.palette);
  if (!settings.lighting) return color;
  const h = 2 / volume.side;
  const gradient: Point = [
    (sampleFast(volume, x + h, y, z) - sampleFast(volume, x - h, y, z)) / (2 * h),
    (sampleFast(volume, x, y + h, z) - sampleFast(volume, x, y - h, z)) / (2 * h),
    (sampleFast(volume, x, y, z + h) - sampleFast(volume, x, y, z - h)) / (2 * h),
  ];
  const squared = dot(gradient, gradient);
  if (squared < 1e-6) return color;
  const diffuse = Math.max(0, -dot(gradient, light) / Math.sqrt(squared));
  return color.map((value) => value * (0.55 + 0.45 * diffuse)) as Point;
}
export function integrate(
  ray: Ray,
  volume: Volume,
  settings: Settings,
  stepLength: number,
  budget: number,
  record = false,
): Result {
  if (
    !Number.isFinite(stepLength) ||
    stepLength <= 0 ||
    !Number.isInteger(budget) ||
    budget < 1 ||
    budget > 4096
  )
    throw new RangeError("Invalid reference budget");
  const result: Result = {
    color: [0, 0, 0],
    transmittance: 1,
    maximum: 0,
    mean: 0,
    length: 0,
    samples: 0,
    profile: [],
  };
  const interval = boxInterval(ray);
  if (!interval) return result;
  result.length = interval.exit - interval.entry;
  const count = Math.ceil(result.length / stepLength);
  if (!Number.isFinite(count) || count < 1 || count > budget)
    throw new RangeError("Ray sample budget exceeded; no partial result");
  let weighted = 0,
    covered = 0;
  for (let i = 0; i < count; i++) {
    const start = interval.entry + i * stepLength,
      ds = Math.min(stepLength, interval.exit - start),
      distance = start + ds * 0.5;
    const x = ray.origin[0] + ray.direction[0] * distance,
      y = ray.origin[1] + ray.direction[1] * distance,
      z = ray.origin[2] + ray.direction[2] * distance;
    const raw = sampleFast(volume, x, y, z),
      density = classifiedDensity(raw, settings.cutoff);
    if (!Number.isFinite(raw)) throw new RangeError("Nonfinite volume sample");
    result.maximum = Math.max(result.maximum, density);
    weighted += density * ds;
    covered += ds;
    result.samples++;
    if (settings.mode === "alpha") {
      const alpha = -Math.expm1(-settings.sigma * density * ds),
        color = litColor(volume, x, y, z, density, settings);
      const contribution = result.transmittance * alpha;
      result.color[0] += contribution * color[0];
      result.color[1] += contribution * color[1];
      result.color[2] += contribution * color[2];
      result.transmittance *= Math.exp(-settings.sigma * density * ds);
    }
    if (record)
      result.profile.push({
        distance,
        ds,
        raw,
        density,
        transmittance: result.transmittance,
        maximum: result.maximum,
        mean: weighted / covered,
      });
    if (settings.mode === "alpha" && settings.early && result.transmittance <= stopThreshold) break;
  }
  result.mean = weighted / result.length;
  return result;
}
export function march(ray: Ray, volume: Volume, settings: Settings, record = false) {
  validate(settings);
  return integrate(ray, volume, settings, settings.stepLength, 512, record);
}
export function rawOutput(result: Result, mode: Mode): [number, number, number, number] {
  if (mode === "mip") return [result.maximum, result.maximum, result.maximum, 1];
  if (mode === "average") return [result.mean, result.mean, result.mean, 1];
  return [...result.color, result.transmittance];
}
export function background(ray: Ray, v: number): Point {
  const color: Point = [
    0.0015 + (0.004 - 0.0015) * (1 - v),
    0.003 + (0.008 - 0.003) * (1 - v),
    0.006 + (0.012 - 0.006) * (1 - v),
  ];
  if (Math.abs(ray.direction[1]) > 0.0001) {
    const t = (-1.08 - ray.origin[1]) / ray.direction[1];
    if (t > 0 && t < 30) {
      const point = at(ray, t);
      const fract = (n: number) => n - Math.floor(n);
      const cell = Math.min(
        Math.abs(fract(point[0] * 4 + 0.5) - 0.5),
        Math.abs(fract(point[2] * 4 + 0.5) - 0.5),
      );
      const q = Math.max(0, Math.min(1, (cell - 0.012) / (0.025 - 0.012)));
      const line = (1 - q * q * (3 - 2 * q)) * Math.exp(-0.035 * t * t);
      color[0] += 0.005 * line;
      color[1] += 0.011 * line;
      color[2] += 0.016 * line;
    }
  }
  return color;
}
export function pixel(
  camera: Camera,
  volume: Volume | null,
  settings: Settings,
  u: number,
  v: number,
  stage: number,
  aspect: number,
): Point {
  if (stage === 1) return [u, 1 - v, 0.2];
  const ray = cameraRay(camera, u, v, aspect);
  if (stage === 2) return ray.direction.map((value) => value * 0.5 + 0.5) as Point;
  const interval = boxInterval(ray);
  if (stage === 3) {
    const length = interval ? (interval.exit - interval.entry) / Math.sqrt(12) : 0;
    return [length, length, length];
  }
  if (!volume) throw new Error("Volume required from stage 4");
  if (stage === 4) {
    const p = interval ? at(ray, (interval.entry + interval.exit) / 2) : null;
    const d = p ? sampleFast(volume, ...p) : 0;
    return [d, d, d];
  }
  const result = march(ray, volume, settings);
  const bg = background(ray, v);
  if (settings.mode === "alpha")
    return result.color.map((value, i) => value + result.transmittance * bg[i]) as Point;
  const density = settings.mode === "mip" ? result.maximum : result.mean,
    color = transfer(density, settings.palette);
  return color.map((value, i) => value * density + bg[i] * (1 - density)) as Point;
}
export function analyticConstant(density: number, length: number, settings: Settings) {
  validate({ ...defaultSettings, ...settings });
  const classified = classifiedDensity(density, settings.cutoff);
  return {
    mip: classified,
    average: classified,
    transmittance: Math.exp(-settings.sigma * classified * length),
  };
}
