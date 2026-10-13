import { dt, enforceWalls, type FluidGrid, type Vec2 } from "./grid.ts";
export function sample(
  grid: FluidGrid,
  values: Float64Array,
  width: number,
  height: number,
  offset: Vec2,
  p: Vec2,
) {
  const gx = Math.max(0, Math.min(width - 1, p.x * grid.n - offset.x));
  const gy = Math.max(0, Math.min(height - 1, p.y * grid.n - offset.y));
  const x = Math.min(width - 2, Math.floor(gx)),
    y = Math.min(height - 2, Math.floor(gy));
  const tx = gx - x,
    ty = gy - y,
    i = y * width + x;
  const bottom = (1 - tx) * values[i] + tx * values[i + 1];
  const top = (1 - tx) * values[i + width] + tx * values[i + width + 1];
  return (1 - ty) * bottom + ty * top;
}
export function velocity(grid: FluidGrid, p: Vec2): Vec2 {
  return {
    x: sample(grid, grid.u, grid.n + 1, grid.n, { x: 0, y: 0.5 }, p),
    y: sample(grid, grid.v, grid.n, grid.n + 1, { x: 0.5, y: 0 }, p),
  };
}
export function advectDensity(grid: FluidGrid, prescribed = false) {
  const n = grid.n;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const p = { x: (x + 0.5) * grid.h, y: (y + 0.5) * grid.h };
      const flow = prescribed ? { x: 0.2, y: 0 } : velocity(grid, p);
      const from = { x: p.x - dt * flow.x, y: p.y - dt * flow.y };
      grid.densityNext[y * n + x] = sample(grid, grid.density, n, n, { x: 0.5, y: 0.5 }, from);
    }
  [grid.density, grid.densityNext] = [grid.densityNext, grid.density];
}
export function advectVelocity(grid: FluidGrid) {
  const n = grid.n;
  for (let y = 0; y < n; y++)
    for (let x = 0; x <= n; x++) {
      const p = { x: x * grid.h, y: (y + 0.5) * grid.h },
        flow = velocity(grid, p);
      grid.uNext[y * (n + 1) + x] = sample(
        grid,
        grid.u,
        n + 1,
        n,
        { x: 0, y: 0.5 },
        { x: p.x - dt * flow.x, y: p.y - dt * flow.y },
      );
    }
  for (let y = 0; y <= n; y++)
    for (let x = 0; x < n; x++) {
      const p = { x: (x + 0.5) * grid.h, y: y * grid.h },
        flow = velocity(grid, p);
      grid.vNext[y * n + x] = sample(
        grid,
        grid.v,
        n,
        n + 1,
        { x: 0.5, y: 0 },
        { x: p.x - dt * flow.x, y: p.y - dt * flow.y },
      );
    }
  [grid.u, grid.uNext] = [grid.uNext, grid.u];
  [grid.v, grid.vNext] = [grid.vNext, grid.v];
  enforceWalls(grid);
}
