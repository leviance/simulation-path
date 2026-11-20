import { coordinate, inside, Volume, type Vec3 } from "./model.ts";
export interface Contribution {
  voxel: Vec3;
  address: number;
  value: number;
  weight: number;
}
export function sampleNearest(volume: Volume, point: Vec3): number | undefined {
  if (!inside(volume.grid, point)) return undefined;
  const voxel = point.map((p, axis) =>
    Math.max(
      0,
      Math.min(volume.grid.size[axis] - 1, Math.floor(coordinate(volume.grid, p, axis) + 0.5)),
    ),
  ) as Vec3;
  return volume.at(...voxel);
}
export function linearStencil(volume: Volume, point: Vec3): Contribution[] | undefined {
  if (!inside(volume.grid, point)) return undefined;
  const lower: Vec3 = [0, 0, 0],
    upper: Vec3 = [0, 0, 0],
    fraction: Vec3 = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    const q = Math.max(
      0,
      Math.min(volume.grid.size[axis] - 1, coordinate(volume.grid, point[axis], axis)),
    );
    lower[axis] = Math.floor(q);
    upper[axis] = Math.min(lower[axis] + 1, volume.grid.size[axis] - 1);
    fraction[axis] = q - lower[axis];
  }
  const result: Contribution[] = [];
  for (let z = 0; z < 2; z++)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const corner = [x, y, z];
        const voxel: Vec3 = [...lower];
        let weight = 1;
        for (let axis = 0; axis < 3; axis++) {
          let axisWeight = 1 - fraction[axis];
          if (corner[axis] === 1) {
            voxel[axis] = upper[axis];
            axisWeight = fraction[axis];
          }
          weight *= axisWeight;
        }
        result.push({ voxel, address: volume.index(...voxel), value: volume.at(...voxel), weight });
      }
  return result;
}
export function sampleLinear(volume: Volume, point: Vec3) {
  if (!inside(volume.grid, point)) return undefined;
  const grid = volume.grid;
  const qx = Math.max(0, Math.min(grid.size[0] - 1, coordinate(grid, point[0], 0)));
  const qy = Math.max(0, Math.min(grid.size[1] - 1, coordinate(grid, point[1], 1)));
  const qz = Math.max(0, Math.min(grid.size[2] - 1, coordinate(grid, point[2], 2)));
  const x = Math.floor(qx),
    y = Math.floor(qy),
    z = Math.floor(qz);
  const x1 = Math.min(x + 1, grid.size[0] - 1),
    y1 = Math.min(y + 1, grid.size[1] - 1),
    z1 = Math.min(z + 1, grid.size[2] - 1);
  const fx = qx - x,
    fy = qy - y,
    fz = qz - z;
  const nx = grid.size[0],
    nxy = nx * grid.size[1],
    data = volume.values;
  // Seven lerps are algebraically the same eight weights shown by linearStencil.
  // This hot path does not allocate eight inspector objects for every image pixel.
  const v00 = data[x + nx * y + nxy * z] * (1 - fx) + data[x1 + nx * y + nxy * z] * fx;
  const v10 = data[x + nx * y1 + nxy * z] * (1 - fx) + data[x1 + nx * y1 + nxy * z] * fx;
  const v01 = data[x + nx * y + nxy * z1] * (1 - fx) + data[x1 + nx * y + nxy * z1] * fx;
  const v11 = data[x + nx * y1 + nxy * z1] * (1 - fx) + data[x1 + nx * y1 + nxy * z1] * fx;
  return (v00 * (1 - fy) + v10 * fy) * (1 - fz) + (v01 * (1 - fy) + v11 * fy) * fz;
}
export function axesFor(view: number) {
  if (!Number.isInteger(view) || view < 0 || view > 2)
    throw new RangeError("View must be XY, XZ or YZ");
  if (view === 1) return { horizontal: 0, vertical: 2, fixed: 1 };
  if (view === 2) return { horizontal: 1, vertical: 2, fixed: 0 };
  return { horizontal: 0, vertical: 1, fixed: 2 };
}
export function slicePoint(volume: Volume, view: number, u: number, v: number, probe: Vec3): Vec3 {
  const axes = axesFor(view),
    grid = volume.grid,
    point: Vec3 = [...probe];
  point[axes.horizontal] =
    grid.origin[axes.horizontal] + u * grid.spacing[axes.horizontal] * grid.size[axes.horizontal];
  point[axes.vertical] =
    grid.origin[axes.vertical] + v * grid.spacing[axes.vertical] * grid.size[axes.vertical];
  return point;
}
export function sampleSlice(
  volume: Volume,
  view: number,
  probe: Vec3,
  linear: boolean,
  resolution = 256,
) {
  if (!Number.isInteger(resolution) || resolution < 1 || resolution > 512)
    throw new RangeError("Slice resolution in [1,512]");
  const result = new Float32Array(resolution * resolution);
  const sampler = linear ? sampleLinear : sampleNearest;
  const axes = axesFor(view),
    grid = volume.grid,
    point: Vec3 = [...probe];
  for (let row = 0; row < resolution; row++)
    for (let column = 0; column < resolution; column++) {
      point[axes.horizontal] =
        grid.origin[axes.horizontal] +
        ((column + 0.5) / resolution) * grid.spacing[axes.horizontal] * grid.size[axes.horizontal];
      point[axes.vertical] =
        grid.origin[axes.vertical] +
        (1 - (row + 0.5) / resolution) * grid.spacing[axes.vertical] * grid.size[axes.vertical];
      result[column + row * resolution] = sampler(volume, point) ?? 0;
    }
  return result;
}
