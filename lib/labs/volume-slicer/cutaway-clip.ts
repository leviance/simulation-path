import type { Point } from "./model.ts";
import { interpolate, type Vertex } from "./geometry.ts";
function clip(poly: Vertex[], axis: number, value: number, greater: boolean): Vertex[] {
  const result: Vertex[] = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    const da = (a.p[axis] - value) * (greater ? 1 : -1),
      db = (b.p[axis] - value) * (greater ? 1 : -1);
    if (da >= 0) result.push(a);
    if (da >= 0 !== db >= 0) result.push(interpolate(a, b, da / (da - db)));
  }
  return result;
}
export function keepOutsideCorner(triangle: Vertex[], cursor: Point): Vertex[][] {
  let remaining = triangle;
  const result: Vertex[][] = [];
  for (let axis = 0; axis < 3; axis++) {
    if (!remaining.length) break;
    const greater = axis !== 1;
    const outside = clip(remaining, axis, cursor[axis], !greater);
    for (let i = 1; i + 1 < outside.length; i++)
      result.push([outside[0], outside[i], outside[i + 1]]);
    remaining = clip(remaining, axis, cursor[axis], greater);
  }
  return result;
}
