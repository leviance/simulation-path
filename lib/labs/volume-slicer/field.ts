import { centre, makeGrid, Volume, type Vec3 } from "./model.ts";
import { geodeField } from "./geode.ts";
export { geodeCentre, geodeField } from "./geode.ts";
export const presets = ["specimen", "sphere", "gaussian", "layers", "ramp"] as const;
export type Preset = (typeof presets)[number];
export const presetNames = [
  "Đá mã não có hốc tinh thể",
  "Quả cầu",
  "Gaussian",
  "Các lớp theo z",
  "Ramp kiểm hướng trục",
];
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
  return geodeField(p);
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
