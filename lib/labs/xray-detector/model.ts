export type Point = [number, number, number];
export interface Beam {
  origin: Point;
  direction: Point;
  maximum: number;
}
export interface Material {
  minimum: Point;
  maximum: Point;
  muLow: number;
  muHigh: number;
}
export interface Settings {
  angle: number;
  strength: number;
  preset: number;
  numeric: boolean;
  stepLength: number;
  logView: boolean;
  invert: boolean;
  logRange: number;
  spectral: boolean;
  lowWeight: number;
  exposure: number;
}
export const defaultSettings: Settings = {
  angle: 0,
  strength: 1,
  preset: 1,
  numeric: false,
  stepLength: 0.1,
  logView: false,
  invert: false,
  logRange: 4,
  spectral: false,
  lowWeight: 0.6,
  exposure: 10000,
};
export const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const multiply = (a: Point, s: number): Point => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export function rotateY(p: Point, angle: number): Point {
  const c = Math.cos(angle),
    s = Math.sin(angle);
  return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]];
}
export function wrapAngle(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}
export function validate(s: Settings) {
  if (
    !Number.isFinite(s.angle) ||
    Math.abs(s.angle) > Math.PI ||
    !Number.isFinite(s.strength) ||
    s.strength < 0 ||
    s.strength > 3 ||
    !Number.isInteger(s.preset) ||
    s.preset < 0 ||
    s.preset > 2
  )
    throw new RangeError("Invalid angle/strength/preset");
  if (
    !Number.isFinite(s.stepLength) ||
    s.stepLength < 0.05 ||
    s.stepLength > 0.5 ||
    !Number.isFinite(s.logRange) ||
    s.logRange < 0.5 ||
    s.logRange > 12
  )
    throw new RangeError("Invalid quality/display");
  if (
    !Number.isFinite(s.lowWeight) ||
    s.lowWeight < 0 ||
    s.lowWeight > 1 ||
    !Number.isFinite(s.exposure) ||
    s.exposure < 1000 ||
    s.exposure > 50000
  )
    throw new RangeError("Invalid spectrum/exposure");
}
export function validateBeam(b: Beam) {
  if (
    !Number.isFinite(b.maximum) ||
    b.maximum <= 0 ||
    b.maximum > 20 ||
    Math.abs(dot(b.direction, b.direction) - 1) > 1e-6 ||
    ![...b.origin, ...b.direction].every(Number.isFinite)
  )
    throw new RangeError("Finite unit beam, length<=20 required");
}
export function detectorRay(u: number, v: number): Beam {
  if (!Number.isFinite(u) || !Number.isFinite(v) || u < 0 || u > 1 || v < 0 || v > 1)
    throw new RangeError("Detector coordinate outside [0,1]");
  const delta: Point = [(u - 0.5) * 6, (0.5 - v) * 4.5, 12],
    distance = Math.sqrt(dot(delta, delta));
  return { origin: [0, 0, -6], direction: multiply(delta, 1 / distance), maximum: distance };
}
export const objectBeam = (b: Beam, a: number): Beam => ({
  origin: rotateY(b.origin, -a),
  direction: rotateY(b.direction, -a),
  maximum: b.maximum,
});
export const at = (b: Beam, t: number) => add(b.origin, multiply(b.direction, t));
export function boxInterval(b: Beam, minimum: Point, maximum: Point) {
  validateBeam(b);
  for (let a = 0; a < 3; a++)
    if (!Number.isFinite(minimum[a]) || !Number.isFinite(maximum[a]) || minimum[a] >= maximum[a])
      throw new RangeError("Invalid box");
  let entry = 0,
    exit = b.maximum;
  for (let a = 0; a < 3; a++) {
    if (b.direction[a] === 0) {
      if (b.origin[a] < minimum[a] || b.origin[a] > maximum[a]) return null;
      continue;
    }
    let near = (minimum[a] - b.origin[a]) / b.direction[a],
      far = (maximum[a] - b.origin[a]) / b.direction[a];
    if (near > far) [near, far] = [far, near];
    entry = Math.max(entry, near);
    exit = Math.min(exit, far);
    if (entry >= exit) return null;
  }
  return { entry, exit };
}
export function makeScene(preset: number, stage = 8): Material[] {
  const slab: Material = {
    minimum: [-1.2, -1.05, -0.55],
    maximum: [1.2, 1.05, 0.55],
    muLow: 0.55,
    muHigh: 0.18,
  };
  if (stage >= 4 && preset === 1)
    return [
      { minimum: [-1.2, -1.05, -1.1], maximum: [1.2, 1.05, -0.25], muLow: 0.35, muHigh: 0.12 },
      { minimum: [-1.2, -1.05, 0.25], maximum: [1.2, 1.05, 1.1], muLow: 0.9, muHigh: 0.32 },
      { minimum: [0.25, -0.45, 1.35], maximum: [0.7, 0.1, 1.85], muLow: 1.8, muHigh: 0.65 },
    ];
  if (stage >= 4 && preset === 2)
    return [
      slab,
      { minimum: [-0.6, -0.5, -0.8], maximum: [0.6, 0.5, 0.8], muLow: 1.1, muHigh: 0.4 },
    ];
  return [slab];
}
export function validateScene(scene: Material[]) {
  if (scene.length < 1 || scene.length > 8) throw new RangeError("1..8 boxes required");
  for (const m of scene) {
    for (let a = 0; a < 3; a++)
      if (
        !Number.isFinite(m.minimum[a]) ||
        !Number.isFinite(m.maximum[a]) ||
        m.minimum[a] >= m.maximum[a]
      )
        throw new RangeError("Invalid bounds");
    for (const mu of [m.muLow, m.muHigh])
      if (!Number.isFinite(mu) || mu < 0 || mu > 4) throw new RangeError("Invalid mu");
  }
}
export function materialLength(b: Beam, m: Material) {
  const interval = boxInterval(b, m.minimum, m.maximum);
  return interval ? interval.exit - interval.entry : 0;
}
export const contains = (m: Material, p: Point) =>
  p.every((v, a) => v >= m.minimum[a] && v <= m.maximum[a]);
