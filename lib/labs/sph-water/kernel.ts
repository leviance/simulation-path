import { h, type Settings } from "./model.ts";
const normalization = 10 / (7 * Math.PI * h * h);
export function kernel(distance: number) {
  const q = Math.abs(distance) / h;
  if (q >= 2) return 0;
  if (q < 1) return normalization * (1 - 1.5 * q * q + 0.75 * q * q * q);
  const tail = 2 - q;
  return normalization * 0.25 * tail * tail * tail;
}
export function gradient(dx: number, dy: number) {
  const distance = Math.sqrt(dx * dx + dy * dy),
    q = distance / h;
  if (distance === 0 || q >= 2) return { x: 0, y: 0 };
  let derivative = -0.75 * (2 - q) * (2 - q);
  if (q < 1) derivative = -3 * q + 2.25 * q * q;
  const factor = (normalization * derivative) / (h * distance);
  return { x: factor * dx, y: factor * dy };
}
export function artificialViscosity(
  dx: number,
  dy: number,
  dvx: number,
  dvy: number,
  densityA: number,
  densityB: number,
  settings: Settings,
) {
  const approach = dx * dvx + dy * dvy;
  if (approach >= 0) return 0;
  const mu = (h * approach) / (dx * dx + dy * dy + 0.01 * h * h);
  return (-settings.alpha * settings.soundSpeed * mu) / (0.5 * (densityA + densityB));
}
