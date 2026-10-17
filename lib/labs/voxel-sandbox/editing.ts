import { index } from "../voxel-greedy-meshing/model.ts";
import { rebuild } from "../voxel-chunk-streaming/meshing.ts";
import { residentBlock, traceWorld } from "./query.ts";
import {
  baseBlock,
  effectiveBlock,
  validateCell,
  cellId,
  type Sandbox,
  type Command,
} from "./state.ts";
import type { Cell, Ray } from "./ray.ts";
function markDirty(state: Sandbox, cell: Cell) {
  const [x, , z] = cell,
    cx = Math.floor(x / 16),
    cz = Math.floor(z / 16);
  if (!state.world.chunks.has(`${cx},${cz}`)) return;
  const keys = [{ x: cx, z: cz }];
  if (x - cx * 16 === 0) keys.push({ x: cx - 1, z: cz });
  if (x - cx * 16 === 15) keys.push({ x: cx + 1, z: cz });
  if (z - cz * 16 === 0) keys.push({ x: cx, z: cz - 1 });
  if (z - cz * 16 === 15) keys.push({ x: cx, z: cz + 1 });
  for (const key of keys) state.dirty.set(`${key.x},${key.z}`, key);
}
export function flushEdits(state: Sandbox) {
  if (!state.dirty.size) return 0;
  const historical = state.world.lastMeshes;
  const keys =
    state.stage >= 6
      ? [...state.dirty.values()]
      : [...state.world.chunks.values()].map((e) => e.key);
  let count = 0;
  for (const key of keys)
    if (state.world.chunks.has(`${key.x},${key.z}`)) {
      rebuild(state.world, key);
      count++;
    }
  state.world.lastMeshes = historical;
  state.editRebuilds += count;
  state.dirty.clear();
  state.world.frameDirty = true;
  return count;
}
export function writeCell(state: Sandbox, cell: Cell, value: number, record = true) {
  validateCell(cell);
  if (!Number.isInteger(value) || value < 0 || value > 3) throw new RangeError("Block ID 0..3");
  const cx = Math.floor(cell[0] / 16),
    cz = Math.floor(cell[2] / 16),
    entry = state.world.chunks.get(`${cx},${cz}`);
  let before = effectiveBlock(state, cell);
  if (entry) before = entry.blocks[index(cell[0] - cx * 16, cell[1], cell[2] - cz * 16)];
  if (before === value || state.stage < 4) return false;
  if (!entry && state.stage < 5) return false;
  const id = cellId(cell),
    base = baseBlock(state.config, cell);
  if (state.stage >= 5) {
    if (value !== base && !state.edits.has(id) && state.edits.size >= 512) return false;
    if (value === base) state.edits.delete(id);
    else state.edits.set(id, { cell: [...cell], value });
  }
  if (entry) entry.blocks[index(cell[0] - cx * 16, cell[1], cell[2] - cz * 16)] = value;
  markDirty(state, cell);
  if (state.stage >= 7 && record) {
    state.undo.push({ cell: [...cell], before, after: value });
    if (state.undo.length > 32) state.undo.shift();
    state.redo.length = 0;
  }
  if (state.stage < 6) flushEdits(state);
  return true;
}
export function editRay(state: Sandbox, ray: Ray, place: boolean, material = 1) {
  if (!Number.isInteger(material) || material < 1 || material > 3)
    throw new RangeError("material 1..3");
  const trace = traceWorld(state.world, ray);
  if (state.stage < 4 || !trace.hit) return false;
  let cell = trace.hit.cell;
  if (place) {
    if (trace.hit.normal.every((v) => v === 0)) return false;
    cell = cell.map((v, i) => v + trace.hit!.normal[i]) as Cell;
    if (
      cell[1] < 0 ||
      cell[1] >= 16 ||
      cell[0] < -1024 ||
      cell[0] >= 1024 ||
      cell[2] < -1024 ||
      cell[2] >= 1024 ||
      residentBlock(state.world, cell) !== 0
    )
      return false;
  }
  return writeCell(state, cell, place ? material : 0);
}
export function history(state: Sandbox, redo = false) {
  if (state.stage < 7) return false;
  const source = redo ? state.redo : state.undo,
    target = redo ? state.undo : state.redo;
  const command: Command | undefined = source.at(-1);
  if (command && effectiveBlock(state, command.cell) !== (redo ? command.before : command.after))
    return false;
  if (!command || !writeCell(state, command.cell, redo ? command.after : command.before, false))
    return false;
  source.pop();
  target.push(command);
  return true;
}
