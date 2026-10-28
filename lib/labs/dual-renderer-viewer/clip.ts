import type { Vec4 } from "./types.ts";
export function clipDistance(p: Vec4, plane: number) {
  return [p.w + p.x, p.w - p.x, p.w + p.y, p.w - p.y, p.w + p.z, p.w - p.z][plane];
}
export function intersectClipEdge(a: Vec4, b: Vec4, plane: number): Vec4 {
  const order = [a.x - b.x, a.y - b.y, a.z - b.z, a.w - b.w].find((n) => n !== 0) ?? 0;
  if (order > 0) [a, b] = [b, a];
  const da = clipDistance(a, plane),
    db = clipDistance(b, plane),
    t = da / (da - db);
  return {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    z: a.z + t * (b.z - a.z),
    w: a.w + t * (b.w - a.w),
  };
}
export function clipTriangle(a: Vec4, b: Vec4, c: Vec4) {
  let polygon = [a, b, c];
  for (let plane = 0; plane < 6 && polygon.length >= 3; plane++) {
    const output: Vec4[] = [];
    let previous = polygon[polygon.length - 1];
    for (const current of polygon) {
      const inside = clipDistance(current, plane) >= 0,
        wasInside = clipDistance(previous, plane) >= 0;
      if (inside !== wasInside) output.push(intersectClipEdge(previous, current, plane));
      if (inside) output.push(current);
      previous = current;
    }
    polygon = output.filter(
      (p, i) =>
        i === 0 ||
        ["x", "y", "z", "w"].some((k) => p[k as keyof Vec4] !== output[i - 1][k as keyof Vec4]),
    );
  }
  return polygon;
}
