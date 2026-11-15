import type { Vec2 } from "./model.ts";
export function viewport(width: number, height: number) {
  const scale = Math.max(1, Math.min((width - 32) / 4, (height - 32) / 3));
  return { x: (width - 4 * scale) / 2, y: (height - 3 * scale) / 2, scale };
}
export function toScreen(width: number, height: number, p: Vec2): Vec2 {
  const view = viewport(width, height);
  return { x: view.x + (p.x + 2) * view.scale, y: view.y + (1.5 - p.y) * view.scale };
}
export function fromScreen(width: number, height: number, p: Vec2): Vec2 | null {
  const view = viewport(width, height),
    result = { x: (p.x - view.x) / view.scale - 2, y: 1.5 - (p.y - view.y) / view.scale };
  // Chỉ hấp thụ sai số làm tròn tại đúng cạnh, không kéo input ngoài miền vào mép.
  if (
    !Number.isFinite(result.x) ||
    !Number.isFinite(result.y) ||
    result.x < -2 - 1e-10 ||
    result.x > 2 + 1e-10 ||
    result.y < -1.5 - 1e-10 ||
    result.y > 1.5 + 1e-10
  )
    return null;
  return { x: Math.max(-2, Math.min(2, result.x)), y: Math.max(-1.5, Math.min(1.5, result.y)) };
}
export function scalarColor(value: number, range = 2): number[] {
  if (!Number.isFinite(value)) return [255, 0, 255];
  const t = Math.min(1, Math.abs(value) / range);
  if (value >= 0)
    return [Math.round(21 + 112 * t), Math.round(32 + 37 * t), Math.round(47 - 9 * t)];
  return [Math.round(21 - t), Math.round(32 + 59 * t), Math.round(47 + 99 * t)];
}
