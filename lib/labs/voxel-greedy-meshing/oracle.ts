import { index, type Rectangle } from "./model.ts";
import { validateChunk } from "../voxel-chunk/model.ts";
import { integer } from "./model.ts";
// Enumerate occupied cells and their six neighbors, independently of mask construction.
export function expectedFaces(chunk: Uint8Array, slice = 15) {
  validateChunk(chunk);
  integer(slice, 15, "slice 0..15");
  const keys: string[] = [],
    offsets = [
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ];
  for (let y = 0; y <= slice; y++)
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        const material = chunk[index(x, y, z)];
        if (!material) continue;
        offsets.forEach((d, face) => {
          const n = [x + d[0], y + d[1], z + d[2]];
          const outside =
            n[0] < 0 || n[0] >= 16 || n[1] < 0 || n[1] > slice || n[2] < 0 || n[2] >= 16;
          if (!outside && chunk[index(n[0], n[1], n[2])] !== 0) return;
          keys.push(`${x},${y},${z},${face},${material}`);
        });
      }
  return keys.sort();
}
export function expandedFaces(quads: Rectangle[]) {
  const keys: string[] = [];
  for (const r of quads) {
    integer(r.face, 5, "face");
    integer(r.plane, 16, "plane");
    integer(r.u, 15, "u");
    integer(r.v, 15, "v");
    if (
      !Number.isInteger(r.width) ||
      !Number.isInteger(r.height) ||
      r.width < 1 ||
      r.height < 1 ||
      r.u + r.width > 16 ||
      r.v + r.height > 16 ||
      !Number.isInteger(r.material) ||
      r.material < 1 ||
      r.material > 3
    )
      throw new RangeError("invalid rectangle");
    const axis = Math.floor(r.face / 2),
      uAxis = (axis + 1) % 3,
      vAxis = (axis + 2) % 3;
    for (let v = 0; v < r.height; v++)
      for (let u = 0; u < r.width; u++) {
        const p = [0, 0, 0];
        p[axis] = r.plane - Number(r.face % 2 === 0);
        p[uAxis] = r.u + u;
        p[vAxis] = r.v + v;
        index(p[0], p[1], p[2]);
        keys.push(`${p.join(",")},${r.face},${r.material}`);
      }
  }
  return keys.sort();
}
export function verify(chunk: Uint8Array, quads: Rectangle[], slice = 15) {
  const expected = expectedFaces(chunk, slice),
    actual = expandedFaces(quads);
  if (expected.length !== actual.length || expected.some((key, i) => key !== actual[i]))
    throw new Error("oriented material coverage mismatch");
  return expected.length;
}
