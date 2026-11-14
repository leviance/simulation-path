import { add3, magnitude3, scale3, subtract3, type Vec3 } from "../normal.ts";
import { clamp, finitePoint, type GridSpec, type ScalarGrid } from "./grid.ts";

export interface SampleBox {
  low: [number, number, number];
  high: [number, number, number];
  empty: boolean;
}
export interface Brush {
  center: Vec3;
  radius: number;
  strength: number;
  mode: "add" | "subtract";
}
export const emptyBox = (): SampleBox => ({ low: [0, 0, 0], high: [0, 0, 0], empty: true });

export function includeSample(box: SampleBox, x: number, y: number, z: number) {
  const coordinate: [number, number, number] = [x, y, z];
  if (box.empty) {
    box.low = [...coordinate];
    box.high = [...coordinate];
    box.empty = false;
    return;
  }
  for (let axis = 0; axis < 3; ++axis) {
    box.low[axis] = Math.min(box.low[axis], coordinate[axis]);
    box.high[axis] = Math.max(box.high[axis], coordinate[axis]);
  }
}

export function includeBox(box: SampleBox, other: SampleBox) {
  if (other.empty) return;
  includeSample(box, ...other.low);
  includeSample(box, ...other.high);
}

export function validateBrush(brush: Brush) {
  if (
    !finitePoint(brush.center) ||
    Math.max(Math.abs(brush.center.x), Math.abs(brush.center.y), Math.abs(brush.center.z)) > 8 ||
    !Number.isFinite(brush.radius) ||
    brush.radius < 0.03 ||
    brush.radius > 0.6 ||
    !Number.isFinite(brush.strength) ||
    brush.strength < 0.01 ||
    brush.strength > 0.8 ||
    (brush.mode !== "add" && brush.mode !== "subtract")
  )
    throw new RangeError("Cọ cần tâm hữu hạn, radius 0,03…0,6 và strength 0,01…0,8.");
}

export function brushFalloff(normalizedDistance: number) {
  if (!Number.isFinite(normalizedDistance) || normalizedDistance < 0)
    throw new RangeError("Khoảng cách cọ không hợp lệ.");
  const remaining = Math.max(0, 1 - normalizedDistance * normalizedDistance);
  return remaining * remaining;
}

export function applyBrush(grid: ScalarGrid, brush: Brush) {
  validateBrush(brush);
  const radius = { x: brush.radius, y: brush.radius, z: brush.radius };
  const low = grid.spec.gridFromWorld(subtract3(brush.center, radius));
  const high = grid.spec.gridFromWorld(add3(brush.center, radius));
  const last = grid.spec.samples - 2;
  const x0 = clamp(Math.floor(low.x), 1, last),
    y0 = clamp(Math.floor(low.y), 1, last),
    z0 = clamp(Math.floor(low.z), 1, last);
  const x1 = clamp(Math.ceil(high.x), 1, last),
    y1 = clamp(Math.ceil(high.y), 1, last),
    z1 = clamp(Math.ceil(high.z), 1, last);
  const changed = emptyBox();
  let writes = 0;
  for (let z = z0; z <= z1; ++z)
    for (let y = y0; y <= y1; ++y)
      for (let x = x0; x <= x1; ++x) {
        const point = grid.spec.worldFromGrid({ x, y, z });
        let delta =
          brush.strength * brushFalloff(magnitude3(subtract3(point, brush.center)) / brush.radius);
        if (delta === 0) continue;
        if (brush.mode === "add") delta = -delta;
        const before = grid.at(x, y, z),
          after = Math.fround(clamp(before + delta, -4, 4));
        if (after === before) continue;
        grid.set(x, y, z, after);
        includeSample(changed, x, y, z);
        ++writes;
      }
  return { changed, writes };
}

// CPU chunks have 4³ cells to keep a step inspectable; the native GPU uses 16³.
export const canvasChunkCells = 4;
export function chunksPerAxis(spec: GridSpec) {
  return Math.ceil((spec.samples - 1) / canvasChunkCells);
}

export function dirtyChunks(spec: GridSpec, changed: SampleBox): number[] {
  if (changed.empty) return [];
  const first: number[] = [],
    last: number[] = [],
    side = chunksPerAxis(spec);
  for (let axis = 0; axis < 3; ++axis) {
    if (
      !Number.isInteger(changed.low[axis]) ||
      !Number.isInteger(changed.high[axis]) ||
      changed.low[axis] < 0 ||
      changed.high[axis] >= spec.samples ||
      changed.low[axis] > changed.high[axis]
    )
      throw new RangeError("Dirty bounds không hợp lệ.");
    // Geometry needs adjacent samples; half-spacing gradients add a halo.
    first.push(Math.floor(clamp(changed.low[axis] - 2, 0, spec.samples - 2) / canvasChunkCells));
    last.push(Math.floor(clamp(changed.high[axis] + 1, 0, spec.samples - 2) / canvasChunkCells));
  }
  const ids: number[] = [];
  for (let z = first[2]; z <= last[2]; ++z)
    for (let y = first[1]; y <= last[1]; ++y)
      for (let x = first[0]; x <= last[0]; ++x) ids.push((z * side + y) * side + x);
  return ids;
}

export class StrokeSampler {
  private previous: Vec3;
  private readonly spacing: number;
  private carry = 0;

  constructor(start: Vec3, radius: number) {
    if (!finitePoint(start) || !Number.isFinite(radius) || radius < 0.03 || radius > 0.6)
      throw new RangeError("Stroke không hợp lệ.");
    this.previous = { ...start };
    this.spacing = radius * 0.25;
  }

  advance(target: Vec3) {
    if (!finitePoint(target)) throw new RangeError("Stroke target không hữu hạn.");
    const segment = subtract3(target, this.previous),
      distance = magnitude3(segment);
    if (!Number.isFinite(distance) || (distance + this.carry) / this.spacing > 256)
      throw new RangeError("Đoạn kéo vượt 256 stamp; stroke được hủy thay vì treo trang.");
    if (distance <= 1e-8) {
      this.previous = { ...target };
      return [];
    }
    const stamps: Vec3[] = [];
    let along = this.spacing - this.carry;
    // A boundary stamp must not disappear just because several short segments
    // accumulated a few binary64 ulps more than one long segment.
    const tolerance = this.spacing * 1e-9;
    for (; along <= distance + tolerance; along += this.spacing)
      stamps.push(add3(this.previous, scale3(segment, Math.min(1, along / distance))));
    this.carry = clamp(distance - (along - this.spacing), 0, this.spacing);
    this.previous = { ...target };
    return stamps;
  }
}
