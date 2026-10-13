import { dot, h, length, type Vec2 } from "./model.ts";
const normalization = 10 / (7 * Math.PI * h * h);

export function kernel(r: number) {
  const q = Math.abs(r) / h;
  if (q >= 2) return 0;
  if (q < 1) return normalization * (1 - 1.5 * q * q + 0.75 * q * q * q);
  return normalization * 0.25 * (2 - q) ** 3;
}
export function gradient(displacement: Vec2): Vec2 {
  const r = length(displacement),
    q = r / h;
  if (r === 0 || q >= 2) return { x: 0, y: 0 };
  let derivative = -0.75 * (2 - q) ** 2;
  if (q < 1) derivative = -3 * q + 2.25 * q * q;
  const scale = (normalization * derivative) / (h * r);
  return { x: scale * displacement.x, y: scale * displacement.y };
}
export function artificialViscosity(
  displacement: Vec2,
  relativeVelocity: Vec2,
  densityA: number,
  densityB: number,
  soundSpeed: number,
  alpha: number,
) {
  const approach = dot(relativeVelocity, displacement);
  if (approach >= 0) return 0;
  const mu = (h * approach) / (dot(displacement, displacement) + 0.01 * h * h);
  return (-alpha * soundSpeed * mu) / (0.5 * (densityA + densityB));
}
