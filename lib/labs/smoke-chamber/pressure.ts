import { fixedDt, finiteState, type Grid, type Parameters } from "./model.ts";
import { divergence, enforceWalls, removeMean, rms } from "./field.ts";
import { precondition } from "./multigrid.ts";

export function neighbours(grid: Grid, values: Float64Array, x: number, y: number) {
  const i = y * grid.n + x;
  let sum = 0,
    count = 0;
  if (x > 0) {
    sum += values[i - 1];
    count++;
  }
  if (x + 1 < grid.n) {
    sum += values[i + 1];
    count++;
  }
  if (y > 0) {
    sum += values[i - grid.n];
    count++;
  }
  if (y + 1 < grid.n) {
    sum += values[i + grid.n];
    count++;
  }
  return { sum, count };
}
export function preparePressure(grid: Grid, clear: boolean) {
  if (!finiteState(grid)) throw new RangeError("Nonfinite pressure input");
  enforceWalls(grid);
  if (!Number.isFinite(divergence(grid))) throw new RangeError("Divergence norm overflow");
  for (let i = 0; i < grid.rhs.length; i++) grid.rhs[i] = -grid.divergence[i] / fixedDt;
  removeMean(grid.rhs);
  if (!Number.isFinite(rms(grid.rhs))) throw new RangeError("Pressure RHS norm overflow");
  if (clear) grid.pressure.fill(0);
  grid.iterations = 0;
  grid.pressureReady = true;
  grid.projection = null;
}
export function pressureResidual(grid: Grid) {
  let sum = 0;
  for (let y = 0; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++) {
      const i = y * grid.n + x,
        a = neighbours(grid, grid.pressure, x, y);
      const r = (a.count * grid.pressure[i] - a.sum) / (grid.h * grid.h) - grid.rhs[i];
      if (!Number.isFinite(r)) return Infinity;
      sum += r * r;
    }
  return Math.sqrt(sum / grid.pressure.length);
}
export function inspectJacobi(grid: Grid, x: number, y: number) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= grid.n || y >= grid.n)
    throw new RangeError("Invalid cell");
  const i = y * grid.n + x,
    a = neighbours(grid, grid.pressure, x, y);
  const candidate = (a.sum + grid.h * grid.h * grid.rhs[i]) / a.count;
  return {
    oldValue: grid.pressure[i],
    rhs: grid.rhs[i],
    sum: a.sum,
    count: a.count,
    candidate,
    weighted: 0.25 * grid.pressure[i] + 0.75 * candidate,
  };
}
export function jacobiIteration(grid: Grid) {
  if (!grid.pressureReady || grid.iterations >= 160)
    throw new RangeError("Prepare RHS; Jacobi has at most 160 rounds");
  for (let y = 0; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++)
      grid.pressureNext[y * grid.n + x] = inspectJacobi(grid, x, y).weighted;
  removeMean(grid.pressureNext);
  [grid.pressure, grid.pressureNext] = [grid.pressureNext, grid.pressure];
  grid.iterations++;
}
export function solveJacobi(grid: Grid, budget: number) {
  if (!Number.isInteger(budget) || budget < 1 || budget > 160)
    throw new RangeError("Jacobi budget in [1,160]");
  preparePressure(grid, true);
  for (let k = 0; k < budget; k++) jacobiIteration(grid);
}
export function multiplyPressure(grid: Grid, input: Float64Array, output: Float64Array) {
  for (let y = 0; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++) {
      const i = y * grid.n + x,
        a = neighbours(grid, input, x, y);
      output[i] = a.count * input[i] - a.sum;
    }
}
export function dot(a: Float64Array, b: Float64Array) {
  let value = 0;
  for (let i = 0; i < a.length; i++) value += a[i] * b[i];
  return value;
}
export function solveCG(grid: Grid, budget: number, usePreconditioner = false) {
  if (!Number.isInteger(budget) || budget < 1 || budget > 384)
    throw new RangeError("CG budget in [1,384]");
  preparePressure(grid, false);
  const hSquared = grid.h * grid.h,
    target = Math.max(1e-6, 1e-4 * rms(grid.rhs));
  const targetSquared = target * target * hSquared * hSquared * grid.rhs.length;
  multiplyPressure(grid, grid.pressure, grid.matrixDirection);
  for (let i = 0; i < grid.rhs.length; i++)
    grid.direction[i] = grid.residualWork[i] = hSquared * grid.rhs[i] - grid.matrixDirection[i];
  let residualSquared = dot(grid.residualWork, grid.residualWork);
  if (residualSquared <= targetSquared) {
    removeMean(grid.pressure);
    return;
  }
  let residualDotDirection = residualSquared;
  if (usePreconditioner) {
    precondition(grid);
    grid.direction.set(grid.preconditioned);
    residualDotDirection = dot(grid.residualWork, grid.preconditioned);
  }
  for (let k = 0; k < budget && residualSquared > targetSquared; k++) {
    multiplyPressure(grid, grid.direction, grid.matrixDirection);
    const denominator = dot(grid.direction, grid.matrixDirection);
    if (!Number.isFinite(denominator) || denominator <= 0) break;
    const alpha = residualDotDirection / denominator;
    for (let i = 0; i < grid.pressure.length; i++) {
      grid.pressure[i] += alpha * grid.direction[i];
      grid.residualWork[i] -= alpha * grid.matrixDirection[i];
    }
    grid.iterations++;
    const nextSquared = dot(grid.residualWork, grid.residualWork);
    let nextDotDirection = nextSquared;
    if (usePreconditioner) {
      precondition(grid);
      nextDotDirection = dot(grid.residualWork, grid.preconditioned);
    }
    const beta = nextDotDirection / residualDotDirection;
    for (let i = 0; i < grid.direction.length; i++)
      grid.direction[i] =
        (usePreconditioner ? grid.preconditioned[i] : grid.residualWork[i]) +
        beta * grid.direction[i];
    residualSquared = nextSquared;
    residualDotDirection = nextDotDirection;
  }
  removeMean(grid.pressure);
}
export function project(grid: Grid, parameters: Parameters) {
  const maximum = parameters.method === "jacobi" ? 160 : 384;
  if (
    !["jacobi", "cg", "pcg"].includes(parameters.method) ||
    !Number.isInteger(parameters.pressureBudget) ||
    parameters.pressureBudget < 1 ||
    parameters.pressureBudget > maximum ||
    !finiteState(grid)
  )
    throw new RangeError("Invalid projection input");
  enforceWalls(grid);
  const before = divergence(grid);
  if (!Number.isFinite(before)) throw new RangeError("Projection divergence norm overflow");
  if (parameters.method === "jacobi") solveJacobi(grid, parameters.pressureBudget);
  else solveCG(grid, parameters.pressureBudget, parameters.method === "pcg");
  const residual = pressureResidual(grid),
    target = Math.max(1e-6, 1e-4 * rms(grid.rhs));
  for (let y = 0; y < grid.n; y++)
    for (let x = 1; x < grid.n; x++)
      grid.u[y * (grid.n + 1) + x] -=
        (fixedDt * (grid.pressure[y * grid.n + x] - grid.pressure[y * grid.n + x - 1])) / grid.h;
  for (let y = 1; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++)
      grid.v[y * grid.n + x] -=
        (fixedDt * (grid.pressure[y * grid.n + x] - grid.pressure[(y - 1) * grid.n + x])) / grid.h;
  enforceWalls(grid);
  grid.projection = {
    before,
    after: divergence(grid),
    residual,
    target,
    iterations: grid.iterations,
    available: true,
    converged: Number.isFinite(residual) && Number.isFinite(target) && residual <= target,
    method: parameters.method,
    budget: parameters.pressureBudget,
  };
  grid.pressureReady = false;
  return grid.projection;
}
