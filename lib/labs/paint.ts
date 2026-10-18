import type { Point } from "./geometry.ts";
import { interpolateStroke, maximumGap, thinStroke } from "./stroke.ts";

export const paintWidth = 320;
export const paintHeight = 180;
export const paintBackground = 0x11182bff;
export const paintInk = 0x53f0aeff;
export const maximumRawPoints = 128;
export const maximumStrokes = 8;

export function insidePaint(point: Point): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < paintWidth &&
    point.y < paintHeight
  );
}

export function stampCircle(
  pixels: Uint32Array,
  width: number,
  height: number,
  center: Point,
  radius: number,
  color: number,
): void {
  if (
    pixels.length !== width * height ||
    !Number.isInteger(radius) ||
    radius < 2 ||
    radius > 64 ||
    ![center.x, center.y].every(Number.isFinite) ||
    center.x < 0 ||
    center.y < 0 ||
    center.x >= width ||
    center.y >= height
  )
    return;
  const centerX = Math.floor(center.x),
    centerY = Math.floor(center.y);
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const x = centerX + dx,
        y = centerY + dy;
      if (dx * dx + dy * dy <= radius * radius && x >= 0 && y >= 0 && x < width && y < height) {
        pixels[y * width + x] = color;
      }
    }
  }
}

export function renderPaint(paths: Point[][], radius: number, every: number, interpolate: boolean) {
  const pixels = new Uint32Array(paintWidth * paintHeight);
  pixels.fill(paintBackground);
  const input = paths.map((path) => thinStroke(path, every));
  const stamps = input.map((path) => (interpolate ? interpolateStroke(path, radius * 0.8) : path));
  for (const path of stamps) {
    for (const point of path) stampCircle(pixels, paintWidth, paintHeight, point, radius, paintInk);
  }
  return {
    pixels,
    input,
    stamps,
    inputGap: Math.max(0, ...input.map(maximumGap)),
    stampGap: Math.max(0, ...stamps.map(maximumGap)),
    markedPixels: pixels.reduce((count, pixel) => count + Number(pixel === paintInk), 0),
  };
}

export const strokePresets: Record<string, Point[][]> = {
  dot: [[{ x: 160, y: 90 }]],
  line: [
    [
      { x: 25, y: 90 },
      { x: 85, y: 90 },
      { x: 155, y: 90 },
      { x: 285, y: 90 },
    ],
  ],
  corner: [
    [
      { x: 30, y: 150 },
      { x: 30, y: 35 },
      { x: 160, y: 35 },
      { x: 285, y: 145 },
    ],
  ],
  separate: [
    [
      { x: 25, y: 60 },
      { x: 125, y: 60 },
    ],
    [
      { x: 195, y: 120 },
      { x: 285, y: 120 },
    ],
  ],
};
