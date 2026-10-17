import { index } from "../voxel-greedy-meshing/model.ts";
import { validateKey, type Key } from "../voxel-chunk-streaming/coordinates.ts";
import { latticeValue, valueNoise } from "./noise.ts";
export type TerrainConfig = { seed: number; scale: number; octaves: number; stage: number };
export const defaultConfig: TerrainConfig = { seed: 42, scale: 32, octaves: 3, stage: 9 };
export function validateConfig(config: TerrainConfig) {
  if (
    !Number.isInteger(config.seed) ||
    config.seed < 0 ||
    config.seed > 65535 ||
    ![16, 32, 64].includes(config.scale) ||
    !Number.isInteger(config.octaves) ||
    config.octaves < 1 ||
    config.octaves > 4 ||
    !Number.isInteger(config.stage) ||
    config.stage < 0 ||
    config.stage > 9
  )
    throw new RangeError("seed 0..65535, scale 16/32/64, octaves 1..4, stage 0..9");
}
export function terrainSignal(x: number, z: number, config: TerrainConfig) {
  validateConfig(config);
  if (![x, z].every((v) => Number.isFinite(v) && Math.abs(v) <= 2048))
    throw new RangeError("world -2048..2048");
  if (config.stage < 2) return 0;
  if (config.stage === 2) return Math.sin(x / 16) * Math.cos(z / 16);
  if (config.stage === 3)
    return latticeValue(Math.floor(x / config.scale), Math.floor(z / config.scale), config.seed);
  if (config.stage === 4) return valueNoise(x / config.scale, z / config.scale, config.seed);
  let sum = 0;
  let weight = 0;
  let amplitude = 1;
  let frequency = 1 / config.scale;
  for (let octave = 0; octave < config.octaves; octave++) {
    sum += amplitude * valueNoise(x * frequency, z * frequency, config.seed);
    weight += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return sum / weight;
}
export function heightAt(x: number, z: number, config: TerrainConfig) {
  const signal = terrainSignal(x, z, config);
  if (config.stage < 2) return 4;
  return Math.max(2, Math.min(14, Math.floor(8 + 6 * signal)));
}
export function materialAt(y: number, height: number, config: TerrainConfig) {
  if (y < 0 || y >= height) return 0;
  if (config.stage < 6) return 3;
  if (y === height - 1 && height < 11) return 1;
  if (height < 11 && y >= height - 3 && y > 0) return 2;
  return 3;
}
export function generateTerrain(key: Key, config: TerrainConfig) {
  validateKey(key);
  validateConfig(config);
  const blocks = new Uint8Array(4096);
  for (let z = 0; z < 16; z++) {
    for (let x = 0; x < 16; x++) {
      const worldX = key.x * 16 + x;
      const worldZ = key.z * 16 + z;
      const height = heightAt(worldX, worldZ, config);
      for (let y = 0; y < height; y++) blocks[index(x, y, z)] = materialAt(y, height, config);
    }
  }
  return blocks;
}
