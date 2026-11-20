import { centre, makeGrid, Volume, type Vec3 } from "./model.ts";
export const presets = ["specimen", "sphere", "gaussian", "layers", "ramp"] as const;
export type Preset = (typeof presets)[number];
export const presetNames = [
  "Mẫu vật có lỗ khoan",
  "Quả cầu",
  "Gaussian",
  "Các lớp theo z",
  "Ramp kiểm hướng trục",
];
const square = (x: number) => x * x;
export function sphereField(p: Vec3) {
  return p[0] ** 2 + p[1] ** 2 + p[2] ** 2 <= 3600 ? 1 : 0;
}
export function fieldValue(preset: Preset, p: Vec3) {
  const [x, y, z] = p;
  if (preset === "sphere") return sphereField(p);
  if (preset === "gaussian") return Math.exp(-(x * x + y * y + z * z) / 1800);
  if (preset === "layers") {
    if (z < -48) return 0.22;
    if (z < -12) return 0.48;
    if (z < 30) return 0.86;
    if (z < 68) return 0.38;
    return 0.64;
  }
  if (preset === "ramp")
    return 0.1 + (0.2 * (x + 80)) / 160 + (0.3 * (y + 96)) / 192 + (0.4 * (z + 112)) / 224;
  const q = Math.sqrt(square(x / 70) + square(y / 82) + square(z / 96));
  if (q > 1) return 0;
  const boreX = x - 15 * Math.sin(z / 26),
    boreY = y - 0.22 * z - 8;
  if (boreX * boreX + boreY * boreY < 7.5 ** 2) return 0.02;
  if (square((y + 27) / 10) + square((z - 15) / 13) < 1) return 0.02;
  if (q > 0.87) {
    const t = Math.max(0, Math.min(1, (1 - q) / 0.08));
    return 0.58 * t * t * (3 - 2 * t);
  }
  const coreA = square((x + 24) / 19) + square((y - 21) / 28) + square((z + 24) / 31);
  const coreB = square((x - 25) / 22) + square((y + 10) / 20) + square((z - 26) / 27);
  if (coreA < 1) return 0.93 - 0.12 * coreA;
  if (coreB < 1) return 0.7 - 0.12 * coreB;
  return 0.25 + 0.055 * Math.cos(5 * q);
}
export function fillSlab(volume: Volume, preset: Preset, begin: number, end: number) {
  const [nx, ny, nz] = volume.grid.size;
  if (begin < 0 || end > nz || begin > end) throw new RangeError("Invalid slab");
  for (let z = begin; z < end; z++)
    for (let y = 0; y < ny; y++)
      for (let x = 0; x < nx; x++)
        volume.set(x, y, z, fieldValue(preset, centre(volume.grid, x, y, z)));
}
export function buildVolume(preset: Preset, side: number) {
  if (!presets.includes(preset)) throw new RangeError("Unknown preset");
  const volume = new Volume(makeGrid(side));
  fillSlab(volume, preset, 0, side);
  return volume;
}
