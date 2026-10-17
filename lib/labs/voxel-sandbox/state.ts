import { createWorld, movePlayer, type World, type Player } from "../voxel-chunk-streaming.ts";
import {
  defaultConfig,
  validateConfig,
  generateTerrain,
  heightAt,
  materialAt,
  type TerrainConfig,
} from "../voxel-procedural-terrain.ts";
import { index } from "../voxel-greedy-meshing/model.ts";
import type { Cell } from "./ray.ts";
export type Delta = { cell: Cell; value: number };
export type Command = { cell: Cell; before: number; after: number };
export type Sandbox = {
  world: World;
  config: TerrainConfig;
  stage: number;
  edits: Map<string, Delta>;
  undo: Command[];
  redo: Command[];
  dirty: Map<string, { x: number; z: number }>;
  editRebuilds: number;
};
export const cellId = (cell: Cell) => cell.join(",");
export function validateCell(cell: Cell) {
  if (
    !cell.every(Number.isInteger) ||
    cell[0] < -1024 ||
    cell[0] >= 1024 ||
    cell[1] < 0 ||
    cell[1] >= 16 ||
    cell[2] < -1024 ||
    cell[2] >= 1024
  )
    throw new RangeError("world voxel bounds");
}
export function baseBlock(config: TerrainConfig, cell: Cell) {
  validateCell(cell);
  return materialAt(cell[1], heightAt(cell[0], cell[2], config), config);
}
export function createSandbox(
  stage = 10,
  config: TerrainConfig = defaultConfig,
  deltas: Delta[] = [],
  player: Player = { x: 8, z: 8 },
): Sandbox {
  if (!Number.isInteger(stage) || stage < 0 || stage > 10) throw new RangeError("stage 0..10");
  validateConfig(config);
  const snapshot = { ...config, stage: 9 };
  if (deltas.length > 512) throw new RangeError("512 deltas");
  const edits = new Map<string, Delta>();
  for (const delta of deltas) {
    validateCell(delta.cell);
    if (
      !Number.isInteger(delta.value) ||
      delta.value < 0 ||
      delta.value > 3 ||
      edits.has(cellId(delta.cell)) ||
      delta.value === baseBlock(snapshot, delta.cell)
    )
      throw new RangeError("invalid/redundant/duplicate delta");
    edits.set(cellId(delta.cell), { cell: [...delta.cell], value: delta.value });
  }
  const generate = (key: { x: number; z: number }) => {
    const data = generateTerrain(key, snapshot);
    if (stage >= 5)
      for (const {
        cell: [x, y, z],
        value,
      } of edits.values()) {
        if (Math.floor(x / 16) === key.x && Math.floor(z / 16) === key.z)
          data[index(x - key.x * 16, y, z - key.z * 16)] = value;
      }
    return data;
  };
  return {
    world: createWorld(10, generate, player),
    config: snapshot,
    stage,
    edits,
    undo: [],
    redo: [],
    dirty: new Map(),
    editRebuilds: 0,
  };
}
export function effectiveBlock(state: Sandbox, cell: Cell) {
  return state.edits.get(cellId(cell))?.value ?? baseBlock(state.config, cell);
}
export function travel(state: Sandbox, x: number, z: number) {
  movePlayer(state.world, x, z);
}
