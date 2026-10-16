import {
  index,
  capacity,
  side,
  faces,
  faceColor,
  type Vec3,
  type Triangle,
} from "../voxel-chunk/model.ts";
export { index, capacity, side, faces, faceColor, type Vec3, type Triangle };
export type Preset = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export const presetNames = [
  "Một block",
  "Hai block kề nhau",
  "Khối đặc 16³",
  "Khoang Air kín",
  "Checker 3D",
  "Toàn Air",
  "Đất bậc thang",
];
export function makeChunk(preset: Preset, stage = 8) {
  if (!Number.isInteger(preset) || preset < 0 || preset > 6) throw new RangeError("preset 0..6");
  const chunk = new Uint8Array(capacity);
  if (preset === 0 || preset === 1) chunk[index(7, 7, 7)] = 3;
  if (preset === 1) chunk[index(8, 7, 7)] = 1;
  if (preset === 2) chunk.fill(3);
  if (stage >= 4 && preset === 3) {
    chunk.fill(3);
    chunk[index(8, 8, 8)] = 0;
  }
  if (stage >= 4 && (preset === 4 || preset === 6))
    for (let y = 0; y < 16; y++)
      for (let z = 0; z < 16; z++)
        for (let x = 0; x < 16; x++) {
          if (preset === 4 && (x + y + z) % 2 === 0) chunk[index(x, y, z)] = 3;
          const height = 4 + Math.floor(x / 4);
          if (preset === 6 && y < height) {
            let material = 3;
            if (y >= height - 3) material = 2;
            if (y === height - 1) material = 1;
            chunk[index(x, y, z)] = material;
          }
        }
  return chunk;
}
export function effectiveSlice(slice: number, stage = 8) {
  if (!Number.isInteger(slice) || slice < 0 || slice > 15) throw new RangeError("slice 0..15");
  return stage >= 5 ? slice : 15;
}
export const inside = (x: number, y: number, z: number) =>
  [x, y, z].every((v) => Number.isInteger(v) && v >= 0 && v < 16);
export const offsets: Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
export const faceNames = ["+X", "−X", "+Y", "−Y", "+Z", "−Z"];
