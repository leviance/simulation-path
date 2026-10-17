import {
  createSandbox,
  baseBlock,
  validateCell,
  cellId,
  type Sandbox,
  type Delta,
} from "./state.ts";
import { validateConfig, type TerrainConfig } from "../voxel-procedural-terrain.ts";
export function serialize(state: Sandbox) {
  const { seed, scale, octaves } = state.config;
  const values = [...state.edits.values()].sort(
    (a, b) => a.cell[0] - b.cell[0] || a.cell[1] - b.cell[1] || a.cell[2] - b.cell[2],
  );
  return (
    `VXL1 ${seed} ${scale} ${octaves}\n${values.length}\n` +
    values.map((d) => `${d.cell.join(" ")} ${d.value}\n`).join("")
  );
}
export function parseSnapshot(text: string) {
  if (text.length > 32768 || /[^\x09\x0a\x0d\x20-\x7e]/.test(text))
    throw new Error("ASCII snapshot <=32768 bytes");
  const tokens = text.trim().split(/\s+/);
  if (tokens[0] !== "VXL1" || tokens.length < 5) throw new Error("VXL1 header");
  const number = (i: number) => {
    if (!/^-?\d+$/.test(tokens[i] ?? "")) throw new Error("decimal integer");
    const value = Number(tokens[i]);
    if (!Number.isSafeInteger(value)) throw new Error("integer overflow");
    return value;
  };
  const config: TerrainConfig = { seed: number(1), scale: number(2), octaves: number(3), stage: 9 };
  validateConfig(config);
  const count = number(4);
  if (count < 0 || count > 512 || tokens.length !== 5 + count * 4)
    throw new Error("delta count/trailing data");
  const deltas: Delta[] = [],
    seen = new Set<string>();
  for (let i = 0; i < count; i++) {
    const offset = 5 + 4 * i,
      cell: [number, number, number] = [number(offset), number(offset + 1), number(offset + 2)],
      value = number(offset + 3);
    validateCell(cell);
    if (value < 0 || value > 3 || value === baseBlock(config, cell) || seen.has(cellId(cell)))
      throw new Error("invalid/redundant/duplicate delta");
    seen.add(cellId(cell));
    deltas.push({ cell, value });
  }
  return { config, deltas };
}
export function importSnapshot(state: Sandbox, text: string) {
  const { config, deltas } = parseSnapshot(text);
  return createSandbox(state.stage, config, deltas, state.world.player);
}
