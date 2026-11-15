import { fixedDt, type Grid, type Vec2 } from "./model.ts";
import { sample, velocityAt, enforceWalls } from "./field.ts";
export function backtrace(grid: Grid, point: Vec2, dt: number, stage = 15): Vec2 {
  const first = stage === 3 ? { x: 0.18, y: 0 } : velocityAt(grid, point);
  const middle = { x: point.x - 0.5 * dt * first.x, y: point.y - 0.5 * dt * first.y };
  const flow = stage === 3 ? first : velocityAt(grid, middle);
  return { x: point.x - dt * flow.x, y: point.y - dt * flow.y };
}
export function advectSmoke(grid: Grid, dt = fixedDt, stage = 15) {
  if (!Number.isFinite(dt) || dt <= 0 || dt > 0.1) throw new RangeError("Advection dt in (0,0.1]");
  for (let y = 0; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++) {
      const i = y * grid.n + x,
        origin = backtrace(grid, { x: (x + 0.5) * grid.h, y: (y + 0.5) * grid.h }, dt, stage);
      grid.densityNext[i] = sample(grid, grid.density, grid.n, grid.n, { x: 0.5, y: 0.5 }, origin);
      if (stage >= 8)
        for (let c = 0; c < 3; c++)
          grid.pigmentNext[c][i] = sample(
            grid,
            grid.pigment[c],
            grid.n,
            grid.n,
            { x: 0.5, y: 0.5 },
            origin,
          );
    }
  [grid.density, grid.densityNext] = [grid.densityNext, grid.density];
  if (stage >= 8)
    for (let c = 0; c < 3; c++)
      [grid.pigment[c], grid.pigmentNext[c]] = [grid.pigmentNext[c], grid.pigment[c]];
}
export function advectVelocity(grid: Grid) {
  for (let y = 0; y < grid.n; y++)
    for (let x = 0; x <= grid.n; x++) {
      const p = { x: x * grid.h, y: (y + 0.5) * grid.h };
      grid.uNext[y * (grid.n + 1) + x] = sample(
        grid,
        grid.u,
        grid.n + 1,
        grid.n,
        { x: 0, y: 0.5 },
        backtrace(grid, p, fixedDt),
      );
    }
  for (let y = 0; y <= grid.n; y++)
    for (let x = 0; x < grid.n; x++) {
      const p = { x: (x + 0.5) * grid.h, y: y * grid.h };
      grid.vNext[y * grid.n + x] = sample(
        grid,
        grid.v,
        grid.n,
        grid.n + 1,
        { x: 0.5, y: 0 },
        backtrace(grid, p, fixedDt),
      );
    }
  [grid.u, grid.uNext] = [grid.uNext, grid.u];
  [grid.v, grid.vNext] = [grid.vNext, grid.v];
  enforceWalls(grid);
}
function advectField(grid: Grid, input: Float64Array, output: Float64Array, origins: Float64Array) {
  for (let i = 0; i < input.length; i++)
    output[i] = sample(
      grid,
      input,
      grid.n,
      grid.n,
      { x: 0.5, y: 0.5 },
      { x: origins[2 * i], y: origins[2 * i + 1] },
    );
}
export function advectDetailed(grid: Grid, input: Float64Array, output: Float64Array) {
  advectField(grid, input, grid.scalarForward, grid.forwardOrigin);
  advectField(grid, grid.scalarForward, grid.scalarBackward, grid.backwardOrigin);
  for (let y = 0; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++) {
      const i = y * grid.n + x,
        gx = grid.forwardOrigin[2 * i] / grid.h - 0.5,
        gy = grid.forwardOrigin[2 * i + 1] / grid.h - 0.5;
      if (gx < 0 || gy < 0 || gx > grid.n - 1 || gy > grid.n - 1) {
        output[i] = grid.scalarForward[i];
        continue;
      }
      const left = Math.min(grid.n - 2, Math.floor(gx)),
        lower = Math.min(grid.n - 2, Math.floor(gy)),
        j = lower * grid.n + left;
      const min = Math.min(input[j], input[j + 1], input[j + grid.n], input[j + grid.n + 1]);
      const max = Math.max(input[j], input[j + 1], input[j + grid.n], input[j + grid.n + 1]);
      output[i] = Math.max(
        min,
        Math.min(max, grid.scalarForward[i] + 0.5 * (input[i] - grid.scalarBackward[i])),
      );
    }
}
export function advectSmokeDetailed(grid: Grid) {
  for (let y = 0; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++) {
      const i = y * grid.n + x,
        p = { x: (x + 0.5) * grid.h, y: (y + 0.5) * grid.h };
      const forward = backtrace(grid, p, fixedDt),
        backward = backtrace(grid, p, -fixedDt);
      grid.forwardOrigin[2 * i] = forward.x;
      grid.forwardOrigin[2 * i + 1] = forward.y;
      grid.backwardOrigin[2 * i] = backward.x;
      grid.backwardOrigin[2 * i + 1] = backward.y;
    }
  advectDetailed(grid, grid.density, grid.densityNext);
  for (let c = 0; c < 3; c++) advectDetailed(grid, grid.pigment[c], grid.pigmentNext[c]);
  [grid.density, grid.densityNext] = [grid.densityNext, grid.density];
  for (let c = 0; c < 3; c++)
    [grid.pigment[c], grid.pigmentNext[c]] = [grid.pigmentNext[c], grid.pigment[c]];
}
