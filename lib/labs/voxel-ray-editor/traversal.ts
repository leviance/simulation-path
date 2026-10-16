import { validateChunk } from "../voxel-chunk/model.ts";
import {
  clipBox,
  inside,
  index,
  pointAt,
  tolerance,
  type Ray,
  type Interval,
  type Cell,
  type Vec3,
} from "./ray.ts";
export type Visit = {
  cell: Cell;
  enter: number;
  exit: number;
  normal: Cell;
  step: Cell;
  tMax: Vec3;
  tDelta: Vec3;
};
export type Hit = { cell: Cell; normal: Cell; distance: number };
export type Trace = { interval: Interval | null; visits: Visit[]; hit: Hit | null };
export function traverse(
  chunk: Uint8Array,
  ray: Ray,
  reach = 64,
  stopAtSolid = true,
  stage = 9,
): Trace {
  validateChunk(chunk);
  const trace: Trace = {
    interval: clipBox(ray, [0, 0, 0], [16, 16, 16], reach),
    visits: [],
    hit: null,
  };
  if (!trace.interval) return trace;
  const start = pointAt(ray, trace.interval.enter),
    cell: Cell = [0, 0, 0],
    step: Cell = [0, 0, 0],
    tMax: Vec3 = [Infinity, Infinity, Infinity],
    tDelta: Vec3 = [Infinity, Infinity, Infinity];
  for (let axis = 0; axis < 3; axis++) {
    const d = ray.direction[axis];
    let p = Math.max(0, Math.min(16, start[axis]));
    const integer = Math.round(p);
    if (d !== 0 && Math.abs(p - integer) <= tolerance * Math.abs(d)) p = integer;
    let coordinate = Math.floor(p);
    if (d < 0 && p === Math.floor(p)) coordinate--;
    cell[axis] = Math.max(0, Math.min(15, coordinate));
    if (d !== 0) {
      step[axis] = d < 0 ? -1 : 1;
      const boundary = cell[axis] + (d < 0 ? 0 : 1);
      tMax[axis] = (boundary - ray.origin[axis]) / d;
      tDelta[axis] = 1 / Math.abs(d);
    }
  }
  // Mặt đi vào ô đầu không nhất thiết là mặt ngoài chunk: origin có thể ở biên nội bộ.
  const firstCellInterval = clipBox(ray, cell, cell.map((v) => v + 1) as Cell, reach);
  let t = Math.max(trace.interval.enter, firstCellInterval?.enter ?? trace.interval.enter),
    normal: Cell = firstCellInterval ? [...firstCellInterval.normal] : [0, 0, 0];
  for (let iteration = 0; iteration < 64; iteration++) {
    if (!inside(...cell)) return trace;
    const next = Math.min(...tMax),
      exit = Math.min(next, trace.interval.exit);
    if (exit - t > tolerance) {
      trace.visits.push({
        cell: [...cell],
        enter: t,
        exit,
        normal: [...normal],
        step: [...step],
        tMax: [...tMax],
        tDelta: [...tDelta],
      });
      if (stage >= 5 && stopAtSolid && chunk[index(...cell)] !== 0) {
        trace.hit = { cell: [...cell], normal: [...normal], distance: t };
        return trace;
      }
    }
    if (next >= trace.interval.exit - tolerance) return trace;
    normal = [0, 0, 0];
    let chosen = false;
    for (let axis = 0; axis < 3; axis++)
      if (tMax[axis] <= next + tolerance) {
        cell[axis] += step[axis];
        tMax[axis] += tDelta[axis];
        if (!chosen) {
          normal[axis] = -step[axis];
          chosen = true;
        }
      }
    t = Math.max(t, next);
  }
  throw new Error("DDA exceeded bounded 64 iterations");
}
