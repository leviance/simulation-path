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
  [0.018, 0.029, 0.048],
  [0.102, 0.118, 0.141],
  [0.235, 0.165, 0.145],
  [0.65, 0.415, 0.26],
  [0.202, 0.193, 0.29],
  [0.105, 0.32, 0.411],
  [0.17, 0.613, 0.646],
  [0.55, 0.81, 0.756],
  [0.96, 0.903, 0.725],
  [0.732, 0.574, 0.842],
  [0.987, 0.944, 1.0],
];
export function scalarColor(scalar: number, window: DisplayWindow, colored: boolean): Color {
  const t = windowValue(scalar, window);
  if (!colored) return [t, t, t];
  const p = 10 * t,
    lower = Math.min(9, Math.floor(p)),
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
