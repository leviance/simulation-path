import {
  createWorld,
  retarget,
  centerOf,
  keyOf,
  newEntry,
  type World,
} from "../voxel-chunk-streaming.ts";
import { rebuild } from "../voxel-chunk-streaming/meshing.ts";
import { defaultConfig, generateTerrain, validateConfig, type TerrainConfig } from "./terrain.ts";
export type TerrainWorld = { world: World; config: TerrainConfig; generation: number };
export function createTerrain(config: TerrainConfig = defaultConfig): TerrainWorld {
  validateConfig(config);
  const snapshot = { ...config };
  return {
    world: createWorld(10, (key) => generateTerrain(key, snapshot)),
    config: snapshot,
    generation: 1,
  };
}
// Clear the old generation as one bounded transaction. Subsequent loads still obey budget.
export function applyConfig(state: TerrainWorld, config: TerrainConfig) {
  validateConfig(config);
  const snapshot = { ...config };
  const world = state.world;
  const key = centerOf(world.player);
  const generate = (address: { x: number; z: number }) => generateTerrain(address, snapshot);
  const entry = newEntry(key, generate);
  world.generate = generate;
  world.chunks = new Map([[keyOf(key), entry]]);
  world.pending = [];
  world.loads = 1;
  world.unloads = 0;
  world.rebuilds = 0;
  world.ticks = 0;
  world.cancelled = 0;
  world.lastJobs = 0;
  world.lastMeshes = 0;
  world.lastBudget = world.budget;
  world.peak = 1;
  rebuild(world, key);
  retarget(world);
  world.frameDirty = true;
  state.config = snapshot;
  state.generation++;
}
