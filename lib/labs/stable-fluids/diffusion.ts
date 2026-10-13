import { dt, enforceWalls, type FluidGrid } from "./grid.ts";
export function diffuseVelocity(grid: FluidGrid, viscosity: number) {
  if (!Number.isFinite(viscosity) || viscosity < 0 || viscosity > 0.003)
    throw new RangeError("Invalid viscosity");
  if (viscosity === 0) return;
  const sourceU = grid.u.slice(),
    sourceV = grid.v.slice(),
    n = grid.n,
    a = (viscosity * dt) / (grid.h * grid.h);
  for (let iteration = 0; iteration < 12; iteration++) {
    for (let y = 0; y < n; y++)
      for (let x = 0; x <= n; x++) {
        const i = y * (n + 1) + x;
        if (x === 0 || x === n) {
          grid.uNext[i] = 0;
          continue;
        }
        let sum = grid.u[i - 1] + grid.u[i + 1],
          count = 2;
        if (y > 0) {
          sum += grid.u[i - n - 1];
          count++;
        }
        if (y + 1 < n) {
          sum += grid.u[i + n + 1];
          count++;
        }
        grid.uNext[i] = (sourceU[i] + a * sum) / (1 + a * count);
      }
    for (let y = 0; y <= n; y++)
      for (let x = 0; x < n; x++) {
        const i = y * n + x;
        if (y === 0 || y === n) {
          grid.vNext[i] = 0;
          continue;
        }
        let sum = grid.v[i - n] + grid.v[i + n],
          count = 2;
        if (x > 0) {
          sum += grid.v[i - 1];
          count++;
        }
        if (x + 1 < n) {
          sum += grid.v[i + 1];
          count++;
        }
        grid.vNext[i] = (sourceV[i] + a * sum) / (1 + a * count);
      }
    [grid.u, grid.uNext] = [grid.uNext, grid.u];
    [grid.v, grid.vNext] = [grid.vNext, grid.v];
  }
  enforceWalls(grid);
}
