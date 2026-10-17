import {
  makeChunk as previousChunk,
  type Preset as PreviousPreset,
} from "../voxel-hidden-faces/model.ts";
export {
  index,
  side,
  capacity,
  faceColor,
  type Triangle,
  type Vec3,
} from "../voxel-chunk/model.ts";
export { faceNames } from "../voxel-hidden-faces/model.ts";
import { index } from "../voxel-chunk/model.ts";
export type Preset = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export const presetNames = [
  "Một block",
  "Hai vật liệu kề nhau",
  "Khối đặc 16³",
  "Khoang Air kín",
  "Checker 3D",
  "Toàn Air",
  "Đất bậc thang",
  "Tường sọc vật liệu",
  "Mask 4×4 của bài 04",
];
export function makeChunk(preset: Preset) {
  if (!Number.isInteger(preset) || preset < 0 || preset > 8) throw new RangeError("preset 0..8");
  if (preset < 7) return previousChunk(preset as PreviousPreset);
  const chunk = new Uint8Array(4096);
  if (preset === 8) {
    const rows = [
      [3, 3, 1, 0],
      [3, 3, 1, 0],
      [3, 0, 1, 1],
      [0, 0, 0, 1],
    ];
    rows.forEach((row, v) =>
      row.forEach((material, u) => {
        chunk[index(v, 15, u)] = material;
      }),
    );
    return chunk;
  }
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 16; x++) chunk[index(x, y, 8)] = 1 + (Math.floor(x / 4) % 3);
  return chunk;
}
export function integer(value: number, max: number, label: string) {
  if (!Number.isInteger(value) || value < 0 || value > max) throw new RangeError(label);
}
export function blockAt(chunk: Uint8Array, p: number[], slice: number) {
  if (p.some((v) => v < 0 || v >= 16) || p[1] > slice) return 0;
  return chunk[index(p[0], p[1], p[2])];
}
export type Rectangle = {
  face: number;
  plane: number;
  u: number;
  v: number;
  width: number;
  height: number;
  material: number;
};
export type Work = { samples: number; comparisons: number };
