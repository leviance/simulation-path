export interface Vec3 {
  x: number;
  y: number;
  z: number;
}
export interface CloudPoint {
  id: number;
  position: Vec3;
}
export interface Box {
  minimum: Vec3;
  maximum: Vec3;
}
export interface Plane {
  normal: Vec3;
  distance: number;
}
export interface Region {
  shape: "box" | "sphere" | "frustum";
  center: Vec3;
  half: Vec3;
  radius: number;
  minimumHeight: number;
  maximumHeight: number;
  planes: Plane[];
}
export const add = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
export const scale = (a: Vec3, s: number): Vec3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
export const unit = (a: Vec3) => {
  const length = Math.sqrt(dot(a, a));
  if (!Number.isFinite(length) || length < 1e-12) throw Error("Vector không hợp lệ");
  return scale(a, 1 / length);
};
export const around = (center: Vec3, half: Vec3): Box => ({
  minimum: sub(center, half),
  maximum: add(center, half),
});
export const contains = (b: Box, p: Vec3) =>
  p.x >= b.minimum.x &&
  p.x <= b.maximum.x &&
  p.y >= b.minimum.y &&
  p.y <= b.maximum.y &&
  p.z >= b.minimum.z &&
  p.z <= b.maximum.z;
export const distance = (plane: Plane, p: Vec3) => dot(plane.normal, p) + plane.distance;
export const tolerance = (p: Plane) =>
  1e-9 *
  (1 + Math.abs(p.distance) + Math.abs(p.normal.x) + Math.abs(p.normal.y) + Math.abs(p.normal.z));
export function region(): Region {
  return {
    shape: "box",
    center: { x: 0, y: 2, z: 0 },
    half: { x: 3, y: 2, z: 3 },
    radius: 3,
    minimumHeight: -10000,
    maximumHeight: 10000,
    planes: [],
  };
}
export function accepts(r: Region, p: Vec3) {
  if (p.y < r.minimumHeight || p.y > r.maximumHeight) return false;
  if (r.shape === "box") return contains(around(r.center, r.half), p);
  if (r.shape === "sphere") {
    const delta = sub(p, r.center);
    return dot(delta, delta) <= r.radius * r.radius;
  }
  return r.planes.every((plane) => distance(plane, p) >= -tolerance(plane));
}
export function mayOverlap(r: Region, b: Box) {
  if (b.maximum.y < r.minimumHeight || b.minimum.y > r.maximumHeight) return false;
  if (r.shape === "box") {
    const q = around(r.center, r.half);
    return (
      b.maximum.x >= q.minimum.x &&
      b.minimum.x <= q.maximum.x &&
      b.maximum.y >= q.minimum.y &&
      b.minimum.y <= q.maximum.y &&
      b.maximum.z >= q.minimum.z &&
      b.minimum.z <= q.maximum.z
    );
  }
  if (r.shape === "sphere") {
    const closest = {
      x: Math.max(b.minimum.x, Math.min(b.maximum.x, r.center.x)),
      y: Math.max(b.minimum.y, Math.min(b.maximum.y, r.center.y)),
      z: Math.max(b.minimum.z, Math.min(b.maximum.z, r.center.z)),
    };
    const delta = sub(closest, r.center);
    return dot(delta, delta) <= r.radius * r.radius;
  }
  return r.planes.every((plane) => {
    const positive = { ...b.minimum };
    if (plane.normal.x >= 0) positive.x = b.maximum.x;
    if (plane.normal.y >= 0) positive.y = b.maximum.y;
    if (plane.normal.z >= 0) positive.z = b.maximum.z;
    return distance(plane, positive) >= -tolerance(plane);
  });
}
