import type { PointerEvent as ReactPointerEvent } from "react";
import type { Point, ViewportSize } from "@/lib/labs/geometry";
import { drawLine } from "./lab-shared";

export interface RasterGridMetrics {
  cell: number;
  ox: number;
  oy: number;
}

export function rasterGridMetrics(
  size: ViewportSize,
  columns: number,
  rows: number,
): RasterGridMetrics {
  const cell = Math.max(1, Math.min((size.width - 32) / columns, (size.height - 64) / rows));
  return {
    cell,
    ox: (size.width - columns * cell) / 2,
    oy: 40 + (size.height - 48 - rows * cell) / 2,
  };
}

export function drawRasterGrid(
  ctx: CanvasRenderingContext2D,
  metrics: RasterGridMetrics,
  columns: number,
  rows: number,
) {
  const { cell, ox, oy } = metrics;
  for (let x = 0; x <= columns; x++)
    drawLine(
      ctx,
      { x: ox + x * cell, y: oy },
      { x: ox + x * cell, y: oy + rows * cell },
      "#26314c",
    );
  for (let y = 0; y <= rows; y++)
    drawLine(
      ctx,
      { x: ox, y: oy + y * cell },
      { x: ox + columns * cell, y: oy + y * cell },
      "#26314c",
    );
}

export function rasterPointFromEvent(
  event: ReactPointerEvent<HTMLCanvasElement>,
  metrics: RasterGridMetrics,
  bounds: { minX?: number; maxX: number; minY?: number; maxY: number },
  size: ViewportSize,
): Point | null {
  const rect = event.currentTarget.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0 || metrics.cell <= 0) return null;
  const x = ((event.clientX - rect.left) / rect.width) * size.width;
  const y = ((event.clientY - rect.top) / rect.height) * size.height;
  // Rescale có thể biến đúng mép ô 20 thành 19.999999999999996.
  // Chỉ hiệu chỉnh nhiễu sát số nguyên, không ép điểm ngoài lưới vào biên.
  const snap = (value: number) =>
    Math.abs(value - Math.round(value)) < 1e-10 ? Math.round(value) : value;
  const point = {
    x: Math.floor(snap((x - metrics.ox) / metrics.cell)),
    y: Math.floor(snap((y - metrics.oy) / metrics.cell)),
  };
  if (
    !Number.isFinite(point.x) ||
    !Number.isFinite(point.y) ||
    point.x < (bounds.minX ?? 0) ||
    point.y < (bounds.minY ?? 0) ||
    point.x > bounds.maxX ||
    point.y > bounds.maxY
  )
    return null;
  return point;
}

export function drawRasterPixels(
  ctx: CanvasRenderingContext2D,
  grid: RasterGridMetrics,
  points: Point[],
  color: string,
  columns: number,
  rows: number,
) {
  ctx.fillStyle = color;
  const inset = Math.min(2, grid.cell / 5);
  for (const point of points) {
    if (point.x < 0 || point.y < 0 || point.x >= columns || point.y >= rows) continue;
    ctx.fillRect(
      grid.ox + point.x * grid.cell + inset,
      grid.oy + point.y * grid.cell + inset,
      grid.cell - 2 * inset,
      grid.cell - 2 * inset,
    );
  }
}
