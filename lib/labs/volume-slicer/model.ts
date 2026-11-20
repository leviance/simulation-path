export type Vec3 = [number, number, number];
export interface Grid {
  size: Vec3;
  origin: Vec3;
  spacing: Vec3;
}
export const physicalExtent: Vec3 = [160, 192, 224];
export function makeGrid(side = 128): Grid {
  if (!Number.isInteger(side) || side < 1 || side > 128)
    throw new RangeError("Grid side in [1,128]");
  return {
    size: [side, side, side],
    origin: [-80, -96, -112],
    spacing: physicalExtent.map((v) => v / side) as Vec3,
  };
}
export function voxelCount(grid: Grid) {
  for (let axis = 0; axis < 3; axis++) {
    if (!Number.isInteger(grid.size[axis]) || grid.size[axis] < 1 || grid.size[axis] > 128)
      throw new RangeError("Grid dimension in [1,128]");
    if (
      !Number.isFinite(grid.origin[axis]) ||
      !Number.isFinite(grid.spacing[axis]) ||
      grid.spacing[axis] <= 0
    )
      throw new RangeError("Finite origin and positive spacing required");
    if (!Number.isFinite(grid.origin[axis] + grid.size[axis] * grid.spacing[axis]))
      throw new RangeError("Finite physical extent required");
  }
  return grid.size[0] * grid.size[1] * grid.size[2];
}
export const extent = (grid: Grid): Vec3 => grid.size.map((n, a) => n * grid.spacing[a]) as Vec3;
export const centre = (grid: Grid, x: number, y: number, z: number): Vec3 =>
  [x, y, z].map((v, a) => grid.origin[a] + (v + 0.5) * grid.spacing[a]) as Vec3;
export const coordinate = (grid: Grid, world: number, axis: number) =>
  (world - grid.origin[axis]) / grid.spacing[axis] - 0.5;
export function inside(grid: Grid, point: Vec3) {
  return point.every(
    (v, a) =>
      Number.isFinite(v) &&
      v >= grid.origin[a] &&
      v <= grid.origin[a] + grid.size[a] * grid.spacing[a],
  );
}
export function clampPoint(grid: Grid, point: Vec3): Vec3 {
  if (!point.every(Number.isFinite)) throw new RangeError("Finite probe required");
  return point.map((v, a) =>
    Math.max(grid.origin[a], Math.min(grid.origin[a] + grid.size[a] * grid.spacing[a], v)),
  ) as Vec3;
}
export class Volume {
  readonly grid: Grid;
  readonly values: Float32Array;
  constructor(grid: Grid) {
    const count = voxelCount(grid);
    this.grid = { size: [...grid.size], origin: [...grid.origin], spacing: [...grid.spacing] };
    Object.freeze(this.grid.size);
    Object.freeze(this.grid.origin);
    Object.freeze(this.grid.spacing);
    Object.freeze(this.grid);
    this.values = new Float32Array(count);
  }
  index(x: number, y: number, z: number) {
    for (const [axis, value] of [x, y, z].entries())
      if (!Number.isInteger(value) || value < 0 || value >= this.grid.size[axis])
        throw new RangeError("Voxel outside grid");
    return x + this.grid.size[0] * (y + this.grid.size[1] * z);
  }
  at(x: number, y: number, z: number) {
    return this.values[this.index(x, y, z)];
  }
  set(x: number, y: number, z: number, value: number) {
    if (!Number.isFinite(value) || Math.abs(value) > 1e30)
      throw new RangeError("Finite scalar required");
    this.values[this.index(x, y, z)] = value;
  }
}
