import { appendCube, validateChunk } from "../voxel-chunk/model.ts";
import {
  index,
  faces,
  faceColor,
  inside,
  offsets,
  effectiveSlice,
  makeChunk,
  type Vec3,
  type Triangle,
  type Preset,
} from "./model.ts";
export type FaceKey = [number, number, number, number];
export type BuildResult = {
  mesh: Triangle[];
  keys: FaceKey[];
  solid: number;
  neighborChecks: number;
};
export function appendFace(mesh: Triangle[], origin: Vec3, material: number, face: number) {
  if (!Number.isInteger(face) || face < 0 || face > 5) throw new RangeError("face 0..5");
  const corners = [0, 1, 2, 0, 2, 3];
  for (let t = 0; t < 2; t++) {
    const points = corners
      .slice(t * 3, t * 3 + 3)
      .map((c) => faces[face][c].map((v, i) => v + origin[i]) as Vec3) as [Vec3, Vec3, Vec3];
    mesh.push({ points, color: faceColor(material, face) });
  }
}
export function activeSolid(
  chunk: Uint8Array,
  x: number,
  y: number,
  z: number,
  slice: number,
  stage = 8,
) {
  const top = effectiveSlice(slice, stage);
  return inside(x, y, z) && y <= top && chunk[index(x, y, z)] !== 0;
}
export function keepFace(
  chunk: Uint8Array,
  x: number,
  y: number,
  z: number,
  face: number,
  slice: number,
  stage = 8,
) {
  if (!Number.isInteger(face) || face < 0 || face > 5) throw new RangeError("face 0..5");
  const d = offsets[face];
  return !activeSolid(chunk, x + d[0], y + d[1], z + d[2], slice, stage);
}
export function buildMesh(chunk: Uint8Array, culled: boolean, slice = 15, stage = 8): BuildResult {
  validateChunk(chunk);
  const top = effectiveSlice(slice, stage);
  const result: BuildResult = { mesh: [], keys: [], solid: 0, neighborChecks: 0 };
  if (stage === 0) return result;
  for (let y = 0; y <= top; y++)
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        const block = chunk[index(x, y, z)];
        if (block === 0) continue;
        result.solid++;
        if (stage < 3) appendCube(result.mesh, [x, y, z], block);
        for (let face = 0; face < 6; face++) {
          if (culled && stage >= 3) {
            result.neighborChecks++;
            if (!keepFace(chunk, x, y, z, face, slice, stage)) continue;
          }
          if (stage >= 3) appendFace(result.mesh, [x, y, z], block, face);
          result.keys.push([x, y, z, face]);
        }
      }
  return result;
}
export type Inspection = {
  sourceSolid: boolean;
  neighbor: Vec3;
  neighborSolid: boolean;
  kept: boolean;
  reason: string;
};
export function inspectFace(
  chunk: Uint8Array,
  selected: Vec3,
  face: number,
  slice: number,
): Inspection {
  if (!inside(...selected) || !Number.isInteger(face) || face < 0 || face > 5)
    throw new RangeError("inspection input");
  const neighbor = selected.map((v, i) => v + offsets[face][i]) as Vec3;
  const sourceSolid = activeSolid(chunk, ...selected, slice),
    neighborSolid = activeSolid(chunk, ...neighbor, slice);
  let reason = "Giữ: ô bên kia là Air";
  if (!sourceSolid) reason = "Không có mặt: block nguồn là Air hoặc ngoài lớp cắt";
  else if (!inside(...neighbor)) reason = "Giữ: ngoài chunk đơn lẻ";
  else if (neighbor[1] > slice) reason = "Giữ: ô bên kia nằm trên mặt cắt hiển thị";
  else if (neighborSolid) reason = "Bỏ: ô bên kia là block opaque";
  return { sourceSolid, neighbor, neighborSolid, kept: sourceSolid && !neighborSolid, reason };
}
// Oracle dùng số cặp vô hướng theo ba chiều dương, không gọi keepFace.
export function oracleFaces(chunk: Uint8Array, slice: number) {
  validateChunk(chunk);
  const top = effectiveSlice(slice);
  let solid = 0,
    pairs = 0;
  for (let y = 0; y <= top; y++)
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        if (chunk[index(x, y, z)] === 0) continue;
        solid++;
        if (x + 1 < 16 && chunk[index(x + 1, y, z)] !== 0) pairs++;
        if (y + 1 <= top && chunk[index(x, y + 1, z)] !== 0) pairs++;
        if (z + 1 < 16 && chunk[index(x, y, z + 1)] !== 0) pairs++;
      }
  return 6 * solid - 2 * pairs;
}
export function audit() {
  const expected = [6, 10, 1536, 1542, 12288, 0, 912];
  for (let p = 0; p < 7; p++) {
    const chunk = makeChunk(p as Preset),
      before = chunk.slice();
    for (const slice of [0, 7, 15]) {
      const r = buildMesh(chunk, true, slice);
      if (
        r.keys.length !== oracleFaces(chunk, slice) ||
        r.mesh.length !== r.keys.length * 2 ||
        new Set(r.keys.map((k) => k.join(","))).size !== r.keys.length ||
        chunk.some((b, i) => b !== before[i])
      )
        throw new Error("voxel face oracle failed");
      if (slice === 15 && r.keys.length !== expected[p])
        throw new Error("preset face count failed");
    }
  }
  return "PASS: 7 preset × 3 lớp; F=6N−2E, không trùng mặt, không sửa dữ liệu.";
}
