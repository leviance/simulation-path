export type Vec2 = { x: number; y: number };
export type Preset = "uniform" | "source" | "sink" | "rotation" | "shear" | "gradient";
export type Potential = "bowl" | "hill";
export type Layer = "arrows" | "potential" | "gradient" | "divergence" | "curl";
export interface Scene {
  preset: Preset;
  potential: Potential;
  vortex: boolean;
  center: Vec2;
  strength: number;
}
export interface WindField {
  width: number;
  height: number;
  dx: number;
  dy: number;
  scalar: Float64Array;
  vx: Float64Array;
  vy: Float64Array;
}
export const presets: Preset[] = ["uniform", "source", "sink", "rotation", "shear", "gradient"];
export const dt = 1 / 60;
export function initialScene(stage = 9): Scene {
  let preset: Preset = "uniform";
  if (stage === 2 || stage === 4) preset = "source";
  if (stage === 3 || stage === 6) preset = "gradient";
  if (stage === 5 || stage >= 7) preset = "rotation";
  return {
    preset,
    potential: stage === 6 ? "hill" : "bowl",
    vortex: false,
    center: { x: 0, y: 0 },
    strength: 2,
  };
}
export function makeField(width = 33, height = 25): WindField {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 3 ||
    height < 3 ||
    width > 129 ||
    height > 129
  )
    throw new RangeError("Wind grid dimensions must be integers in [3, 129]");
  return {
    width,
    height,
    dx: 4 / (width - 1),
    dy: 3 / (height - 1),
    scalar: new Float64Array(width * height),
    vx: new Float64Array(width * height),
    vy: new Float64Array(width * height),
  };
}
export function world(field: WindField, x: number, y: number): Vec2 {
  return { x: -2 + x * field.dx, y: -1.5 + y * field.dy };
}
export function inside(p: Vec2) {
  return (
    Number.isFinite(p.x) &&
    Number.isFinite(p.y) &&
    p.x >= -2 &&
    p.x <= 2 &&
    p.y >= -1.5 &&
    p.y <= 1.5
  );
}
export function potentialAt(p: Vec2, potential: Potential) {
  const r2 = p.x * p.x + p.y * p.y;
  if (potential === "hill") return Math.exp(-r2);
  return 0.5 * r2;
}
export function exactGradient(p: Vec2, potential: Potential): Vec2 {
  if (potential === "hill") {
    const value = Math.exp(-p.x * p.x - p.y * p.y);
    return { x: -2 * p.x * value, y: -2 * p.y * value };
  }
  return { ...p };
}
