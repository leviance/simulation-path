import type { PointerEvent as ReactPointerEvent } from "react";
import { clamp, type Point, type ViewportSize } from "@/lib/labs/geometry";
import { canvasPoint, drawLine } from "./lab-shared";

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
  const cell = Math.max(9, Math.min((size.width - 48) / columns, (size.height - 72) / rows));
  return { cell, ox: (size.width - columns * cell) / 2, oy: 38 };
}

export function drawRasterGrid(
  ctx: CanvasRenderingContext2D,
  metrics: RasterGridMetrics,
  columns: number,
  rows: number,
) {
  const { cell, ox, oy } = metrics;
  for (let x = 0; x <= columns; x += 1) {
    drawLine(
      ctx,
      { x: ox + x * cell, y: oy },
      { x: ox + x * cell, y: oy + rows * cell },
      "#26314c",
    );
  }
  for (let y = 0; y <= rows; y += 1) {
    drawLine(
      ctx,
      { x: ox, y: oy + y * cell },
      { x: ox + columns * cell, y: oy + y * cell },
      "#26314c",
    );
  }
}

export function rasterPointFromEvent(
  event: ReactPointerEvent<HTMLCanvasElement>,
  metrics: RasterGridMetrics,
  bounds: { minX?: number; maxX: number; minY?: number; maxY: number },
): Point {
  const point = canvasPoint(event, event.currentTarget);
  return {
    x: clamp(Math.floor((point.x - metrics.ox) / metrics.cell), bounds.minX ?? 0, bounds.maxX),
    y: clamp(Math.floor((point.y - metrics.oy) / metrics.cell), bounds.minY ?? 0, bounds.maxY),
  };
}
