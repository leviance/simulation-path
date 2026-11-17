import type { Point } from "./model.ts";
export type Vertex = { p: Point; n: Point };
export type Surface = Vertex[][];
export const add = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Point, b: Point): Point => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: Point, s: number): Point => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: Point, b: Point) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Point, b: Point): Point => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const normal = (a: Point): Point => mul(a, 1 / (Math.hypot(...a) || 1));
export const interpolate = (a: Vertex, b: Vertex, t: number): Vertex => ({
  p: add(a.p, mul(sub(b.p, a.p), t)),
  n: add(a.n, mul(sub(b.n, a.n), t)),
});
