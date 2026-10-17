import { index } from "../voxel-greedy-meshing/model.ts";
import { heightAt, materialAt, type TerrainConfig } from "./terrain.ts";
import type { Key } from "../voxel-chunk-streaming/coordinates.ts";
// Read columns independently of generateTerrain: catches local/global address and fill errors.
export function verifyColumns(key: Key, blocks: Uint8Array, config: TerrainConfig) {
  let errors = 0;
  for (let z = 0; z < 16; z++)
    for (let x = 0; x < 16; x++) {
      const height = heightAt(key.x * 16 + x, key.z * 16 + z, config);
      for (let y = 0; y < 16; y++)
        if (blocks[index(x, y, z)] !== materialAt(y, height, config)) errors++;
    }
  return errors;
}
