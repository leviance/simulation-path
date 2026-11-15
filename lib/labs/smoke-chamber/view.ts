import { white, type Grid, type Layer, type Vec2 } from "./model.ts";
import { velocityAt } from "./field.ts";
export function viewport(width: number, height: number) {
  const size = Math.max(1, Math.min(width - 24, height - 24));
  return { x: (width - size) / 2, y: (height - size) / 2, size };
}
export function fromScreen(width: number, height: number, point: Vec2) {
  const view = viewport(width, height),
    p = { x: (point.x - view.x) / view.size, y: 1 - (point.y - view.y) / view.size };
  return p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1 ? p : null;
}
function signedColor(value: number, range: number) {
  if (!Number.isFinite(value)) return [255, 0, 255];
  const a = Math.max(0, Math.min(1, Math.abs(value) / range));
  return value >= 0 ? [18 + 222 * a, 28 + 72 * a, 42] : [18, 28 + 115 * a, 42 + 208 * a];
}
export function cellColor(
  grid: Grid,
  x: number,
  y: number,
  layer: Layer,
  colored: boolean,
  stage = 15,
) {
  const i = y * grid.n + x,
    density = grid.density[i];
  if (!Number.isFinite(density)) return [255, 0, 255];
  if (layer === "pressure") return signedColor(grid.pressure[i], 0.08);
  if (layer === "divergence") return signedColor(grid.divergence[i], 1);
  if (layer === "velocity") {
    const flow = velocityAt(grid, { x: (x + 0.5) * grid.h, y: (y + 0.5) * grid.h });
    return signedColor(-Math.hypot(flow.x, flow.y), 0.6);
  }
  const opacity =
    stage >= 8 ? 1 - Math.exp(-1.8 * Math.max(0, density)) : Math.max(0, Math.min(1, density));
  let ink = [white.r, white.g, white.b];
  if (colored && stage >= 8 && density > 1e-12)
    ink = grid.pigment.map((values) => values[i] / density);
  return [
    Math.round(7 + opacity * (248 * Math.max(0, Math.min(1, ink[0])) - 7)),
    Math.round(12 + opacity * (250 * Math.max(0, Math.min(1, ink[1])) - 12)),
    Math.round(21 + opacity * (255 * Math.max(0, Math.min(1, ink[2])) - 21)),
  ];
}
