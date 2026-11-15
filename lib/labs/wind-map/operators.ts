import type { WindField } from "./model.ts";
export function derivativeX(field: WindField, values: Float64Array, x: number, y: number) {
  const i = y * field.width + x;
  if (x === 0) return (-3 * values[i] + 4 * values[i + 1] - values[i + 2]) / (2 * field.dx);
  if (x === field.width - 1)
    return (3 * values[i] - 4 * values[i - 1] + values[i - 2]) / (2 * field.dx);
  return (values[i + 1] - values[i - 1]) / (2 * field.dx);
}
export function derivativeY(field: WindField, values: Float64Array, x: number, y: number) {
  const i = y * field.width + x,
    w = field.width;
  if (y === 0) return (-3 * values[i] + 4 * values[i + w] - values[i + 2 * w]) / (2 * field.dy);
  if (y === field.height - 1)
    return (3 * values[i] - 4 * values[i - w] + values[i - 2 * w]) / (2 * field.dy);
  return (values[i + w] - values[i - w]) / (2 * field.dy);
}
export function gradient(field: WindField) {
  for (let y = 0; y < field.height; y++)
    for (let x = 0; x < field.width; x++) {
      const i = y * field.width + x;
      field.vx[i] = derivativeX(field, field.scalar, x, y);
      field.vy[i] = derivativeY(field, field.scalar, x, y);
    }
}
export function divergence(field: WindField, x: number, y: number) {
  return derivativeX(field, field.vx, x, y) + derivativeY(field, field.vy, x, y);
}
export function curl(field: WindField, x: number, y: number) {
  return derivativeX(field, field.vy, x, y) - derivativeY(field, field.vx, x, y);
}
