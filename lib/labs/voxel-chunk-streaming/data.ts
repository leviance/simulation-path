import { index, type Rectangle, type Triangle } from "../voxel-greedy-meshing/model.ts";
import { validateKey, type Key } from "./coordinates.ts";
export type Entry = {
  key: Key;
  blocks: Uint8Array;
  mesh: Triangle[];
  quads: Rectangle[];
  unitFaces: number;
  revision: number;
};
export type ChunkGenerator = (key: Key) => Uint8Array;
export function generateChunk(key: Key) {
  validateKey(key);
  const blocks = new Uint8Array(4096),
    top = 1 + ((((key.x + key.z) % 3) + 3) % 3);
  for (let y = 0; y < 4; y++)
    for (let z = 0; z < 16; z++)
      for (let x = 0; x < 16; x++) {
        let material = 2;
        if (y === 0) material = 3;
        if (y === 3) material = top;
        blocks[index(x, y, z)] = material;
      }
  return blocks;
}
export function hashChunk(blocks: Uint8Array) {
  let hash = 2166136261;
  for (const value of blocks) hash = Math.imul(hash ^ value, 16777619) >>> 0;
  return hash;
}
export function newEntry(key: Key, generate: ChunkGenerator = generateChunk): Entry {
  return {
    key: { ...key },
    blocks: generate(key),
    mesh: [],
    quads: [],
    unitFaces: 0,
    revision: 0,
  };
}
