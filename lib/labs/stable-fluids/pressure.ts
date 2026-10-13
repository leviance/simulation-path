import { dt, enforceWalls, type FluidGrid } from "./grid.ts";
export function rms(values: Float64Array) {
  let sum = 0;
  for (const value of values) sum += value * value;
  return Math.sqrt(sum / values.length);
}
export function computeDivergence(grid: FluidGrid) {
  const n = grid.n;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      grid.div[y * n + x] =
        (grid.u[y * (n + 1) + x + 1] -
          grid.u[y * (n + 1) + x] +
          grid.v[(y + 1) * n + x] -
          grid.v[y * n + x]) /
        grid.h;
    }
  return rms(grid.div);
}
function neighbours(grid: FluidGrid, values: Float64Array, x: number, y: number) {
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
export function pressureResidual(grid: FluidGrid) {
  let sum = 0;
  for (let y = 0; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++) {
      const i = y * grid.n + x,
        nearby = neighbours(grid, grid.pressure, x, y);
      const residual =
        (nearby.count * grid.pressure[i] - nearby.sum) / (grid.h * grid.h) - grid.rhs[i];
      sum += residual * residual;
    }
  return Math.sqrt(sum / grid.pressure.length);
}
export function beginPressure(grid: FluidGrid) {
  enforceWalls(grid);
  computeDivergence(grid);
  grid.pressure.fill(0);
  let mean = 0;
  for (let i = 0; i < grid.rhs.length; i++) {
    grid.rhs[i] = -grid.div[i] / dt;
    mean += grid.rhs[i];
  }
  mean /= grid.rhs.length;
  for (let i = 0; i < grid.rhs.length; i++) grid.rhs[i] -= mean;
  grid.pressureReady = true;
  grid.pressureIterations = 0;
  grid.projection = null;
}
export function inspectJacobiCell(grid: FluidGrid, x: number, y: number) {
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= grid.n || y >= grid.n)
    throw new RangeError("Invalid pressure cell");
  const i = y * grid.n + x,
    nearby = neighbours(grid, grid.pressure, x, y);
  const candidate = (nearby.sum + grid.h * grid.h * grid.rhs[i]) / nearby.count;
  return {
    x,
    y,
    rhs: grid.rhs[i],
    previous: grid.pressure[i],
    sum: nearby.sum,
    count: nearby.count,
    candidate,
    weighted: 0.25 * grid.pressure[i] + 0.75 * candidate,
  };
}
export type JacobiTrace = ReturnType<typeof inspectJacobiCell> & {
  gauge: number;
  result: number;
  iteration: number;
};
export function jacobiIteration(grid: FluidGrid, selectedX = 0, selectedY = 0): JacobiTrace {
  if (!grid.pressureReady || grid.pressureIterations >= 160)
    throw new RangeError("Begin pressure before stepping; budget is 160 iterations");
  const trace = inspectJacobiCell(grid, selectedX, selectedY);
  let gauge = 0;
  for (let y = 0; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++) {
      const i = y * grid.n + x,
        nearby = neighbours(grid, grid.pressure, x, y);
      const candidate = (nearby.sum + grid.h * grid.h * grid.rhs[i]) / nearby.count;
      grid.pressureNext[i] = 0.25 * grid.pressure[i] + 0.75 * candidate;
      gauge += grid.pressureNext[i];
    }
  gauge /= grid.pressure.length;
  for (let i = 0; i < grid.pressure.length; i++) grid.pressureNext[i] -= gauge;
  [grid.pressure, grid.pressureNext] = [grid.pressureNext, grid.pressure];
  grid.pressureIterations++;
  return {
    ...trace,
    gauge,
    result: grid.pressure[selectedY * grid.n + selectedX],
    iteration: grid.pressureIterations,
  };
}
export function solvePressure(grid: FluidGrid, iterations = 80) {
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 160)
    throw new RangeError("Pressure iterations must be in [1, 160]");
  beginPressure(grid);
  for (let iteration = 0; iteration < iterations; iteration++) jacobiIteration(grid);
  return pressureResidual(grid);
}
export function project(grid: FluidGrid, iterations = 80) {
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 160)
    throw new RangeError("Invalid projection budget");
  enforceWalls(grid);
  const before = computeDivergence(grid),
    residual = solvePressure(grid, iterations),
    n = grid.n;
  for (let y = 0; y < n; y++)
    for (let x = 1; x < n; x++)
      grid.u[y * (n + 1) + x] -=
        (dt * (grid.pressure[y * n + x] - grid.pressure[y * n + x - 1])) / grid.h;
  for (let y = 1; y < n; y++)
    for (let x = 0; x < n; x++)
      grid.v[y * n + x] -=
        (dt * (grid.pressure[y * n + x] - grid.pressure[(y - 1) * n + x])) / grid.h;
  enforceWalls(grid);
  const after = computeDivergence(grid);
  grid.projection = { before, after, residual, iterations };
  grid.pressureReady = false;
  return grid.projection;
}
