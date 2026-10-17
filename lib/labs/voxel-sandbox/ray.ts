import type { Camera } from "../voxel-chunk/raster.ts";
import type { Player } from "../voxel-chunk-streaming/coordinates.ts";
import { minimumNearDepth } from "./view-volume.ts";
export type Cell = [number, number, number];
export type Vector = [number, number, number];
export type Ray = { origin: Vector; direction: Vector };
export const epsilon = 1e-9;
export function makeRay(origin: Vector, direction: Vector): Ray {
  if (
    !origin.every((v) => Number.isFinite(v) && Math.abs(v) <= 4096) ||
    !direction.every(Number.isFinite)
  )
    throw new RangeError("finite ray, origin +/-4096");
  const length = Math.hypot(...direction);
  if (!Number.isFinite(length) || length < 1e-12) throw new RangeError("zero direction");
  return { origin: [...origin], direction: direction.map((v) => v / length) as Vector };
}
export function cameraRay(
  camera: Camera,
  player: Player,
  x: number,
  y: number,
  nearDepth = minimumNearDepth,
) {
  if (
    ![x, y, camera.yaw, camera.pitch, player.x, player.z].every(Number.isFinite) ||
    x < 0 ||
    x >= 320 ||
    y < 0 ||
    y >= 240 ||
    camera.scale !== 2 ||
    camera.center !== 8 ||
    camera.zoom < 0.5 ||
    camera.zoom > 1.5 ||
    !Number.isFinite(camera.zoom) ||
    !Number.isFinite(nearDepth) ||
    nearDepth < minimumNearDepth ||
    nearDepth > 3072
  )
    throw new RangeError("sandbox camera/pixel");
  const a = camera.yaw,
    b = camera.pitch;
  const right = [Math.cos(a), 0, -Math.sin(a)];
  const up = [-Math.sin(a) * Math.sin(b), Math.cos(b), -Math.cos(a) * Math.sin(b)];
  const normal = [Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b)];
  const u = (x + 0.5 - 160) / (camera.scale * camera.zoom);
  const v = (120 - y - 0.5) / (camera.scale * camera.zoom);
  const center = [player.x, 8, player.z];
  return makeRay(
    center.map((c, i) => c + right[i] * u + up[i] * v + normal[i] * nearDepth) as Vector,
    normal.map((n) => -n) as Vector,
  );
}
export function clipBox(ray: Ray, lo: Vector, hi: Vector, reach = 96) {
  let enter = -Infinity,
    exit = reach;
  const times: number[] = [];
  for (let i = 0; i < 3; i++) {
    const d = ray.direction[i],
      o = ray.origin[i];
    if (d === 0) {
      if (o < lo[i] || o >= hi[i]) return null;
      times.push(-Infinity);
      continue;
    }
    let a = (lo[i] - o) / d,
      b = (hi[i] - o) / d;
    if (a > b) [a, b] = [b, a];
    times.push(a);
    enter = Math.max(enter, a);
    exit = Math.min(exit, b);
  }
  const start = Math.max(0, enter);
  if (exit - start <= epsilon) return null;
  const normal: Cell = [0, 0, 0];
  if (enter >= 0)
    for (let i = 0; i < 3; i++)
      if (enter - times[i] <= epsilon) {
        normal[i] = ray.direction[i] < 0 ? 1 : -1;
        break;
      }
  return { enter: start, exit, normal };
}
