import { Volume, inside, gridCoordinate, worldCoordinate, type Point } from "./model.ts";
function linearCell(volume: Volume, point: Point) {
  const low: Point = [0, 0, 0],
    high: Point = [0, 0, 0],
    fraction: Point = [0, 0, 0];
  for (let axis = 0; axis < 3; axis++) {
    const coordinate = Math.max(
      0,
      Math.min(volume.grid.count[axis] - 1, gridCoordinate(volume.grid, axis, point[axis])),
    );
    low[axis] = Math.floor(coordinate);
    high[axis] = Math.min(low[axis] + 1, volume.grid.count[axis] - 1);
    fraction[axis] = coordinate - low[axis];
  }
  return { low, high, fraction };
}
export function sampleLinear(volume: Volume, point: Point): number | null {
  if (!inside(volume.grid, point)) return null;
  const { low, high, fraction } = linearCell(volume, point);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const c00 = lerp(
    volume.voxel(low[0], low[1], low[2]),
    volume.voxel(high[0], low[1], low[2]),
    fraction[0],
  );
  const c10 = lerp(
    volume.voxel(low[0], high[1], low[2]),
    volume.voxel(high[0], high[1], low[2]),
    fraction[0],
  );
  const c01 = lerp(
    volume.voxel(low[0], low[1], high[2]),
    volume.voxel(high[0], low[1], high[2]),
    fraction[0],
  );
  const c11 = lerp(
    volume.voxel(low[0], high[1], high[2]),
    volume.voxel(high[0], high[1], high[2]),
    fraction[0],
  );
  const c0 = lerp(c00, c10, fraction[1]);
  const c1 = lerp(c01, c11, fraction[1]);
  return lerp(c0, c1, fraction[2]);
}

// Inspector-only trace; the image sampler does not allocate corner records per pixel.
export function linearStencil(volume: Volume, point: Point) {
  if (!inside(volume.grid, point)) return null;
  const { low, high, fraction } = linearCell(volume, point);
  const corners = [];
  for (let z = 0; z < 2; z++)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 2; x++) {
        const bits: Point = [x, y, z];
        const index = bits.map((bit, a) => (bit ? high[a] : low[a])) as Point;
        const weight = bits.reduce((w, bit, a) => w * (bit ? fraction[a] : 1 - fraction[a]), 1);
        const value = volume.voxel(...index);
        corners.push({ bits, index, weight, value, contribution: weight * value });
      }
  return {
    low,
    high,
    fraction,
    corners,
    value: corners.reduce((sum, c) => sum + c.contribution, 0),
  };
}
export const affine = (p: Point) => 0.2 + 0.1 * p[0] + 0.2 * p[1] + 0.15 * p[2];
export function auditVolume(volume: Volume) {
  const report = { checks: 0, failures: 0, residual: 0, minimum: Infinity, maximum: -Infinity };
  const check = (condition: boolean) => {
    report.checks++;
    if (!condition) report.failures++;
  };
  let expectedSamples = 1;
  let validShape = true;
  for (let axis = 0; axis < 3; axis++) {
    if (
      !Number.isInteger(volume.grid.count[axis]) ||
      volume.grid.count[axis] < 1 ||
      volume.grid.count[axis] > 128 ||
      !Number.isFinite(volume.grid.spacing[axis]) ||
      volume.grid.spacing[axis] <= 0
    ) {
      validShape = false;
      break;
    }
    expectedSamples *= volume.grid.count[axis];
  }
  check(validShape && volume.values.length === expectedSamples);
  for (const value of volume.values) {
    check(Number.isFinite(value) && value >= 0 && value <= 1);
    report.minimum = Math.min(report.minimum, value);
    report.maximum = Math.max(report.maximum, value);
  }
  const oracle = new Volume({ count: [4, 3, 5], spacing: [0.2, 0.3, 0.4] });
  for (let z = 0; z < 5; z++)
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 4; x++)
        oracle.values[oracle.index(x, y, z)] = affine([
          worldCoordinate(oracle.grid, 0, x),
          worldCoordinate(oracle.grid, 1, y),
          worldCoordinate(oracle.grid, 2, z),
        ]);
  for (let i = 0; i < 16; i++) {
    const point: Point = [
      worldCoordinate(oracle.grid, 0, 0.2 + 0.15 * i),
      worldCoordinate(oracle.grid, 1, 0.25 + 0.1 * i),
      worldCoordinate(oracle.grid, 2, 0.4 + 0.2 * i),
    ];
    const sampled = sampleLinear(oracle, point);
    check(sampled !== null);
    if (sampled !== null) {
      const error = Math.abs(sampled - affine(point));
      report.residual = Math.max(report.residual, error);
      check(error <= 1e-12);
    }
  }
  return report;
}
