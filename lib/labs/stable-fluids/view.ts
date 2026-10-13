import { type Vec2 } from "./grid.ts";
export function viewport(width: number, height: number) {
  const scale = Math.max(1, Math.min(width - 32, height - 32));
  return { x: (width - scale) / 2, y: (height - scale) / 2, scale };
}
export function toScreen(width: number, height: number, p: Vec2): Vec2 {
  const view = viewport(width, height);
  return { x: view.x + p.x * view.scale, y: view.y + (1 - p.y) * view.scale };
}
export function fromScreen(width: number, height: number, p: Vec2): Vec2 | null {
  const view = viewport(width, height),
    result = { x: (p.x - view.x) / view.scale, y: 1 - (p.y - view.y) / view.scale };
  if (
    !Number.isFinite(result.x) ||
    !Number.isFinite(result.y) ||
    result.x < -1e-10 ||
    result.x > 1 + 1e-10 ||
    result.y < -1e-10 ||
    result.y > 1 + 1e-10
  )
    return null;
  return { x: Math.max(0, Math.min(1, result.x)), y: Math.max(0, Math.min(1, result.y)) };
}
export function signedColor(value: number, range: number) {
  if (!Number.isFinite(value)) return [255, 0, 255];
  const t = Math.min(1, Math.abs(value) / range);
  if (value >= 0) return [Math.round(30 + 210 * t), Math.round(40 + 60 * t), 55];
  return [30, Math.round(40 + 95 * t), Math.round(55 + 190 * t)];
}
