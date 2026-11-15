import type { Grid, Vec2 } from "./model.ts";
export function rms(values: Float64Array) {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) return Infinity;
    sum += values[i] * values[i];
  }
  return Math.sqrt(sum / values.length);
}
export function removeMean(values: Float64Array) {
  let mean = 0;
  for (let i = 0; i < values.length; i++) mean += values[i];
  mean /= values.length;
  for (let i = 0; i < values.length; i++) values[i] -= mean;
}
export function sample(
  grid: Grid,
  values: Float64Array,
  width: number,
  height: number,
  offset: Vec2,
  point: Vec2,
) {
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y))
    throw new RangeError("Nonfinite sample point");
  const gx = Math.max(0, Math.min(width - 1, point.x / grid.h - offset.x));
  const gy = Math.max(0, Math.min(height - 1, point.y / grid.h - offset.y));
  const x = Math.min(width - 2, Math.floor(gx));
  const y = Math.min(height - 2, Math.floor(gy));
  const tx = gx - x;
  const ty = gy - y;
  const i = y * width + x;
  const lower = (1 - tx) * values[i] + tx * values[i + 1];
  const upper = (1 - tx) * values[i + width] + tx * values[i + width + 1];
  return (1 - ty) * lower + ty * upper;
}
export function velocityAt(grid: Grid, point: Vec2): Vec2 {
  return {
    x: sample(grid, grid.u, grid.n + 1, grid.n, { x: 0, y: 0.5 }, point),
    y: sample(grid, grid.v, grid.n, grid.n + 1, { x: 0.5, y: 0 }, point),
  };
}
export function enforceWalls(grid: Grid) {
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
export function divergence(grid: Grid) {
  const n = grid.n;
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const faceU = y * (n + 1) + x;
      const faceV = y * n + x;
      grid.divergence[y * n + x] =
        (grid.u[faceU + 1] - grid.u[faceU] + grid.v[faceV + n] - grid.v[faceV]) / grid.h;
    }
  return rms(grid.divergence);
}
