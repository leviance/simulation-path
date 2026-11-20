import { presets, type Point, type Preset } from "./model.ts";
import { cloudDensity } from "./cloud.ts";
export interface Volume {
  readonly side: number;
  readonly values: Float32Array;
}
export function allocateVolume(side: number): Volume {
  if (!Number.isInteger(side) || side < 1 || side > 128)
    throw new RangeError("Volume side 1..128 before allocation");
  return Object.freeze({ side, values: new Float32Array(side * side * side) });
}
export function centre(volume: Volume, x: number, y: number, z: number): Point {
  index(volume, x, y, z);
  return [
    -1 + ((x + 0.5) * 2) / volume.side,
    -1 + ((y + 0.5) * 2) / volume.side,
    -1 + ((z + 0.5) * 2) / volume.side,
  ];
}
export function index(volume: Volume, x: number, y: number, z: number) {
  if (
    ![x, y, z].every(Number.isInteger) ||
    x < 0 ||
    y < 0 ||
    z < 0 ||
    x >= volume.side ||
    y >= volume.side ||
    z >= volume.side
  )
    throw new RangeError("Voxel outside volume");
  return x + volume.side * (y + volume.side * z);
}
function gaussian(
  x: number,
  y: number,
  z: number,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
) {
  const dx = (x - cx) / rx,
    dy = (y - cy) / ry,
    dz = (z - cz) / rz;
  return Math.exp(-(dx * dx + dy * dy + dz * dz));
}
export function fieldValue(x: number, y: number, z: number, preset: Preset) {
  if (preset === "empty") return 0;
  if (preset === "constant") return 0.25;
  if (preset === "slab") return Math.abs(z) < 0.375 ? 0.65 : 0;
  if (preset === "cores")
    return Math.min(
      1,
      0.14 * gaussian(x, y, z, 0, 0, 0, 0.75, 0.8, 0.7) +
        0.9 * gaussian(x, y, z, -0.28, 0.17, 0.1, 0.18, 0.34, 0.22) +
        0.8 * gaussian(x, y, z, 0.29, -0.22, -0.12, 0.27, 0.19, 0.32),
    );
  return cloudDensity(x, y, z);
}
export function fillSlab(volume: Volume, preset: Preset, z: number) {
  const n = volume.side;
  if (!Number.isInteger(z) || z < 0 || z >= n) throw new RangeError("Slab outside volume");
  if (preset === "constant" || preset === "empty") {
    volume.values.fill(preset === "constant" ? 0.25 : 0, z * n * n, (z + 1) * n * n);
    return;
  }
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      let density: number;
      if (preset === "ramp") density = n > 1 ? (x + 2 * y + 4 * z) / (7 * (n - 1)) : 0;
      else
        density = fieldValue(
          -1 + ((x + 0.5) * 2) / n,
          -1 + ((y + 0.5) * 2) / n,
          -1 + ((z + 0.5) * 2) / n,
          preset,
        );
      volume.values[x + n * (y + n * z)] = density;
    }
}
export function makeVolume(preset: Preset, side = 128) {
  if (!presets.includes(preset)) throw new RangeError("Unknown dataset");
  const volume = allocateVolume(side);
  for (let z = 0; z < side; z++) fillSlab(volume, preset, z);
  return volume;
}

// Hot path: seven lerps, no eight-contribution objects per sample.
export function sampleFast(volume: Volume, x: number, y: number, z: number) {
  const n = volume.side,
    values = volume.values;
  const qx = Math.max(0, Math.min(n - 1, (x + 1) * 0.5 * n - 0.5));
  const qy = Math.max(0, Math.min(n - 1, (y + 1) * 0.5 * n - 0.5));
  const qz = Math.max(0, Math.min(n - 1, (z + 1) * 0.5 * n - 0.5));
  const x0 = Math.floor(qx),
    y0 = Math.floor(qy),
    z0 = Math.floor(qz);
  const x1 = Math.min(n - 1, x0 + 1),
    y1 = Math.min(n - 1, y0 + 1),
    z1 = Math.min(n - 1, z0 + 1);
  const fx = qx - x0,
    fy = qy - y0,
    fz = qz - z0;
  const a = y0 * n + z0 * n * n,
    b = y1 * n + z0 * n * n,
    c = y0 * n + z1 * n * n,
    d = y1 * n + z1 * n * n;
  const ab0 = values[x0 + a] * (1 - fx) + values[x1 + a] * fx,
    ab1 = values[x0 + b] * (1 - fx) + values[x1 + b] * fx;
  const cd0 = values[x0 + c] * (1 - fx) + values[x1 + c] * fx,
    cd1 = values[x0 + d] * (1 - fx) + values[x1 + d] * fx;
  return (ab0 * (1 - fy) + ab1 * fy) * (1 - fz) + (cd0 * (1 - fy) + cd1 * fy) * fz;
}
export function sampleDensity(volume: Volume, point: Point) {
  if (!point.every(Number.isFinite)) throw new RangeError("Nonfinite sample position");
  const result = sampleFast(volume, ...point);
  if (!Number.isFinite(result)) throw new RangeError("Nonfinite volume sample");
  return result;
}
export function histogram(volume: Volume) {
  if (volume.values.length !== volume.side ** 3) throw new RangeError("Storage/grid mismatch");
  const bins = new Uint32Array(32);
  for (const value of volume.values) {
    if (!Number.isFinite(value) || value < 0 || value > 1)
      throw new RangeError("Density outside [0,1]");
    bins[Math.min(31, Math.floor(value * 32))]++;
  }
  return bins;
}
