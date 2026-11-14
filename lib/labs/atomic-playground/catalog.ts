import type { Vec3 } from "../normal.ts";

export const orbitalIds = [
  "s1",
  "s2",
  "px",
  "py",
  "pz",
  "dz2",
  "dxy",
  "dx2y2",
  "fz3",
  "fxyz",
] as const;
export type OrbitalId = (typeof orbitalIds)[number];
export type DensityId = OrbitalId | "uniformVolume" | "affineMu";
export interface Orbital {
  id: OrbitalId;
  label: string;
  n: number;
  l: number;
  rMax: number;
  viewRadius: number;
  formula: string;
}
const pi = Math.PI;
export const orbitals: readonly Orbital[] = [
  { id: "s1", label: "1s", n: 1, l: 0, rMax: 12, viewRadius: 4, formula: "R=2 exp(−r); Y=1/√(4π)" },
  {
    id: "s2",
    label: "2s",
    n: 2,
    l: 0,
    rMax: 32,
    viewRadius: 12,
    formula: "R=(2−r) exp(−r/2)/(2√2); Y=1/√(4π)",
  },
  {
    id: "px",
    label: "2pₓ",
    n: 2,
    l: 1,
    rMax: 32,
    viewRadius: 12,
    formula: "R=r exp(−r/2)/(2√6); Y=√(3/4π) uₓ",
  },
  {
    id: "py",
    label: "2pᵧ",
    n: 2,
    l: 1,
    rMax: 32,
    viewRadius: 12,
    formula: "R=r exp(−r/2)/(2√6); Y=√(3/4π) uᵧ",
  },
  {
    id: "pz",
    label: "2p_z",
    n: 2,
    l: 1,
    rMax: 32,
    viewRadius: 12,
    formula: "R=r exp(−r/2)/(2√6); Y=√(3/4π) u_z",
  },
  {
    id: "dz2",
    label: "3d_z²",
    n: 3,
    l: 2,
    rMax: 60,
    viewRadius: 24,
    formula: "R=C₃₂ r² exp(−r/3); Y=√(5/16π)(3u_z²−1)",
  },
  {
    id: "dxy",
    label: "3d_xy",
    n: 3,
    l: 2,
    rMax: 60,
    viewRadius: 24,
    formula: "R=C₃₂ r² exp(−r/3); Y=√(15/4π) uₓuᵧ",
  },
  {
    id: "dx2y2",
    label: "3d_x²−y²",
    n: 3,
    l: 2,
    rMax: 60,
    viewRadius: 24,
    formula: "R=C₃₂ r² exp(−r/3); Y=√(15/16π)(uₓ²−uᵧ²)",
  },
  {
    id: "fz3",
    label: "4f_z³",
    n: 4,
    l: 3,
    rMax: 96,
    viewRadius: 40,
    formula: "R=C₄₃ r³ exp(−r/4); Y=√(7/16π) u_z(5u_z²−3)",
  },
  {
    id: "fxyz",
    label: "4f_xyz",
    n: 4,
    l: 3,
    rMax: 96,
    viewRadius: 40,
    formula: "R=C₄₃ r³ exp(−r/4); Y=√(105/4π) uₓuᵧu_z",
  },
];

export function orbital(id: OrbitalId): Orbital {
  const result = orbitals.find((item) => item.id === id);
  if (!result) throw new RangeError("Preset orbital không có trong catalog được cung cấp.");
  return result;
}
function factorial(value: number) {
  let result = 1;
  for (let i = 2; i <= value; ++i) result *= i;
  return result;
}
export function radialAmplitude(id: DensityId, r: number, rMax = 4): number {
  if (!Number.isFinite(r) || r < 0) throw new RangeError("r phải hữu hạn và không âm.");
  if (id === "uniformVolume" || id === "affineMu") return r <= rMax ? 1 : 0;
  const { n, l } = orbital(id);
  if (r > 1_000_000) return 0;
  if (id === "s1") return 2 * Math.exp(-r);
  if (id === "s2") return ((2 - r) * Math.exp(-r / 2)) / (2 * Math.sqrt(2));
  const constant = (2 / n) ** (l + 1.5) / Math.sqrt(2 * n * factorial(n + l));
  return constant * r ** l * Math.exp(-r / n);
}
export function angularAmplitude(id: DensityId, direction: Vec3): number {
  const { x, y, z } = direction;
  if (![x, y, z].every(Number.isFinite)) throw new RangeError("Hướng lấy mẫu phải hữu hạn.");
  if (id === "affineMu") return Math.sqrt(Math.max(0, 1 + 0.6 * z) / (4 * pi));
  if (id === "s1" || id === "s2" || id === "uniformVolume") return 1 / Math.sqrt(4 * pi);
  if (id === "px") return Math.sqrt(3 / (4 * pi)) * x;
  if (id === "py") return Math.sqrt(3 / (4 * pi)) * y;
  if (id === "pz") return Math.sqrt(3 / (4 * pi)) * z;
  if (id === "dz2") return Math.sqrt(5 / (16 * pi)) * (3 * z * z - 1);
  if (id === "dxy") return Math.sqrt(15 / (4 * pi)) * x * y;
  if (id === "dx2y2") return Math.sqrt(15 / (16 * pi)) * (x * x - y * y);
  if (id === "fz3") return Math.sqrt(7 / (16 * pi)) * z * (5 * z * z - 3);
  if (id === "fxyz") return Math.sqrt(105 / (4 * pi)) * x * y * z;
  throw new RangeError("Density không có trong catalog.");
}
export function densityAt(id: DensityId, point: Vec3, rMax = 4) {
  const r = Math.hypot(point.x, point.y, point.z);
  const direction =
    r > 0 ? { x: point.x / r, y: point.y / r, z: point.z / r } : { x: 0, y: 0, z: 1 };
  const amplitude = radialAmplitude(id, r, rMax) * angularAmplitude(id, direction);
  return { density: amplitude * amplitude, sign: Math.sign(amplitude), r };
}

// Closed-form radial integrals are references, separate from the midpoint CDF.
function integerGammaCdf(shape: number, x: number) {
  // Beyond this point the omitted tail is below double precision. Avoid 0*Inf.
  if (x > 745) return 1;
  if (x < shape + 1) {
    // Sum the positive lower-gamma series directly. Subtracting a tail close
    // to one loses the tiny central-region probability of higher-l orbitals.
    let sum = 1,
      term = 1;
    for (let k = 1; k <= 256; ++k) {
      term *= x / (shape + k);
      sum += term;
      if (term <= sum * Number.EPSILON) break;
    }
    return (Math.exp(-x + shape * Math.log(x)) * sum) / factorial(shape);
  }
  let sum = 1,
    term = 1;
  for (let k = 1; k < shape; ++k) {
    term *= x / k;
    sum += term;
  }
  return Math.max(0, Math.min(1, 1 - Math.exp(-x) * sum));
}
export function radialCdf(id: DensityId, r: number, rMax = 4) {
  if (!Number.isFinite(r)) throw new RangeError("Bán kính tích phân không hữu hạn.");
  if (r <= 0) return 0;
  if (id === "uniformVolume" || id === "affineMu") return Math.min(1, (r / rMax) ** 3);
  if (id === "s2")
    return Math.max(
      0,
      Math.min(1, integerGammaCdf(3, r) - 3 * integerGammaCdf(4, r) + 3 * integerGammaCdf(5, r)),
    );
  const { n, l } = orbital(id);
  return integerGammaCdf(2 * l + 3, (2 * r) / n);
}
