import {
  axesFor,
  lower,
  sampleNearest,
  phantom,
  clampPoint,
  defaultGrid,
  type Grid,
  type Point,
  type Volume,
} from "./model.ts";
import { sampleLinear } from "./sampling.ts";
export interface Window {
  level: number;
  width: number;
}
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
export function windowValue(value: number, window: Window) {
  if (
    !Number.isFinite(value) ||
    !Number.isFinite(window.level) ||
    !Number.isFinite(window.width) ||
    window.width <= 0
  )
    throw new RangeError("Invalid scalar or window/level");
  const minimum = window.level - window.width / 2;
  return Math.max(0, Math.min(1, (value - minimum) / window.width));
}
export function slicePoint(grid: Grid, view: number, cursor: Point, u: number, v: number): Point {
  const axes = axesFor(view),
    point: Point = [...cursor];
  point[axes.horizontal] =
    lower(grid, axes.horizontal) + u * grid.count[axes.horizontal] * grid.spacing[axes.horizontal];
  point[axes.vertical] =
    lower(grid, axes.vertical) + (1 - v) * grid.count[axes.vertical] * grid.spacing[axes.vertical];
  return point;
}
export function makeImage(
  volume: Volume | null,
  view: number,
  cursor: Point,
  window: Window,
  linear: boolean,
  stage: number,
  side = 128,
) {
  if (!Number.isInteger(side) || side < 1 || side > 256)
    throw new RangeError("Bounded image size required");
  const rgba = new Uint8ClampedArray(side * side * 4);
  const grid = volume?.grid ?? defaultGrid;
  for (let y = 0; y < side; y++)
    for (let x = 0; x < side; x++) {
      const point = slicePoint(grid, view, cursor, (x + 0.5) / side, (y + 0.5) / side);
      let value: number;
      if (stage < 2) value = phantom(point);
      else {
        if (!volume) throw new Error("Voxel sampling needs a volume");
        if (stage >= 5 && linear) value = sampleLinear(volume, point) ?? 0;
        else value = sampleNearest(volume, point) ?? 0;
      }
      let brightness = Math.max(0, Math.min(1, value));
      if (stage >= 4) brightness = windowValue(value, window);
      const gray = Math.floor(brightness * 255 + 0.5),
        pixel = 4 * (x + y * side);
      rgba[pixel] = gray;
      rgba[pixel + 1] = gray;
      rgba[pixel + 2] = gray;
      rgba[pixel + 3] = 255;
    }
  return rgba;
}
export function fitSlice(grid: Grid, view: number, panel: Rect): Rect {
  const axes = axesFor(view),
    width = grid.count[axes.horizontal] * grid.spacing[axes.horizontal],
    height = grid.count[axes.vertical] * grid.spacing[axes.vertical],
    scale = Math.min(panel.width / width, panel.height / height);
  return {
    x: panel.x + (panel.width - width * scale) / 2,
    y: panel.y + (panel.height - height * scale) / 2,
    width: width * scale,
    height: height * scale,
  };
}
export function panelRect(view: number, width: number, height: number, threeViews: boolean): Rect {
  if (threeViews)
    return { x: (view * width) / 3 + 12, y: 40, width: width / 3 - 24, height: height - 64 };
  return { x: 24, y: 40, width: width - 48, height: height - 64 };
}
export function pickSlice(
  grid: Grid,
  view: number,
  cursor: Point,
  rect: Rect,
  x: number,
  y: number,
): Point | null {
  if (
    rect.width <= 0 ||
    rect.height <= 0 ||
    x < rect.x ||
    x > rect.x + rect.width ||
    y < rect.y ||
    y > rect.y + rect.height
  )
    return null;
  return clampPoint(
    grid,
    slicePoint(grid, view, cursor, (x - rect.x) / rect.width, (y - rect.y) / rect.height),
  );
}
