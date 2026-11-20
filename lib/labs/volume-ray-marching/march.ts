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
  [0.42, 0.55, 0.7],
  [0.68, 0.78, 0.88],
  [0.88, 0.91, 0.95],
  [0.98, 0.97, 0.93],
  [1, 0.98, 0.9],
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
  const facing = Math.max(0, -dot(gradient, light) / Math.sqrt(dot(gradient, gradient) + 0.25));
  const nearDensity = sampleFast(
    volume,
    x + 0.13 * light[0],
    y + 0.13 * light[1],
    z + 0.13 * light[2],
  );
  const farDensity = sampleFast(
    volume,
    x + 0.32 * light[0],
    y + 0.32 * light[1],
    z + 0.32 * light[2],
  );
  const sun = Math.exp(-2.3 * (0.64 * nearDensity + 0.36 * farDensity));
  const direct = sun * (0.55 + 0.45 * facing);
  return [
    color[0] * (0.21 * (1 - direct) + direct),
    color[1] * (0.34 * (1 - direct) + 0.98 * direct),
    color[2] * (0.53 * (1 - direct) + 0.86 * direct),
  ];
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
    if (settings.mode === "alpha" && density > 0 && settings.sigma > 0) {
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
export function background(ray: Ray): Point {
  const smooth = (first: number, last: number, value: number) => {
    const q = Math.max(0, Math.min(1, (value - first) / (last - first)));
    return q * q * (3 - 2 * q);
  };
  const up = smooth(-0.12, 0.67, ray.direction[1]);
  const down = smooth(0, 0.66, -ray.direction[1]);
  const horizon: Point = [0.17, 0.29, 0.42];
  const zenith: Point = [0.029, 0.106, 0.235];
  const low: Point = [0.065, 0.143, 0.225];
  return horizon.map(
    (value, i) => (value + (zenith[i] - value) * up) * (1 - down) + low[i] * down,
  ) as Point;
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
  const bg = background(ray);
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
