export type Vec3 = { x: number; y: number; z: number };
export type Particle = { position: Vec3; velocity: Vec3 };
export const restDensity = 1000;
export const maxDt = 0.0005;
export const candidateBudget = 4096;
export function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}
export function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}
export function length(v: Vec3) {
  return Math.hypot(v.x, v.y, v.z);
}
export function finite(v: Vec3) {
  return [v.x, v.y, v.z].every(Number.isFinite);
}
export function makePlan(side = 8) {
  if (!Number.isInteger(side) || side < 4 || side > 100)
    throw new RangeError("Side must be in [4,100]");
  const count = side ** 3,
    spacing = 0.4 / side,
    h = 1.3 * spacing,
    support = 2 * h;
  const cellsAxis = Math.ceil(1 / support),
    cells = cellsAxis ** 3;
  const levels = [];
  let input = cells;
  do {
    const groups = Math.ceil(input / 512);
    levels.push({ input, groups });
    input = groups;
  } while (input > 1);
  const scanBytes = levels.reduce(
    (sum, level, i) => sum + 4 * level.groups + (i > 0 ? 4 * level.input : 0),
    0,
  );
  const reductionBytes = 32 * Math.ceil(count / 256);
  const residentBytes = 100 * count + 12 * cells + scanBytes + reductionBytes;
  return {
    side,
    count,
    spacing,
    h,
    support,
    mass: restDensity * spacing ** 3,
    cellsAxis,
    cells,
    levels,
    residentBytes,
    largestBlock: Math.max(16 * count, 4 * cells),
  };
}
export type Plan = ReturnType<typeof makePlan>;
export function initialPosition(plan: Plan, index: number): Vec3 {
  return {
    x: 0.08 + ((index % plan.side) + 0.5) * plan.spacing,
    y: 0.12 + ((Math.floor(index / plan.side) % plan.side) + 0.5) * plan.spacing,
    z: 0.3 + (Math.floor(index / plan.side ** 2) + 0.5) * plan.spacing,
  };
}
export function makeParticles(plan: Plan) {
  if (plan.count > 512)
    throw new RangeError("Canvas/CPU oracle is capped at 512; GPU workload is separate");
  return Array.from({ length: plan.count }, (_, i) => ({
    position: initialPosition(plan, i),
    velocity: { x: 0, y: 0, z: 0 },
  }));
}
export type Settings = { soundSpeed: number; alpha: number; gravity: number; grid: boolean };
export const defaultSettings: Settings = { soundSpeed: 12, alpha: 0.15, gravity: 9.81, grid: true };
export function validateSettings(settings: Settings) {
  if (
    !Number.isFinite(settings.soundSpeed) ||
    settings.soundSpeed < 8 ||
    settings.soundSpeed > 20 ||
    !Number.isFinite(settings.alpha) ||
    settings.alpha < 0 ||
    settings.alpha > 0.3 ||
    !Number.isFinite(settings.gravity) ||
    settings.gravity < 0 ||
    settings.gravity > 9.81
  )
    throw new RangeError("Invalid SPH settings");
}
