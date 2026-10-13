import { dt, enforceWalls, inside, makeGrid, measure, type FluidGrid, type Vec2 } from "./grid.ts";
import { advectDensity, advectVelocity } from "./transport.ts";
import { computeDivergence, project, solvePressure } from "./pressure.ts";
import { diffuseVelocity } from "./diffusion.ts";
export interface Settings {
  iterations: number;
  viscosity: number;
  buoyancy: number;
}
export const defaultSettings: Settings = { iterations: 160, viscosity: 0.0005, buoyancy: 0.8 };
export function addImpulse(grid: FluidGrid, p: Vec2, delta: Vec2) {
  if (
    !inside(p) ||
    !Number.isFinite(delta.x) ||
    !Number.isFinite(delta.y) ||
    Math.hypot(delta.x, delta.y) > 2
  )
    return;
  const sigma = 2.5 * grid.h,
    n = grid.n;
  const weight = (x: number, y: number) =>
    Math.exp(-((x - p.x) ** 2 + (y - p.y) ** 2) / (sigma * sigma));
  for (let y = 0; y < n; y++)
    for (let x = 1; x < n; x++)
      grid.u[y * (n + 1) + x] += 4 * delta.x * weight(x * grid.h, (y + 0.5) * grid.h);
  for (let y = 1; y < n; y++)
    for (let x = 0; x < n; x++)
      grid.v[y * n + x] += 4 * delta.y * weight((x + 0.5) * grid.h, y * grid.h);
  enforceWalls(grid);
  grid.projection = null;
  grid.pressureReady = false;
}
export function addBuoyancy(grid: FluidGrid, strength: number) {
  for (let y = 1; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++)
      grid.v[y * grid.n + x] +=
        dt * strength * 0.5 * (grid.density[y * grid.n + x] + grid.density[(y - 1) * grid.n + x]);
  enforceWalls(grid);
}
export function step(grid: FluidGrid, settings: Settings = defaultSettings, stage = 11) {
  if (
    !Number.isInteger(settings.iterations) ||
    settings.iterations < 1 ||
    settings.iterations > 160 ||
    !Number.isFinite(settings.viscosity) ||
    settings.viscosity < 0 ||
    settings.viscosity > 0.003 ||
    !Number.isFinite(settings.buoyancy) ||
    settings.buoyancy < 0 ||
    settings.buoyancy > 1.6
  )
    return false;
  if (stage < 3) return false;
  if (stage >= 9) addBuoyancy(grid, settings.buoyancy);
  if (stage >= 8) {
    diffuseVelocity(grid, settings.viscosity);
    project(grid, settings.iterations);
  }
  if (stage >= 7) advectVelocity(grid);
  if (stage >= 6) project(grid, settings.iterations);
  else if (stage === 5) solvePressure(grid, settings.iterations);
  advectDensity(grid, stage === 3);
  if (stage >= 4) computeDivergence(grid);
  grid.tick++;
  return true;
}
export function planSteps(accumulator: number, elapsed: number) {
  if (!Number.isFinite(accumulator) || accumulator < 0 || accumulator >= dt) accumulator = 0;
  if (!Number.isFinite(elapsed) || elapsed < 0) elapsed = 0;
  const accepted = Math.min(elapsed, 0.25),
    total = accumulator + accepted,
    due = Math.floor((total + 1e-10) / dt),
    steps = Math.min(4, due);
  return {
    steps,
    remainder: Math.max(0, total - due * dt),
    dropped: elapsed - accepted + (due - steps) * dt,
  };
}
export function validateFluid() {
  const projected = makeGrid(16, "compressing");
  const report = project(projected, 160);
  const still = makeGrid(8, "empty");
  still.density.fill(0.4);
  step(still, { ...defaultSettings, buoyancy: 0 });
  const constantError = Math.max(...still.density.map((value) => Math.abs(value - 0.4)));
  const viscous = makeGrid(16, "vortex"),
    beforeEnergy = measure(viscous).energy;
  diffuseVelocity(viscous, 0.003);
  const afterEnergy = measure(viscous).energy;
  return {
    report,
    constantError,
    beforeEnergy,
    afterEnergy,
    passed:
      report.after < report.before * 0.08 &&
      Math.abs(report.after - dt * report.residual) < 1e-10 &&
      constantError < 1e-12 &&
      afterEnergy < beforeEnergy,
  };
}
