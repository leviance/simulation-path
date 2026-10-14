export type Point = [number, number, number];
export interface Grid {
  count: [number, number, number];
  spacing: Point;
}
export const defaultGrid: Grid = { count: [64, 48, 40], spacing: [0.05, 0.08, 0.12] };
export const lower = (grid: Grid, axis: number) => (-grid.count[axis] * grid.spacing[axis]) / 2;
export const worldCoordinate = (grid: Grid, axis: number, index: number) =>
  lower(grid, axis) + (index + 0.5) * grid.spacing[axis];
export const gridCoordinate = (grid: Grid, axis: number, world: number) =>
  (world - lower(grid, axis)) / grid.spacing[axis] - 0.5;
export const initialPoint = (grid = defaultGrid): Point =>
  [0, 1, 2].map((a) => worldCoordinate(grid, a, Math.floor(grid.count[a] / 2))) as Point;
export function axesFor(view: number) {
  if (view === 1) return { horizontal: 0, vertical: 2, cut: 1 };
  if (view === 2) return { horizontal: 1, vertical: 2, cut: 0 };
  return { horizontal: 0, vertical: 1, cut: 2 };
}
export const viewNames = ["XY — axial (z)", "XZ — coronal (y)", "YZ — sagittal (x)"];
export function gaussian(point: Point, centre: Point, radius: Point) {
  let q = 0;
  for (let axis = 0; axis < 3; axis++) {
    const d = (point[axis] - centre[axis]) / radius[axis];
    q += d * d;
  }
  return Math.exp(-q);
}
export function phantom(point: Point) {
  const body = 0.6 * gaussian(point, [0, 0, 0], [0.85, 1.1, 1.3]);
  const insert = 0.75 * gaussian(point, [-0.55, -0.45, 0.35], [0.22, 0.3, 0.5]);
  const marker = 0.8 * gaussian(point, [0.9, 0.85, -0.6], [0.18, 0.25, 0.22]);
  return Math.max(0, Math.min(1, 0.04 + body + insert + marker));
}
export class Volume {
  grid: Grid;
  values: Float64Array;
  constructor(grid: Grid = defaultGrid) {
    for (let axis = 0; axis < 3; axis++)
      if (
        !Number.isInteger(grid.count[axis]) ||
        grid.count[axis] < 1 ||
        grid.count[axis] > 128 ||
        !Number.isFinite(grid.spacing[axis]) ||
        grid.spacing[axis] <= 0
      )
        throw new RangeError("Count 1..128; spacing finite and positive");
    this.grid = { count: [...grid.count], spacing: [...grid.spacing] };
    this.values = new Float64Array(grid.count[0] * grid.count[1] * grid.count[2]);
  }
  index(x: number, y: number, z: number) {
    const c = this.grid.count;
    if (
      ![x, y, z].every(Number.isInteger) ||
      x < 0 ||
      x >= c[0] ||
      y < 0 ||
      y >= c[1] ||
      z < 0 ||
      z >= c[2]
    )
      throw new RangeError("Voxel index outside volume");
    return x + c[0] * (y + c[1] * z);
  }
  voxel(x: number, y: number, z: number) {
    return this.values[this.index(x, y, z)];
  }
}
export function fillPhantom(volume: Volume) {
  const grid = volume.grid;
  for (let z = 0; z < grid.count[2]; z++)
    for (let y = 0; y < grid.count[1]; y++)
      for (let x = 0; x < grid.count[0]; x++)
        volume.values[volume.index(x, y, z)] = phantom([
          worldCoordinate(grid, 0, x),
          worldCoordinate(grid, 1, y),
          worldCoordinate(grid, 2, z),
        ]);
}
export function inside(grid: Grid, point: Point) {
  return point.every((p, a) => Number.isFinite(p) && p >= lower(grid, a) && p <= -lower(grid, a));
}
export function fillOrientation(volume: Volume) {
  const c = volume.grid.count,
    denominator = c[0] - 1 + 2 * (c[1] - 1) + 4 * (c[2] - 1);
  for (let z = 0; z < c[2]; z++)
    for (let y = 0; y < c[1]; y++)
      for (let x = 0; x < c[0]; x++)
        volume.values[volume.index(x, y, z)] =
          denominator > 0 ? (x + 2 * y + 4 * z) / denominator : 0;
}
export function sampleNearest(volume: Volume, point: Point): number | null {
  if (!inside(volume.grid, point)) return null;
  const index = point.map((p, axis) =>
    Math.max(
      0,
      Math.min(volume.grid.count[axis] - 1, Math.floor(gridCoordinate(volume.grid, axis, p) + 0.5)),
    ),
  );
  return volume.voxel(index[0], index[1], index[2]);
}
export const clampPoint = (grid: Grid, point: Point): Point =>
  point.map((p, a) =>
    Math.max(worldCoordinate(grid, a, 0), Math.min(worldCoordinate(grid, a, grid.count[a] - 1), p)),
  ) as Point;
