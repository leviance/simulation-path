import { dot, length, type Vec3 } from "./model.ts";
export function kernel(r: number, h: number) {
  const q = r / h,
    sigma = 1 / (Math.PI * h ** 3);
  if (q >= 2) return 0;
  if (q < 1) return sigma * (1 - 1.5 * q * q + 0.75 * q ** 3);
  return sigma * 0.25 * (2 - q) ** 3;
}
export function gradient(displacement: Vec3, h: number): Vec3 {
  const r = length(displacement),
    q = r / h;
  if (r === 0 || q >= 2) return { x: 0, y: 0, z: 0 };
  let derivative = -0.75 * (2 - q) ** 2;
  if (q < 1) derivative = -3 * q + 2.25 * q * q;
  const scale = derivative / (Math.PI * h ** 4 * r);
  return { x: scale * displacement.x, y: scale * displacement.y, z: scale * displacement.z };
}
export function viscosity(
  d: Vec3,
  v: Vec3,
  rhoA: number,
  rhoB: number,
  h: number,
  c: number,
  alpha: number,
) {
  const approach = dot(d, v);
  if (approach >= 0) return 0;
  const mu = (h * approach) / (dot(d, d) + 0.01 * h * h);
  return (-alpha * c * mu) / (0.5 * (rhoA + rhoB));
}
