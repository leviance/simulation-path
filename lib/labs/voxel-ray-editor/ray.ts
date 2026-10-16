import { defaultCamera, project, orbit, zoom, type Camera } from "../voxel-chunk/raster.ts";
import {
  makeChunk,
  index,
  inside,
  type Preset,
  type Vec3,
  faces,
  faceColor,
} from "../voxel-hidden-faces/model.ts";
export {
  defaultCamera,
  project,
  orbit,
  zoom,
  makeChunk,
  index,
  inside,
  faces,
  faceColor,
  type Camera,
  type Preset,
  type Vec3,
};
export const tolerance = 1e-9;
export type Cell = [number, number, number];
export type Ray = { origin: Vec3; direction: Vec3 };
export type Interval = { enter: number; exit: number; normal: Cell };
export function makeRay(origin: Vec3, direction: Vec3): Ray {
  if (
    !origin.every((v) => Number.isFinite(v) && Math.abs(v) <= 128) ||
    !direction.every(Number.isFinite)
  )
    throw new RangeError("local finite ray");
  const length = Math.hypot(...direction);
  if (!Number.isFinite(length) || length < 1e-12) throw new RangeError("zero direction");
  return { origin: [...origin], direction: direction.map((v) => v / length) as Vec3 };
}
export const pointAt = (ray: Ray, t: number) =>
  ray.origin.map((v, i) => v + t * ray.direction[i]) as Vec3;
export function cameraRay(camera: Camera, sx: number, sy: number): Ray {
  if (
    ![sx, sy, camera.yaw, camera.pitch, camera.zoom].every(Number.isFinite) ||
    sx < 0 ||
    sx >= 320 ||
    sy < 0 ||
    sy >= 240 ||
    camera.zoom < 0.5 ||
    camera.zoom > 1.5 ||
    camera.scale !== 6 ||
    camera.center !== 8
  )
    throw new RangeError("viewport/camera");
  const a = camera.yaw,
    b = camera.pitch,
    right = [Math.cos(a), 0, -Math.sin(a)],
    up = [-Math.sin(a) * Math.sin(b), Math.cos(b), -Math.cos(a) * Math.sin(b)],
    n = [Math.sin(a) * Math.cos(b), Math.sin(b), Math.cos(a) * Math.cos(b)];
  const cx = (sx - 160) / (camera.scale * camera.zoom),
    cy = (120 - sy) / (camera.scale * camera.zoom);
  return makeRay(
    right.map((v, i) => 8 + v * cx + up[i] * cy + n[i] * 32) as Vec3,
    n.map((v) => -v) as Vec3,
  );
}
export function clipBox(ray: Ray, lower: Vec3, upper: Vec3, reach: number): Interval | null {
  const validated = makeRay(ray.origin, ray.direction);
  if (
    ray.direction.some((v, i) => Math.abs(v - validated.direction[i]) > tolerance) ||
    !Number.isFinite(reach) ||
    reach <= 0 ||
    reach > 64
  )
    throw new RangeError("normalized ray and reach (0,64]");
  let near = -Infinity,
    far = reach;
  const nearTimes = [-Infinity, -Infinity, -Infinity];
  for (let axis = 0; axis < 3; axis++) {
    const o = ray.origin[axis],
      d = validated.direction[axis],
      lo = lower[axis],
      hi = upper[axis];
    if (!Number.isFinite(lo) || !Number.isFinite(hi) || lo >= hi)
      throw new RangeError("invalid box");
    if (d === 0) {
      if (o < lo || o >= hi) return null;
      continue;
    }
    let a = (lo - o) / d,
      b = (hi - o) / d;
    if (a > b) [a, b] = [b, a];
    nearTimes[axis] = a;
    near = Math.max(near, a);
    far = Math.min(far, b);
  }
  const enter = Math.max(0, near);
  if (far - enter <= tolerance) return null;
  const normal: Cell = [0, 0, 0];
  // So mọi mặt với near cuối cùng, tránh cộng dồn sai số tie qua ba trục.
  if (near >= 0) {
    for (let axis = 0; axis < 3; axis++) {
      if (near - nearTimes[axis] <= tolerance) {
        normal[axis] = validated.direction[axis] < 0 ? 1 : -1;
        break;
      }
    }
  }
  return { enter, exit: far, normal };
}
