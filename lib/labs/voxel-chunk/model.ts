export const side = 16;
export const capacity = side ** 3;
export type Vec3 = [number, number, number];
export type Color = [number, number, number, number];
export type Triangle = { points: [Vec3, Vec3, Vec3]; color: Color };
export type Preset = 0 | 1 | 2 | 3;
export const faces: Vec3[][] = [
  [
    [1, 0, 0],
    [1, 1, 0],
    [1, 1, 1],
    [1, 0, 1],
  ],
  [
    [0, 0, 1],
    [0, 1, 1],
    [0, 1, 0],
    [0, 0, 0],
  ],
  [
    [0, 1, 1],
    [1, 1, 1],
    [1, 1, 0],
    [0, 1, 0],
  ],
  [
    [0, 0, 0],
    [1, 0, 0],
    [1, 0, 1],
    [0, 0, 1],
  ],
  [
    [1, 0, 1],
    [1, 1, 1],
    [0, 1, 1],
    [0, 0, 1],
  ],
  [
    [0, 0, 0],
    [0, 1, 0],
    [1, 1, 0],
    [1, 0, 0],
  ],
];
export function index(x: number, y: number, z: number) {
  if (![x, y, z].every((v) => Number.isInteger(v) && v >= 0 && v < side))
    throw new RangeError("coordinate 0..15");
  return x + side * (z + side * y);
}
export function makeChunk(preset: Preset) {
  if (![0, 1, 2, 3].includes(preset)) throw new RangeError("preset 0..3");
  const chunk = new Uint8Array(capacity);
  if (preset === 0) chunk[index(7, 7, 7)] = 3;
  if (preset === 1) chunk.fill(3);
  if (preset === 2)
    for (let y = 0; y < 16; y++)
      for (let z = 0; z < 16; z++)
        for (let x = 0; x < 16; x++) {
          const height = 4 + Math.floor(x / 4);
          if (y < height) {
            let block = 3;
            if (y >= height - 3) block = 2;
            if (y === height - 1) block = 1;
            chunk[index(x, y, z)] = block;
          }
        }
  return chunk;
}
export function solidCount(chunk: Uint8Array) {
  validateChunk(chunk);
  return chunk.reduce((n, b) => n + Number(b !== 0), 0);
}
export function validateChunk(chunk: Uint8Array) {
  if (chunk.length !== capacity || chunk.some((b) => b > 3)) throw new RangeError("invalid chunk");
}
export function faceColor(material: number, face: number, stage = 7): Color {
  let color = [130, 180, 230];
  if (stage >= 4)
    color = [
      [0, 0, 0],
      [100, 190, 90],
      [170, 115, 75],
      [150, 160, 180],
    ][material];
  if (!color || !Number.isInteger(face) || face < 0 || face > 5)
    throw new RangeError("material/face");
  const factor = [0.85, 0.65, 1, 0.5, 0.75, 0.6][face];
  return [
    Math.trunc(color[0] * factor),
    Math.trunc(color[1] * factor),
    Math.trunc(color[2] * factor),
    255,
  ];
}
export function appendCube(mesh: Triangle[], origin: Vec3, material: number, stage = 7) {
  const corners = [0, 1, 2, 0, 2, 3];
  for (let face = 0; face < 6; face++)
    for (let t = 0; t < 2; t++) {
      const points = corners
        .slice(t * 3, t * 3 + 3)
        .map((c) => faces[face][c].map((v, i) => v + origin[i]) as Vec3) as [Vec3, Vec3, Vec3];
      mesh.push({ points, color: faceColor(material, face, stage) });
    }
}
export function buildMesh(chunk: Uint8Array, slice = 15, stage = 7) {
  validateChunk(chunk);
  if (!Number.isInteger(slice) || slice < 0 || slice >= 16) throw new RangeError("slice 0..15");
  const mesh: Triangle[] = [];
  for (let y = 0; y < 16; y++) {
    if (stage >= 6 && y > slice) continue;
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        const block = chunk[index(x, y, z)];
        if (block !== 0) appendCube(mesh, [x, y, z], block, stage);
      }
  }
  return mesh;
}
export function pickCell(x: number, z: number, slice: number): Vec3 | null {
  if (
    ![x, z].every(Number.isFinite) ||
    x < 0 ||
    z < 0 ||
    x >= 256 ||
    z >= 256 ||
    !Number.isInteger(slice) ||
    slice < 0 ||
    slice > 15
  )
    return null;
  return [Math.floor(x / 16), slice, Math.floor(z / 16)];
}
