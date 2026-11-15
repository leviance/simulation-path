import { fixedDt, type Grid } from "./model.ts";
import { enforceWalls } from "./field.ts";
export function confineVorticity(grid: Grid, strength: number) {
  if (!Number.isFinite(strength) || strength < 0 || strength > 20)
    throw new RangeError("Confinement in [0,20]");
  if (strength === 0) return;
  const n = grid.n;
  const centerU = (x: number, y: number) =>
    0.5 * (grid.u[y * (n + 1) + x] + grid.u[y * (n + 1) + x + 1]);
  const centerV = (x: number, y: number) => 0.5 * (grid.v[y * n + x] + grid.v[(y + 1) * n + x]);
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const left = Math.max(0, x - 1),
        right = Math.min(n - 1, x + 1),
        lower = Math.max(0, y - 1),
        upper = Math.min(n - 1, y + 1);
      grid.curl[y * n + x] =
        (centerV(right, y) - centerV(left, y)) / ((right - left) * grid.h) -
        (centerU(x, upper) - centerU(x, lower)) / ((upper - lower) * grid.h);
    }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      const i = y * n + x,
        left = Math.max(0, x - 1),
        right = Math.min(n - 1, x + 1),
        lower = Math.max(0, y - 1),
        upper = Math.min(n - 1, y + 1);
      const gx =
          (Math.abs(grid.curl[y * n + right]) - Math.abs(grid.curl[y * n + left])) /
          ((right - left) * grid.h),
        gy =
          (Math.abs(grid.curl[upper * n + x]) - Math.abs(grid.curl[lower * n + x])) /
          ((upper - lower) * grid.h),
        length = Math.hypot(gx, gy);
      grid.forceX[i] = 0;
      grid.forceY[i] = 0;
      if (length > 1e-10) {
        grid.forceX[i] = ((strength * grid.h * gy) / length) * grid.curl[i];
        grid.forceY[i] = ((-strength * grid.h * gx) / length) * grid.curl[i];
      }
    }
  for (let y = 0; y < n; y++)
    for (let x = 1; x < n; x++)
      grid.u[y * (n + 1) + x] +=
        fixedDt * 0.5 * (grid.forceX[y * n + x - 1] + grid.forceX[y * n + x]);
  for (let y = 1; y < n; y++)
    for (let x = 0; x < n; x++)
      grid.v[y * n + x] += fixedDt * 0.5 * (grid.forceY[(y - 1) * n + x] + grid.forceY[y * n + x]);
  enforceWalls(grid);
}
