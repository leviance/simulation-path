export type Point = readonly [number, number];
export interface Disk {
  centre: Point;
  radius: number;
  mu: number;
  innerRadius?: number;
}
export interface Settings {
  preset: number;
  views: number;
  strength: number;
}
export const detectorCount = 128;
export const sourceRadius = 4;
export const detectorRadius = 4;
export const detectorWidth = 8;
export const supportedViews = [30, 60, 120, 180];
export const defaultSettings: Settings = { preset: 2, views: 180, strength: 1 };
export const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
export const subtract = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1]];
export const multiply = (a: Point, scale: number): Point => [a[0] * scale, a[1] * scale];
export const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1];
export const length = (a: Point) => Math.hypot(...a);

export function validate(settings: Settings) {
  if (
    !Number.isInteger(settings.preset) ||
    settings.preset < 0 ||
    settings.preset > 2 ||
    !supportedViews.includes(settings.views) ||
    !Number.isFinite(settings.strength) ||
    settings.strength < 0 ||
    settings.strength > 2
  )
    throw new RangeError("Invalid CT settings");
}
export function makeScene(preset: number): Disk[] {
  if (preset === 0) return [{ centre: [0, 0], radius: 1, mu: 0.5 }];
  if (preset === 1) return [{ centre: [0.65, 0.3], radius: 0.25, mu: 1.2 }];
  if (preset !== 2) throw new RangeError("Unknown phantom");
  const heart: Point = [-0.17, 0.08];
  return [
    { centre: heart, radius: 1.2, mu: 0.24, innerRadius: 0.34 },
    { centre: heart, radius: 1.24, mu: 0.95, innerRadius: 1.17 },
    { centre: heart, radius: 0.58, mu: 0.21, innerRadius: 0.53 },
    { centre: heart, radius: 0.78, mu: 0.25, innerRadius: 0.72 },
    { centre: heart, radius: 1.0, mu: 0.28, innerRadius: 0.94 },
    { centre: [0.52, -0.33], radius: 0.23, mu: 0.96 },
    { centre: [0.49, -0.3], radius: 0.11, mu: 0.45 },
  ];
}
export function validateScene(scene: readonly Disk[]) {
  if (scene.length < 1 || scene.length > 16) throw new RangeError("Use one to sixteen regions");
  for (const disk of scene)
    if (
      ![...disk.centre, disk.radius, disk.mu, disk.innerRadius ?? 0].every(Number.isFinite) ||
      disk.radius <= 0 ||
      (disk.innerRadius ?? 0) < 0 ||
      (disk.innerRadius ?? 0) >= disk.radius ||
      disk.mu < 0 ||
      disk.mu > 2 ||
      length(disk.centre) + disk.radius > 1.5
    )
      throw new RangeError("Disk outside supported field of view");
}

// Ground truth for reference/assessment only. No reconstruction routine reads the phantom.
export function densityAt(scene: readonly Disk[], point: Point) {
  let density = 0;
  for (const disk of scene) {
    const dx = point[0] - disk.centre[0];
    const dy = point[1] - disk.centre[1];
    const r2 = dx * dx + dy * dy;
    if (r2 >= (disk.innerRadius ?? 0) ** 2 && r2 <= disk.radius ** 2) density += disk.mu;
  }
  return density;
}
