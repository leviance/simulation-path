export interface DisplayWindow {
  level: number;
  width: number;
}
export type Color = [number, number, number];
export const defaultWindow: DisplayWindow = { level: 0.5, width: 1 };
export function windowValue(scalar: number, window: DisplayWindow) {
  if (
    !Number.isFinite(scalar) ||
    !Number.isFinite(window.level) ||
    !Number.isFinite(window.width) ||
    window.width <= 0
  )
    throw new RangeError("Finite scalar and positive window width required");
  return Math.max(0, Math.min(1, (scalar - window.level + window.width * 0.5) / window.width));
}
const stops: Color[] = [
  [0.025, 0.035, 0.055],
  [0.1, 0.27, 0.35],
  [0.24, 0.51, 0.52],
  [0.86, 0.67, 0.42],
  [0.98, 0.42, 0.24],
  [1, 0.94, 0.78],
];
export function scalarColor(scalar: number, window: DisplayWindow, colored: boolean): Color {
  const t = windowValue(scalar, window);
  if (!colored) return [t, t, t];
  const p = 5 * t,
    lower = Math.min(4, Math.floor(p)),
    fraction = p - lower;
  return stops[lower].map((v, i) => v + fraction * (stops[lower + 1][i] - v)) as Color;
}
export function colorImage(scalar: Float32Array, window: DisplayWindow, colored: boolean) {
  const rgba = new Uint8ClampedArray(scalar.length * 4);
  for (let i = 0; i < scalar.length; i++) {
    const color = scalarColor(scalar[i], window, colored);
    for (let channel = 0; channel < 3; channel++)
      rgba[4 * i + channel] = Math.floor(color[channel] * 255);
    rgba[4 * i + 3] = 255;
  }
  return rgba;
}
