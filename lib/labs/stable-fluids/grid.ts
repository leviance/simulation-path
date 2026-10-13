export type Vec2 = { x: number; y: number };
export type Preset = "plume" | "compressing" | "vortex" | "empty" | "dipole";
export type Layer = "smoke" | "pressure" | "divergence";
export const dt = 1 / 60;
export interface ProjectionReport {
  before: number;
  after: number;
  residual: number;
  iterations: number;
}
export interface FluidGrid {
  n: number;
  h: number;
  density: Float64Array;
  densityNext: Float64Array;
  u: Float64Array;
  uNext: Float64Array;
  v: Float64Array;
  vNext: Float64Array;
  pressure: Float64Array;
  pressureNext: Float64Array;
  rhs: Float64Array;
  div: Float64Array;
  tick: number;
  projection: ProjectionReport | null;
  pressureReady: boolean;
  pressureIterations: number;
}
export function initialPreset(stage: number): Preset {
  if (stage >= 4 && stage <= 6) return "compressing";
  if (stage === 7 || stage === 8) return "vortex";
  return "plume";
}
export function inside(p: Vec2) {
  return (
    Number.isFinite(p.x) && Number.isFinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1
  );
}
export function makeGrid(n = 24, preset: Preset = "plume", stage = 11): FluidGrid {
  if (!Number.isInteger(n) || n < 8 || n > 32)
    throw new RangeError("Fluid resolution must be an integer in [8, 32]");
  const grid: FluidGrid = {
    n,
    h: 1 / n,
    density: new Float64Array(n * n),
    densityNext: new Float64Array(n * n),
    u: new Float64Array((n + 1) * n),
    uNext: new Float64Array((n + 1) * n),
    v: new Float64Array(n * (n + 1)),
    vNext: new Float64Array(n * (n + 1)),
    pressure: new Float64Array(n * n),
    pressureNext: new Float64Array(n * n),
    rhs: new Float64Array(n * n),
    div: new Float64Array(n * n),
    tick: 0,
    projection: null,
    pressureReady: false,
    pressureIterations: 0,
  };
  if (preset !== "empty" && preset !== "dipole")
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const px = (x + 0.5) * grid.h - 0.5,
          py = (y + 0.5) * grid.h - (preset === "plume" ? 0.2 : 0.5);
        grid.density[y * n + x] = Math.exp(-(px * px + py * py) / 0.008);
      }
  if (stage >= 4 && preset === "compressing") {
    for (let y = 0; y < n; y++)
      for (let x = 0; x <= n; x++)
        grid.u[y * (n + 1) + x] = 0.3 * Math.sin(2 * Math.PI * x * grid.h);
    for (let y = 0; y <= n; y++)
      for (let x = 0; x < n; x++) grid.v[y * n + x] = 0.3 * Math.sin(2 * Math.PI * y * grid.h);
  }
  if (stage >= 4 && preset === "vortex") {
    const psi = (x: number, y: number) =>
      0.05 * Math.sin(Math.PI * x * grid.h) ** 2 * Math.sin(Math.PI * y * grid.h) ** 2;
    for (let y = 0; y < n; y++)
      for (let x = 0; x <= n; x++) grid.u[y * (n + 1) + x] = (psi(x, y + 1) - psi(x, y)) / grid.h;
    for (let y = 0; y <= n; y++)
      for (let x = 0; x < n; x++) grid.v[y * n + x] = -(psi(x + 1, y) - psi(x, y)) / grid.h;
  }
  if (stage >= 5 && preset === "dipole") {
    // One shared face produces b=+64 and b=-64 in its two adjacent cells.
    const x = Math.floor(n / 2),
      y = Math.floor(n / 2) - 1;
    grid.u[y * (n + 1) + x] = -grid.h * dt * 64;
  }
  enforceWalls(grid);
  return grid;
}
export function enforceWalls(grid: FluidGrid) {
  const n = grid.n;
  for (let y = 0; y < n; y++) {
    grid.u[y * (n + 1)] = 0;
    grid.u[y * (n + 1) + n] = 0;
  }
  for (let x = 0; x < n; x++) {
    grid.v[x] = 0;
    grid.v[n * n + x] = 0;
  }
}
export function paintDisk(grid: FluidGrid, p: Vec2, radius = 2, value = 1) {
  if (
    !inside(p) ||
    !Number.isInteger(radius) ||
    radius < 1 ||
    radius > 6 ||
    (value !== 0 && value !== 1)
  )
    return;
  for (let y = 0; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++) {
      const dx = x + 0.5 - p.x * grid.n,
        dy = y + 0.5 - p.y * grid.n;
      if (dx * dx + dy * dy <= radius * radius) grid.density[y * grid.n + x] = value;
    }
}
export function paintStroke(grid: FluidGrid, from: Vec2, to: Vec2, radius: number, value: number) {
  if (!inside(from) || !inside(to)) return;
  const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) * grid.n * 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    paintDisk(
      grid,
      { x: from.x + t * (to.x - from.x), y: from.y + t * (to.y - from.y) },
      radius,
      value,
    );
  }
}
export function measure(grid: FluidGrid) {
  let minimum = Infinity,
    maximum = -Infinity,
    sum = 0,
    energy = 0,
    maxSpeed = 0;
  for (const value of grid.density) {
    minimum = Math.min(minimum, value);
    maximum = Math.max(maximum, value);
    sum += value;
  }
  for (const value of grid.u) {
    energy += value * value;
    maxSpeed = Math.max(maxSpeed, Math.abs(value));
  }
  for (const value of grid.v) {
    energy += value * value;
    maxSpeed = Math.max(maxSpeed, Math.abs(value));
  }
  return {
    minimum,
    maximum,
    sum,
    energy: (energy * grid.h * grid.h) / 2,
    courant: (dt * maxSpeed) / grid.h,
  };
}
