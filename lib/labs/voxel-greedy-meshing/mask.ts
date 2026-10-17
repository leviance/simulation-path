import { blockAt, integer, type Work, type Rectangle } from "./model.ts";
import { validateChunk } from "../voxel-chunk/model.ts";
export function makeMask(chunk: Uint8Array, face: number, plane: number, slice = 15) {
  validateChunk(chunk);
  integer(face, 5, "face 0..5");
  integer(plane, 16, "plane 0..16");
  integer(slice, 15, "slice 0..15");
  const axis = Math.floor(face / 2),
    uAxis = (axis + 1) % 3,
    vAxis = (axis + 2) % 3;
  const sign = face % 2 === 0 ? 1 : -1;
  const mask = new Uint8Array(256);
  for (let v = 0; v < 16; v++)
    for (let u = 0; u < 16; u++) {
      const source = [0, 0, 0];
      source[axis] = plane - Number(sign > 0);
      source[uAxis] = u;
      source[vAxis] = v;
      const neighbor = [...source];
      neighbor[axis] += sign;
      const material = blockAt(chunk, source, slice);
      if (material !== 0 && blockAt(chunk, neighbor, slice) === 0) mask[v * 16 + u] = material;
    }
  return mask;
}
// Greedy is deterministic (v, then u; width before height), not a minimum-quad solver.
export function rectangles(
  input: Uint8Array,
  face: number,
  plane: number,
  merge = true,
  work: Work = { samples: 0, comparisons: 0 },
): Rectangle[] {
  if (input.length !== 256 || input.some((m) => m > 3))
    throw new RangeError("mask 16x16, material 0..3");
  integer(face, 5, "face 0..5");
  integer(plane, 16, "plane 0..16");
  const mask = input.slice(),
    result: Rectangle[] = [];
  for (let v = 0; v < 16; v++)
    for (let u = 0; u < 16; u++) {
      const material = mask[v * 16 + u];
      if (!material) continue;
      let width = 1,
        height = 1;
      if (merge) {
        while (u + width < 16) {
          work.comparisons++;
          if (mask[v * 16 + u + width] !== material) break;
          width++;
        }
        while (v + height < 16) {
          let matches = true;
          for (let du = 0; du < width; du++) {
            work.comparisons++;
            if (mask[(v + height) * 16 + u + du] !== material) {
              matches = false;
              break;
            }
          }
          if (!matches) break;
          height++;
        }
      }
      result.push({ face, plane, u, v, width, height, material });
      for (let dv = 0; dv < height; dv++)
        for (let du = 0; du < width; du++) mask[(v + dv) * 16 + u + du] = 0;
    }
  return result;
}
