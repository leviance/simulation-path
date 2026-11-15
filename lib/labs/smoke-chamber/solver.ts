import {
  fixedDt,
  finiteState,
  parametersForStage,
  type Grid,
  type Parameters,
  type Scene,
} from "./model.ts";
import { divergence } from "./field.ts";
import { project, solveJacobi } from "./pressure.ts";
import { advectSmoke, advectSmokeDetailed, advectVelocity } from "./transport.ts";
import { addForces, emitSmoke, impulseAt } from "./interaction.ts";
import { diffuseVelocity } from "./viscosity.ts";
import { confineVorticity } from "./vorticity.ts";
import { makeScene } from "./scenes.ts";
export function validParameters(p: Parameters, stage = 15) {
  return (
    [p.viscosity, p.buoyancy, p.confinement].every(Number.isFinite) &&
    p.viscosity >= 0 &&
    p.viscosity <= 0.003 &&
    p.buoyancy >= 0 &&
    p.buoyancy <= 2 &&
    p.confinement >= 0 &&
    p.confinement <= 20 &&
    ["jacobi", "cg", "pcg"].includes(p.method) &&
    (p.method !== "cg" || stage >= 11) &&
    (p.method !== "pcg" || stage >= 14) &&
    Number.isInteger(p.pressureBudget) &&
    p.pressureBudget >= 1 &&
    p.pressureBudget <= (p.method === "jacobi" ? 160 : 384)
  );
}
export function step(grid: Grid, p: Parameters, scene: Scene, stage = 15) {
  if (!validParameters(p, stage) || !finiteState(grid)) return false;
  if (stage >= 8) {
    if (p.emit && scene === "jets") emitSmoke(grid);
    addForces(grid, p, scene);
  }
  if (stage >= 13) confineVorticity(grid, p.confinement);
  if (stage >= 9) {
    diffuseVelocity(grid, p.viscosity);
    project(grid, p);
  }
  if (stage >= 7) advectVelocity(grid);
  if (stage >= 6) project(grid, p);
  else if (stage === 5) solveJacobi(grid, p.pressureBudget);
  if (stage >= 12 && p.highOrder) advectSmokeDetailed(grid);
  else advectSmoke(grid, fixedDt, stage);
  if (stage >= 4) divergence(grid);
  grid.tick++;
  return finiteState(grid);
}
export function planSteps(accumulator: number, elapsed: number) {
  if (!Number.isFinite(accumulator) || accumulator < 0 || accumulator >= fixedDt) accumulator = 0;
  if (!Number.isFinite(elapsed) || elapsed < 0) elapsed = 0;
  const accepted = Math.min(elapsed, 0.25),
    total = accumulator + accepted,
    due = Math.floor((total + 1e-10) / fixedDt);
  const steps = Math.min(4, due);
  return {
    steps,
    remainder: Math.max(0, total - due * fixedDt),
    dropped: elapsed - accepted + (due - steps) * fixedDt,
  };
}
export function diagnose(grid: Grid) {
  let sum = 0,
    min = Infinity,
    max = -Infinity,
    energy = 0,
    speed = 0;
  for (const value of grid.density) {
    sum += value;
    min = Math.min(min, value);
    max = Math.max(max, value);
  }
  for (const values of [grid.u, grid.v])
    for (const value of values) {
      energy += value * value;
      speed = Math.max(speed, Math.abs(value));
    }
  return {
    mass: sum * grid.h * grid.h,
    min,
    max,
    energy: (energy * grid.h * grid.h) / 2,
    courant: (fixedDt * speed) / grid.h,
  };
}
// Independent fixtures, never a second step applied to the scene being observed.
export function validate() {
  const small = makeScene(16, "compression");
  const p = parametersForStage(6);
  const a = project(small, p);
  const large = makeScene(128, "empty");
  impulseAt(large, { x: 0.37, y: 0.42 }, { x: 0.12, y: 0.07 });
  impulseAt(large, { x: 0.65, y: 0.61 }, { x: -0.08, y: 0.11 });
  const b = project(large, parametersForStage());
  const scalar = makeScene(16, "vortex");
  scalar.density.fill(0.4);
  advectSmoke(scalar);
  let error = 0;
  for (const value of scalar.density) error = Math.max(error, Math.abs(value - 0.4));
  return {
    pass:
      a.after < 0.08 * a.before &&
      b.converged &&
      b.after < 0.001 * b.before &&
      Math.abs(b.after - fixedDt * b.residual) < 1e-9 &&
      error < 1e-12,
    small: a,
    large: b,
    constantError: error,
  };
}
