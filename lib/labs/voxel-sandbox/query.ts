import type { World } from "../voxel-chunk-streaming/types.ts";
import { index } from "../voxel-greedy-meshing/model.ts";
import { makeRay, clipBox, epsilon, type Cell, type Ray } from "./ray.ts";
export type Hit = { cell: Cell; normal: Cell; distance: number };
export type Trace = { hit: Hit | null; blocked: boolean; path: Cell[] };
export function residentBlock(world: World, cell: Cell) {
  const [x, y, z] = cell;
  if (y < 0 || y >= 16) return 0;
  const cx = Math.floor(x / 16),
    cz = Math.floor(z / 16);
  const entry = world.chunks.get(`${cx},${cz}`);
  if (!entry) return -1;
  return entry.blocks[index(x - cx * 16, y, z - cz * 16)];
}
export function traceWorld(world: World, ray: Ray, reach = 96): Trace {
  const validated = makeRay(ray.origin, ray.direction);
  if (
    ray.direction.some((v, i) => Math.abs(v - validated.direction[i]) > epsilon) ||
    !Number.isFinite(reach) ||
    reach <= 0 ||
    reach > 96
  )
    throw new RangeError("normalized ray, reach (0,96]");
  const result: Trace = { hit: null, blocked: false, path: [] };
  const interval = clipBox(ray, [-1024, 0, -1024], [1024, 16, 1024], reach);
  if (!interval) return result;
  const cell: Cell = [0, 0, 0],
    step: Cell = [0, 0, 0];
  const tMax = [Infinity, Infinity, Infinity],
    tDelta = [Infinity, Infinity, Infinity];
  for (let i = 0; i < 3; i++) {
    const d = ray.direction[i];
    let p = ray.origin[i] + interval.enter * d;
    const nearest = Math.round(p);
    if (d !== 0 && Math.abs(p - nearest) <= epsilon * Math.abs(d)) p = nearest;
    cell[i] = Math.floor(p);
    if (d < 0 && p === Math.floor(p)) cell[i]--;
    if (d !== 0) {
      step[i] = d < 0 ? -1 : 1;
      tMax[i] = (cell[i] + Number(d > 0) - ray.origin[i]) / d;
      tDelta[i] = 1 / Math.abs(d);
    }
  }
  const first = clipBox(ray, cell, cell.map((v) => v + 1) as Cell, reach);
  let normal: Cell = first ? [...first.normal] : [...interval.normal];
  let t = interval.enter;
  for (let iteration = 0; iteration < 256; iteration++) {
    if (
      cell[1] < 0 ||
      cell[1] >= 16 ||
      cell[0] < -1024 ||
      cell[0] >= 1024 ||
      cell[2] < -1024 ||
      cell[2] >= 1024
    )
      return result;
    const next = Math.min(...tMax),
      exit = Math.min(next, interval.exit);
    if (exit - t > epsilon) {
      result.path.push([...cell]);
      const value = residentBlock(world, cell);
      if (value < 0) {
        result.blocked = true;
        return result;
      }
      if (value > 0) {
        result.hit = { cell: [...cell], normal: [...normal], distance: t };
        return result;
      }
    }
    if (next >= interval.exit - epsilon) return result;
    normal = [0, 0, 0];
    let chosen = false;
    for (let i = 0; i < 3; i++)
      if (tMax[i] <= next + epsilon) {
        cell[i] += step[i];
        tMax[i] += tDelta[i];
        if (!chosen) {
          normal[i] = -step[i];
          chosen = true;
        }
      }
    t = Math.max(t, next);
  }
  throw new Error("DDA exceeded 256 iterations");
}
