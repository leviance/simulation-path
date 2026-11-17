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
export function locatorPoint(grid: Grid, point: Point, area: Rect) {
  const extent = grid.count.map((n, a) => n * grid.spacing[a]);
  const horizontalSpan = extent[0] + 0.65 * extent[1];
  const verticalSpan = 0.3 * extent[0] + 0.35 * extent[1] + extent[2];
  const scale = 0.9 * Math.min(area.width / horizontalSpan, area.height / verticalSpan);
  return {
    x: area.x + area.width / 2 + (point[0] - 0.65 * point[1]) * scale,
    y: area.y + area.height / 2 + (0.3 * point[0] + 0.35 * point[1] - point[2]) * scale,
  };
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
export function sampleImage(
  volume: Volume | null,
  view: number,
  cursor: Point,
  linear: boolean,
  stage: number,
  side = 128,
) {
  if (!Number.isInteger(side) || side < 1 || side > 256)
    throw new RangeError("Bounded image size required");
  const scalars = new Float64Array(side * side);
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
      scalars[x + y * side] = value;
    }
  return scalars;
}
const colorStops = [
  [6, 10, 23],
  [43, 34, 95],
  [20, 136, 145],
  [104, 205, 145],
  [255, 235, 145],
];
export function colorValue(brightness: number, color: boolean): Point {
  if (!Number.isFinite(brightness)) throw new RangeError("Brightness must be finite");
  const t = Math.max(0, Math.min(1, brightness));
  if (!color) {
    const gray = Math.floor(t * 255 + 0.5);
    return [gray, gray, gray];
  }
  const position = t * 4,
    index = Math.min(3, Math.floor(position));
  return colorStops[index].map((a, c) =>
    Math.floor(a + (colorStops[index + 1][c] - a) * (position - index) + 0.5),
  ) as Point;
}
export function colorImage(scalars: Float64Array, window: Window, stage: number, color = false) {
  if (scalars.length < 1 || scalars.length > 256 * 256)
    throw new RangeError("Bounded scalar image required");
  const rgba = new Uint8ClampedArray(scalars.length * 4);
  for (let i = 0; i < scalars.length; i++) {
    let brightness = Math.max(0, Math.min(1, scalars[i]));
    if (stage >= 4) brightness = windowValue(scalars[i], window);
    const rgb = colorValue(brightness, color);
    rgba.set(rgb, 4 * i);
    rgba[4 * i + 3] = 255;
  }
  return rgba;
}
export function makeImage(
  volume: Volume | null,
  view: number,
  cursor: Point,
  window: Window,
  linear: boolean,
  stage: number,
  side = 128,
  color = false,
) {
  return colorImage(sampleImage(volume, view, cursor, linear, stage, side), window, stage, color);
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
    return { x: (view * width) / 3 + 12, y: 42, width: width / 3 - 24, height: height * 0.51 };
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
