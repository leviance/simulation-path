import {
  add,
  cross,
  dot,
  multiply,
  normalize,
  subtract,
  type Camera,
  type Scene,
  type Vec3,
} from "../../../lib/labs/ray-intersections.ts";
import { mixInk, type Color, type Raster, type Vertex } from "./raster.ts";

export const v3 = (x: number, y: number, z: number): Vec3 => ({ x, y, z });
export const between = (a: Vec3, b: Vec3, t: number) => add(a, multiply(subtract(b, a), t));
export const lamp = normalize(v3(-0.5, 1, -0.55));
export function finish(camera: Camera, p: Vec3, n: Vec3, color: Color): Color {
  const eye = normalize(subtract(camera.origin, p));
  const normal = dot(eye, n) < 0 ? multiply(n, -1) : n;
  const reflection = Math.max(0, dot(normal, normalize(add(eye, lamp))));
  const diffuse = 0.32 + 0.62 * Math.max(0, dot(normal, lamp)) + 0.14 * Math.max(0, normal.y);
  const rim = (1 - Math.min(1, Math.max(0, dot(normal, eye)))) ** 3;
  const broad = reflection ** 16,
    sharp = reflection ** 85;
  return [
    color[0] * diffuse + 75 * broad + 62 * sharp + 27 * rim,
    color[1] * diffuse + 84 * broad + 63 * sharp + 46 * rim,
    color[2] * diffuse + 90 * broad + 65 * sharp + 54 * rim,
  ];
}

export const quad = (r: Raster, a: Vec3, b: Vec3, c: Vec3, d: Vec3, ink: Color) => {
  r.triangle(a, b, c, ink);
  r.triangle(a, c, d, ink);
};
export const sphereNormal = (latitude: number, longitude: number) =>
  v3(
    Math.cos(latitude) * Math.cos(longitude),
    Math.sin(latitude),
    Math.cos(latitude) * Math.sin(longitude),
  );
const meridians = 56;
const latitudes = 24;
const normals = Array.from({ length: latitudes + 1 }, (_, y) =>
  Array.from({ length: meridians + 1 }, (_, x) =>
    sphereNormal((y / latitudes - 0.5) * Math.PI, (x * 2 * Math.PI) / meridians),
  ),
);

export function drawSphere(r: Raster, sphere: Scene["sphere"], color: Color) {
  const skin = (normal: Vec3) => add(sphere.center, multiply(normal, sphere.radius));
  let previous: Vertex[] = [];
  for (const row of normals) {
    const current = row.map((n) => {
      const point = skin(n);
      return { point, color: finish(r.camera, point, n, color) };
    });
    if (previous.length) {
      for (let i = 0; i < meridians; i++) {
        r.paint(previous[i], previous[i + 1], current[i + 1]);
        r.paint(previous[i], current[i + 1], current[i]);
      }
    }
    previous = current;
  }
  for (let i = 0; i < meridians; i++) {
    const angle = (i * 2 * Math.PI) / meridians;
    const a = skin(sphereNormal(0, angle));
    r.line(a, skin(sphereNormal(0, ((i + 1) * 2 * Math.PI) / meridians)), [113, 194, 188]);
    if (i % 2 === 0)
      r.line(a, skin(sphereNormal(i % 7 === 0 ? 0.14 : 0.072, angle)), [167, 218, 205]);
  }
}

export const boxCorners = (box: Scene["box"]) =>
  Array.from({ length: 8 }, (_, i) =>
    v3(
      i & 1 ? box.maximum.x : box.minimum.x,
      i & 2 ? box.maximum.y : box.minimum.y,
      i & 4 ? box.maximum.z : box.minimum.z,
    ),
  );
const faces = [
  [0, 1, 3, 2],
  [4, 6, 7, 5],
  [0, 4, 5, 1],
  [2, 3, 7, 6],
  [0, 2, 6, 4],
  [1, 5, 7, 3],
];
export function drawBox(r: Raster, box: Scene["box"], color: Color) {
  const corners = boxCorners(box);
  for (const face of faces) {
    const [a, b, , d] = face.map((i) => corners[i]);
    const n = normalize(cross(subtract(b, a), subtract(d, a)));
    const [p, q, s, t] = face.map((i) => ({
      point: corners[i],
      color: finish(r.camera, corners[i], n, color),
    }));
    r.paint(p, q, s);
    r.paint(p, s, t);
  }
  for (const [a, b, , d] of faces) {
    const p = (x: number, y: number) =>
      add(
        corners[a],
        add(
          multiply(subtract(corners[b], corners[a]), x),
          multiply(subtract(corners[d], corners[a]), y),
        ),
      );
    const ink: Color = [104, 68, 42];
    r.line(p(0.07, 0.12), p(0.93, 0.12), ink);
    r.line(p(0.04, 0.97), p(0.96, 0.97), [238, 197, 133]);
    const gauge: Color = [227, 178, 116];
    r.line(p(0.35, 0.55), p(0.46, 0.55), gauge);
    r.line(p(0.54, 0.55), p(0.65, 0.55), gauge);
    r.line(p(0.5, 0.39), p(0.5, 0.5), gauge);
    r.line(p(0.5, 0.6), p(0.5, 0.71), gauge);
    for (let k = 0; k <= 8; k++) {
      const x = 0.1 + 0.1 * k;
      r.line(p(x, 0.12), p(x, k % 4 === 0 ? 0.22 : 0.17), ink);
    }
  }
}

export function drawSheet(r: Raster, triangle: Scene["triangle"], color: Color) {
  const { a, b, c } = triangle;
  const normal = normalize(cross(subtract(b, a), subtract(c, a)));
  const inkAt = (point: Vec3, pigment: Color) => ({
    point,
    color: finish(r.camera, point, normal, pigment),
  });
  const p = inkAt(a, mixInk(color, [62, 61, 113], 0.32));
  const q = inkAt(b, mixInk(color, [178, 221, 239], 0.28));
  const s = inkAt(c, mixInk(color, [250, 198, 228], 0.36));
  r.paint(p, q, s);
  const ink = mixInk(q.color, [238, 225, 249], 0.27);
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    r.line(between(a, b, t), between(a, c, t), ink);
    r.line(between(b, a, t), between(b, c, t), ink);
    r.line(between(c, a, t), between(c, b, t), ink);
  }
  r.line(a, b, [199, 179, 226]);
  r.line(b, c, [223, 213, 243]);
  r.line(c, a, [199, 179, 226]);
}
