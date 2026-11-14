import {
  angularAmplitude,
  densityAt,
  orbital,
  radialAmplitude,
  radialCdf,
  type DensityId,
  type OrbitalId,
} from "./catalog.ts";
import type { Vec3 } from "../normal.ts";

export const radialBins = 2048,
  muBins = 64,
  phiBins = 128;
export type SamplingMode = "weighted" | "uniformRadius" | "uniformAngle";
export interface Distribution {
  cdf: Float64Array;
  integral: number;
}
export interface SampleTables {
  id: DensityId;
  rMax: number;
  radial: Distribution;
  angular: Distribution;
  radialBins: number;
  muBins: number;
  phiBins: number;
  tail: number;
}
export interface Sample {
  point: Vec3;
  density: number;
  sign: number;
  r: number;
}
export interface SampleTrace {
  sample: Sample;
  uniforms: readonly number[];
  radialBin: number;
  angularBin: number;
  radialCdf: readonly [number, number];
  angularCdf: readonly [number, number];
  muBin: number;
  phiBin: number;
  mu: number;
  phi: number;
  mode: SamplingMode;
}

export function mix32(value: number) {
  let x = value >>> 0;
  x = (x ^ (x >>> 16)) >>> 0;
  x = Math.imul(x, 0x7feb352d) >>> 0;
  x = (x ^ (x >>> 15)) >>> 0;
  x = Math.imul(x, 0x846ca68b) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
export function uniform(index: number, seed: number, dimension: number) {
  const input = (seed ^ mix32((index + 0x9e3779b9) >>> 0) ^ Math.imul(dimension, 0x85ebca6b)) >>> 0;
  // Twenty-three bits keep both endpoints excluded even after a float32 cast.
  return ((mix32(input) >>> 9) + 0.5) / 8388608;
}
export function buildDistribution(weights: readonly number[], measure: number): Distribution {
  if (!weights.length || weights.length > 65536 || !Number.isFinite(measure) || measure <= 0)
    throw new RangeError("Bảng trọng số phải hữu hạn và có measure dương.");
  const cdf = new Float64Array(weights.length + 1);
  let total = 0,
    correction = 0;
  for (let i = 0; i < weights.length; ++i) {
    const weight = weights[i];
    if (!Number.isFinite(weight) || weight < 0)
      throw new RangeError("Weight phải hữu hạn, không âm.");
    const mass = weight * measure - correction,
      next = total + mass;
    correction = next - total - mass;
    total = next;
    cdf[i + 1] = total;
  }
  if (!Number.isFinite(total) || total <= 0)
    throw new RangeError("Tổng probability mass phải dương.");
  for (let i = 1; i < cdf.length; ++i) cdf[i] /= total;
  cdf[cdf.length - 1] = 1;
  return { cdf, integral: total };
}
export function selectBin(cdf: Float64Array, u: number) {
  if (!Number.isFinite(u) || u < 0 || u >= 1 || cdf.length < 2)
    throw new RangeError("CDF cần ít nhất một bin và u thuộc [0,1).");
  let low = 0,
    high = cdf.length - 1;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (cdf[middle] <= u) low = middle;
    else high = middle;
  }
  return low;
}
export function buildTables(
  id: DensityId,
  rMax?: number,
  nr = radialBins,
  nm = muBins,
  np = phiBins,
): SampleTables {
  const radius = rMax ?? (id === "uniformVolume" || id === "affineMu" ? 4 : orbital(id).rMax);
  if (
    !Number.isFinite(radius) ||
    radius <= 0 ||
    radius > 128 ||
    ![nr, nm, np].every((value) => Number.isInteger(value) && value >= 4 && value <= 4096) ||
    nm * np > 65536
  )
    throw new RangeError("Độ phân giải bảng hoặc R_max vượt giới hạn lab.");
  const dr = radius / nr;
  const radial = buildDistribution(
    Array.from({ length: nr }, (_, bin) => {
      const r = (bin + 0.5) * dr,
        amplitude = radialAmplitude(id, r, radius);
      return r * r * amplitude * amplitude;
    }),
    dr,
  );
  const angular = buildDistribution(
    Array.from({ length: nm * np }, (_, bin) => {
      const mu = -1 + (2 * (Math.floor(bin / np) + 0.5)) / nm,
        phi = (2 * Math.PI * ((bin % np) + 0.5)) / np;
      const side = Math.sqrt(Math.max(0, 1 - mu * mu));
      const amplitude = angularAmplitude(id, {
        x: side * Math.cos(phi),
        y: side * Math.sin(phi),
        z: mu,
      });
      return amplitude * amplitude;
    }),
    (2 / nm) * ((2 * Math.PI) / np),
  );
  return {
    id,
    rMax: radius,
    radial,
    angular,
    radialBins: nr,
    muBins: nm,
    phiBins: np,
    tail: 1 - radialCdf(id, radius, radius),
  };
}
export function traceSample(
  tables: SampleTables,
  index: number,
  seed: number,
  mode: SamplingMode = "weighted",
): SampleTrace {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index > 0xffffffff ||
    !Number.isInteger(seed) ||
    seed < 0 ||
    seed > 0xffffffff
  )
    throw new RangeError("Sample ID và seed phải là số nguyên uint32.");
  const u = Array.from({ length: 5 }, (_, dimension) => uniform(index, seed, dimension));
  const rBin = selectBin(tables.radial.cdf, u[0]),
    aBin = selectBin(tables.angular.cdf, u[2]);
  let r = ((rBin + u[1]) * tables.rMax) / tables.radialBins;
  let mu = -1 + (2 * (Math.floor(aBin / tables.phiBins) + u[3])) / tables.muBins;
  let phi = (2 * Math.PI * ((aBin % tables.phiBins) + u[4])) / tables.phiBins;
  if (mode === "uniformRadius") r = u[0] * tables.rMax;
  if (mode === "uniformAngle") {
    mu = Math.cos(Math.PI * u[3]);
    phi = 2 * Math.PI * u[4];
  }
  const side = Math.sqrt(Math.max(0, 1 - mu * mu));
  const point = { x: r * side * Math.cos(phi), y: r * side * Math.sin(phi), z: r * mu };
  const actual = densityAt(tables.id, point, tables.rMax);
  if (![point.x, point.y, point.z, actual.density].every(Number.isFinite))
    throw new RangeError("Không công bố sample NaN/Inf.");
  return {
    sample: { point, density: actual.density, sign: actual.sign, r },
    uniforms: u,
    radialBin: rBin,
    angularBin: aBin,
    radialCdf: [tables.radial.cdf[rBin], tables.radial.cdf[rBin + 1]],
    angularCdf: [tables.angular.cdf[aBin], tables.angular.cdf[aBin + 1]],
    muBin: Math.floor(aBin / tables.phiBins),
    phiBin: aBin % tables.phiBins,
    mu,
    phi,
    mode,
  };
}
export function samplePosition(
  tables: SampleTables,
  index: number,
  seed: number,
  mode: SamplingMode = "weighted",
): Sample {
  // Generation and the teaching trace intentionally use this same calculation.
  return traceSample(tables, index, seed, mode).sample;
}
export function defaultTables(id: OrbitalId) {
  return buildTables(id);
}
