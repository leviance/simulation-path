import {
  fixedDt,
  inside,
  cyan,
  amber,
  type Grid,
  type Vec2,
  type Ink,
  type Parameters,
  type Scene,
} from "./model.ts";
import { enforceWalls, divergence } from "./field.ts";
export function paintDisk(
  grid: Grid,
  point: Vec2,
  radius: number,
  erase: boolean,
  ink: Ink = cyan,
) {
  if (
    !inside(point) ||
    !Number.isInteger(radius) ||
    radius < 1 ||
    radius > 16 ||
    ![ink.r, ink.g, ink.b].every((v) => Number.isFinite(v) && v >= 0 && v <= 1)
  )
    return;
  const minX = Math.max(0, Math.floor(point.x / grid.h - radius)),
    maxX = Math.min(grid.n - 1, Math.ceil(point.x / grid.h + radius));
  const minY = Math.max(0, Math.floor(point.y / grid.h - radius)),
    maxY = Math.min(grid.n - 1, Math.ceil(point.y / grid.h + radius));
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      const dx = x + 0.5 - point.x / grid.h,
        dy = y + 0.5 - point.y / grid.h;
      if (dx * dx + dy * dy > radius * radius) continue;
      const i = y * grid.n + x;
      grid.density[i] = erase ? 0 : 1;
      grid.pigment[0][i] = grid.density[i] * ink.r;
      grid.pigment[1][i] = grid.density[i] * ink.g;
      grid.pigment[2][i] = grid.density[i] * ink.b;
    }
}
export function paintStroke(
  grid: Grid,
  from: Vec2,
  to: Vec2,
  radius: number,
  erase: boolean,
  ink: Ink = cyan,
) {
  if (!inside(from) || !inside(to)) return;
  const count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (0.5 * grid.h)));
  for (let i = 0; i <= count; i++) {
    const t = i / count;
    paintDisk(
      grid,
      { x: from.x + t * (to.x - from.x), y: from.y + t * (to.y - from.y) },
      radius,
      erase,
      ink,
    );
  }
}
export function impulseAt(grid: Grid, point: Vec2, displacement: Vec2) {
  if (!inside(point) || !Number.isFinite(displacement.x) || !Number.isFinite(displacement.y))
    return;
  const length = Math.hypot(displacement.x, displacement.y);
  if (length === 0 || length > 2) return;
  const sigma = Math.max(0.05, 2 * grid.h),
    tail = Math.exp(-9);
  const weight = (x: number, y: number) => {
    const d = ((x - point.x) ** 2 + (y - point.y) ** 2) / (sigma * sigma);
    return d >= 9 ? 0 : (Math.exp(-d) - tail) / (1 - tail);
  };
  for (let y = 0; y < grid.n; y++)
    for (let x = 1; x < grid.n; x++)
      grid.u[y * (grid.n + 1) + x] += 6 * displacement.x * weight(x * grid.h, (y + 0.5) * grid.h);
  for (let y = 1; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++)
      grid.v[y * grid.n + x] += 6 * displacement.y * weight((x + 0.5) * grid.h, y * grid.h);
  enforceWalls(grid);
  divergence(grid);
  grid.projection = null;
  grid.pressureReady = false;
}
export function stirStroke(grid: Grid, from: Vec2, to: Vec2) {
  if (!inside(from) || !inside(to)) return;
  const sigma = Math.max(0.05, 2 * grid.h),
    count = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / (0.5 * sigma)));
  const increment = { x: (to.x - from.x) / count, y: (to.y - from.y) / count };
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    impulseAt(
      grid,
      { x: from.x + t * (to.x - from.x), y: from.y + t * (to.y - from.y) },
      increment,
    );
  }
}
function nozzle(x: number, y: number, centerX: number) {
  return Math.exp(-((x - centerX) ** 2 / 0.00065 + (y - 0.09) ** 2 / 0.0018));
}
export function emitSmoke(grid: Grid) {
  for (let y = 0; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++) {
      const i = y * grid.n + x,
        px = (x + 0.5) * grid.h,
        py = (y + 0.5) * grid.h;
      const left = fixedDt * 4 * nozzle(px, py, 0.34),
        right = fixedDt * 3.4 * nozzle(px, py, 0.66);
      grid.density[i] += left + right;
      grid.pigment[0][i] += left * cyan.r + right * amber.r;
      grid.pigment[1][i] += left * cyan.g + right * amber.g;
      grid.pigment[2][i] += left * cyan.b + right * amber.b;
    }
}
export function addForces(grid: Grid, parameters: Parameters, scene: Scene) {
  for (let y = 1; y < grid.n; y++)
    for (let x = 0; x < grid.n; x++) {
      const concentration =
        0.5 * (grid.density[y * grid.n + x] + grid.density[(y - 1) * grid.n + x]);
      let acceleration = parameters.buoyancy * concentration;
      if (parameters.emit && scene === "jets")
        acceleration +=
          2.2 * nozzle((x + 0.5) * grid.h, y * grid.h, 0.34) +
          1.8 * nozzle((x + 0.5) * grid.h, y * grid.h, 0.66);
      grid.v[y * grid.n + x] += fixedDt * acceleration;
    }
  if (parameters.emit && scene === "jets")
    for (let y = 0; y < grid.n; y++)
      for (let x = 1; x < grid.n; x++)
        grid.u[y * (grid.n + 1) + x] +=
          fixedDt *
          (0.45 * nozzle(x * grid.h, (y + 0.5) * grid.h, 0.34) -
            0.35 * nozzle(x * grid.h, (y + 0.5) * grid.h, 0.66));
  enforceWalls(grid);
}
