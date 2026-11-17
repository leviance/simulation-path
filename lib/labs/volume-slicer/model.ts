export type Point = [number, number, number];
export interface Grid {
  count: [number, number, number];
  spacing: Point;
}
export function makeGrid(side: number): Grid {
  if (side !== 64 && side !== 128) throw new RangeError("Viewer resolution must be 64 or 128");
  return { count: [side, side, side], spacing: [3.2 / side, 3.84 / side, 4.8 / side] };
}
export const defaultGrid = makeGrid(64);
export const lower = (grid: Grid, axis: number) => (-grid.count[axis] * grid.spacing[axis]) / 2;
export const worldCoordinate = (grid: Grid, axis: number, index: number) =>
  lower(grid, axis) + (index + 0.5) * grid.spacing[axis];
export const gridCoordinate = (grid: Grid, axis: number, world: number) =>
  (world - lower(grid, axis)) / grid.spacing[axis] - 0.5;
export const initialPoint = (grid = defaultGrid): Point => clampPoint(grid, [0, 0, 0]);
export function axesFor(view: number) {
  if (view === 1) return { horizontal: 0, vertical: 2, cut: 1 };
  if (view === 2) return { horizontal: 1, vertical: 2, cut: 0 };
  return { horizontal: 0, vertical: 1, cut: 2 };
}
export const viewNames = ["XY — giữ z", "XZ — giữ y", "YZ — giữ x"];
export function gaussian(point: Point, centre: Point, radius: Point) {
  let q = 0;
  for (let axis = 0; axis < 3; axis++) {
    const d = (point[axis] - centre[axis]) / radius[axis];
    q += d * d;
  }
  return Math.exp(-q);
}
export function phantom(point: Point) {
  const q = [Math.abs(point[0]) - 0.98, Math.abs(point[1]) - 1.12, Math.abs(point[2]) - 1.5];
  const distance =
    Math.hypot(Math.max(0, q[0]), Math.max(0, q[1]), Math.max(0, q[2])) +
    Math.min(0, Math.max(...q)) -
    0.2;
  if (distance >= 0.07) return 0;
  const t = Math.max(0, Math.min(1, (0.07 - distance) / 0.13));
  const support = t * t * (3 - 2 * t);
  const shell = 0.22 * Math.exp((-distance * distance) / 0.008);
  const theta = ((point[2] + 1.5) * Math.PI * 2) / 1.1;
  const wire =
    0.52 *
    Math.exp(
      -((point[0] - 0.58 * Math.cos(theta)) ** 2 + (point[1] - 0.58 * Math.sin(theta)) ** 2) /
        0.018,
    );
  const hole = 0.4 * Math.exp(-((point[0] + 0.25) ** 2 + (point[1] + 0.12) ** 2) / 0.055);
  const marker = 0.3 * gaussian(point, [0.55, 0.58, -0.7], [0.22, 0.25, 0.3]);
  return Math.max(0, Math.min(1, (0.4 + shell + wire + marker - hole) * support));
}
export const presetNames = ["Khối vật liệu", "Sphere", "Gaussian", "Layers", "Axis ramp"] as const;
export type Preset = "phantom" | "sphere" | "gaussian" | "layers" | "ramp";
export const presets: Preset[] = ["phantom", "sphere", "gaussian", "layers", "ramp"];
export function fieldValue(point: Point, preset: Preset) {
  if (preset === "sphere") return point[0] ** 2 + point[1] ** 2 + point[2] ** 2 <= 1 ? 1 : 0;
  if (preset === "gaussian") return gaussian(point, [0, 0, 0], [0.85, 0.85, 0.85]);
  if (preset === "layers") {
    if (point[2] < -0.8) return 0.15;
    if (point[2] < 0.8) return 0.5;
    return 0.85;
  }
  return phantom(point);
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
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      !Number.isInteger(z) ||
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
export function fillVolume(volume: Volume, preset: Preset) {
  const grid = volume.grid;
  const denominator = grid.count[0] - 1 + 2 * (grid.count[1] - 1) + 4 * (grid.count[2] - 1);
  for (let z = 0; z < grid.count[2]; z++)
    for (let y = 0; y < grid.count[1]; y++)
      for (let x = 0; x < grid.count[0]; x++) {
        let value = 0;
        if (preset === "ramp") {
          if (denominator > 0) value = (x + 2 * y + 4 * z) / denominator;
        } else {
          value = fieldValue(
            [worldCoordinate(grid, 0, x), worldCoordinate(grid, 1, y), worldCoordinate(grid, 2, z)],
            preset,
          );
        }
        volume.values[volume.index(x, y, z)] = value;
      }
}
export const fillPhantom = (volume: Volume) => fillVolume(volume, "phantom");
export const fillOrientation = (volume: Volume) => fillVolume(volume, "ramp");
export function inside(grid: Grid, point: Point) {
  return point.every((p, a) => Number.isFinite(p) && p >= lower(grid, a) && p <= -lower(grid, a));
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
