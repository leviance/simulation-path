import { add, multiply, type Scene, type Vec3 } from "../../../lib/labs/ray-intersections.ts";
import { between, boxCorners, lamp, quad, sphereNormal, v3 } from "./specimens.ts";
import { mixInk, type Color, type Raster } from "./raster.ts";

export function drawMat(raster: Raster, plane: Scene["plane"], selected: boolean, debug: boolean) {
  const p = (x: number, z: number) => add(plane.point, v3(x, 0, z));
  for (let z = -8; z < 5; z++) {
    for (let x = -5; x < 5; x++) {
      const around = Math.max(0, 1 - (x * x + 0.55 * z * z) / 45);
      let color: Color = [
        33 + 15 * around + 2 * ((x + z + 16) % 2),
        48 + 20 * around,
        57 + 22 * around,
      ];
      if (selected) color = mixInk(color, [68, 106, 112], 0.18);
      quad(raster, p(x, z), p(x + 1, z), p(x + 1, z + 1), p(x, z + 1), color);
    }
  }
  const grid: Color = [68, 91, 99],
    brass: Color = [180, 151, 99];
  for (let x = -5; x <= 5; x++) raster.line(p(x, -8), p(x, 5), grid);
  for (let z = -8; z <= 5; z++) raster.line(p(-5, z), p(5, z), grid);
  raster.line(p(-4.5, -2.8), p(4.5, -2.8), brass);
  raster.line(p(-3.6, -7.4), p(-3.6, 4.4), brass);
  for (let i = -22; i <= 22; i++)
    raster.line(p(i / 5, -2.8), p(i / 5, i % 5 === 0 ? -2.59 : -2.72), brass);
  for (let i = -37; i <= 22; i++)
    raster.line(p(-3.6, i / 5), p(i % 5 === 0 ? -3.39 : -3.52, i / 5), brass);
  if (debug) {
    const origin = v3(0, 0, 0);
    raster.line(origin, v3(1, 0, 0), [237, 125, 121], true);
    raster.line(origin, v3(0, 1, 0), [129, 225, 165], true);
    raster.line(origin, v3(0, 0, 1), [126, 177, 250], true);
  }
}

function footprint(raster: Raster, points: Vec3[]) {
  if (points.length < 3) return;
  points.sort((a, b) => a.x - b.x || a.z - b.z);
  const hull: Vec3[] = [];
  const append = (p: Vec3, start: number) => {
    while (hull.length >= start + 2) {
      const a = hull[hull.length - 2],
        b = hull[hull.length - 1];
      if ((b.x - a.x) * (p.z - a.z) - (b.z - a.z) * (p.x - a.x) > 0) break;
      hull.pop();
    }
    hull.push(p);
  };
  for (const p of points) append(p, 0);
  const start = hull.length - 1;
  for (let i = points.length - 2; i >= 0; i--) append(points[i], start);
  hull.pop();
  if (hull.length < 3) return;
  const center = multiply(hull.reduce(add, v3(0, 0, 0)), 1 / hull.length);
  for (const [width, opacity] of [
    [1.12, 26 / 255],
    [1.05, 38 / 255],
    [0.99, 84 / 255],
  ]) {
    const edges = hull.map((p) => between(center, p, width));
    for (let i = 0; i < edges.length; i++)
      raster.triangle(center, edges[i], edges[(i + 1) % edges.length], [5, 13, 21], opacity);
  }
}

export function drawShadows(raster: Raster, scene: Scene) {
  const y = scene.plane.point.y;
  const cast = (p: Vec3) =>
    v3(p.x - (lamp.x * (p.y - y)) / lamp.y, y, p.z - (lamp.z * (p.y - y)) / lamp.y);
  let points: Vec3[] = [];
  const edge = (a: Vec3, b: Vec3) => {
    const ha = a.y - y,
      hb = b.y - y;
    if (ha >= 0) points.push(cast(a));
    if (ha * hb < 0) points.push(cast(between(a, b, ha / (ha - hb))));
  };
  for (let row = 0; row < 8; row++) {
    for (let x = 0; x < 20; x++) {
      const phi = (x * 2 * Math.PI) / 20;
      const at = (lat: number) =>
        add(
          scene.sphere.center,
          multiply(sphereNormal((lat / 8 - 0.5) * Math.PI, phi), scene.sphere.radius),
        );
      const upper = at(row + 1);
      edge(at(row), upper);
      if (row === 7 && upper.y >= y) points.push(cast(upper));
    }
  }
  footprint(raster, points);
  points = [];
  const corners = boxCorners(scene.box);
  for (let i = 0; i < 8; i++) for (const axis of [1, 2, 4]) edge(corners[i], corners[i ^ axis]);
  footprint(raster, points);
  points = [];
  const { a, b, c } = scene.triangle;
  edge(a, b);
  edge(b, c);
  edge(c, a);
  footprint(raster, points);
}
