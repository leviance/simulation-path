import { Volume, centre, voxelCount, type Grid } from "./model.ts";
import { sampleLinear } from "./sampling.ts";
export function measure(volume: Volume) {
  if (volume.values.length !== voxelCount(volume.grid)) throw new RangeError("Storage mismatch");
  const bins = new Uint32Array(64);
  let minimum = Infinity,
    maximum = -Infinity,
    sum = 0;
  for (const scalar of volume.values) {
    if (!Number.isFinite(scalar)) throw new RangeError("Nonfinite volume");
    minimum = Math.min(minimum, scalar);
    maximum = Math.max(maximum, scalar);
    sum += scalar;
    bins[Math.max(0, Math.min(63, Math.floor(Math.max(0, Math.min(1, scalar)) * 64)))]++;
  }
  return { bins, count: volume.values.length, minimum, maximum, mean: sum / volume.values.length };
}
export function audit(volume: Volume) {
  measure(volume);
  const grid: Grid = { size: [3, 2, 4], origin: [-1, -2, -3], spacing: [2, 4, 6] };
  const fixture = new Volume(grid);
  for (let z = 0; z < 4; z++)
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 3; x++) fixture.set(x, y, z, x + 10 * y + 100 * z);
  let residual = 0,
    failures = 0;
  for (let trial = 0; trial < 12; trial++) {
    const x = 0.1 + trial * 0.15,
      y = 0.05 + trial * 0.08,
      z = 0.2 + trial * 0.21;
    const point = centre(grid, x, y, z);
    const error = Math.abs(sampleLinear(fixture, point)! - (x + 10 * y + 100 * z));
    residual = Math.max(residual, error);
    if (error > 1e-10) failures++;
  }
  return { checks: 13, failures, residual };
}
