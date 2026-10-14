import {
  add,
  at,
  boxInterval,
  cameraRay,
  multiply,
  maxSteps,
  stopThreshold,
  validate,
  type Camera,
  type Point,
  type Ray,
  type Settings,
} from "./model.ts";
import { sampleDensity, type Volume } from "./volume.ts";
export const segmentAlpha = (rho: number, sigma: number, ds: number) =>
  -Math.expm1(-sigma * rho * ds);
export const transfer = (rho: number, warm: boolean): Point =>
  warm ? [0.2 + 0.8 * rho, 0.45 + 0.25 * rho, 1 - 0.8 * rho] : [0.8, 0.9, 1];
export interface Sample {
  t: number;
  ds: number;
  density: number;
  alpha: number;
  transmittance: number;
  color: Point;
}
export interface Result {
  color: Point;
  transmittance: number;
  samples: number;
  profile: Sample[];
}
export function march(ray: Ray, v: Volume, s: Settings, stage = 9, record = true): Result {
  validate(s);
  const result: Result = { color: [0, 0, 0], transmittance: 1, samples: 0, profile: [] },
    interval = boxInterval(ray);
  if (!interval) return result;
  const count = Math.ceil((interval.exit - interval.entry) / s.stepLength);
  if (count > maxSteps) throw new RangeError("Step budget exceeded; no partial result");
  for (let i = 0; i < count; i++) {
    const t = interval.entry + i * s.stepLength,
      ds = Math.min(s.stepLength, interval.exit - t),
      density = sampleDensity(v, at(ray, t + ds / 2)),
      alpha = segmentAlpha(density, s.sigma, ds),
      color = transfer(density, stage >= 7 && s.warm);
    result.color = add(result.color, multiply(color, result.transmittance * alpha));
    result.transmittance *= Math.exp(-s.sigma * density * ds);
    result.samples++;
    if (record)
      result.profile.push({
        t: t + ds / 2,
        ds,
        density,
        alpha,
        transmittance: result.transmittance,
        color: [...result.color],
      });
    if (stage >= 8 && s.early && result.transmittance <= stopThreshold) break;
  }
  return result;
}
export function pixel(
  camera: Camera,
  v: Volume | null,
  s: Settings,
  u: number,
  y: number,
  stage: number,
): Point {
  if (stage === 1) return [u, 1 - y, 0.2];
  const ray = cameraRay(camera, u, y, 4 / 3);
  if (stage === 2) return ray.direction.map((d) => d * 0.5 + 0.5) as Point;
  const interval = boxInterval(ray);
  if (!interval) return [0.025, 0.035, 0.055];
  if (stage === 3) {
    const d = (interval.exit - interval.entry) / 7;
    return [d, d, d];
  }
  if (!v) throw new Error("Density volume is required from stage 4");
  const density = sampleDensity(v, at(ray, (interval.entry + interval.exit) / 2));
  if (stage === 4) return [density, density, density];
  let result: Result;
  if (stage === 5) {
    const t = Math.exp(-s.sigma * density * (interval.exit - interval.entry));
    result = { color: multiply([0.8, 0.9, 1], 1 - t), transmittance: t, samples: 1, profile: [] };
  } else result = march(ray, v, s, stage, false);
  return add(result.color, multiply([0.025, 0.035, 0.055], result.transmittance));
}
