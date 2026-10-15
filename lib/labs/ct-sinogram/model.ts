export type Point = readonly [number, number];
export interface Disk {
  centre: Point;
  radius: number;
  mu: number;
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
export const defaultSettings: Settings = { preset: 2, views: 120, strength: 1 };
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
    ![30, 60, 120].includes(settings.views) ||
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
  return [
    { centre: [0, 0], radius: 1.1, mu: 0.25 },
    { centre: [0.45, 0.25], radius: 0.32, mu: 0.9 },
    { centre: [-0.5, -0.3], radius: 0.22, mu: 1.4 },
  ];
}
export function validateScene(scene: readonly Disk[]) {
  if (scene.length < 1 || scene.length > 3) throw new RangeError("Use one to three disks");
  for (const disk of scene)
    if (
      ![...disk.centre, disk.radius, disk.mu].every(Number.isFinite) ||
      disk.radius <= 0 ||
      disk.mu < 0 ||
      disk.mu > 2 ||
      length(disk.centre) + disk.radius > 1.5
    )
      throw new RangeError("Disk outside supported field of view");
}
