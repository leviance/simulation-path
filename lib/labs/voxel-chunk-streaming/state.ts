import { centerOf, keyOf, playerLimit, type Player } from "./coordinates.ts";
import { newEntry, generateChunk, type ChunkGenerator } from "./data.ts";
import { rebuild } from "./meshing.ts";
import { pump, retarget } from "./scheduler.ts";
import type { World } from "./types.ts";
export const presetNames = [
  "Bắt đầu ở (8,8)",
  "Ngay bên âm của gốc",
  "Nhảy xa tới (200,−200)",
  "Sát biên chunk (15.5,8)",
];
export const presets: Player[] = [
  { x: 8, z: 8 },
  { x: -0.5, z: -0.5 },
  { x: 200, z: -200 },
  { x: 15.5, z: 8 },
];
export function createWorld(
  stage = 10,
  generate: ChunkGenerator = generateChunk,
  player: Player = { x: 8, z: 8 },
): World {
  if (!Number.isInteger(stage) || stage < 0 || stage > 10) throw new RangeError("stage 0..10");
  if (![player.x, player.z].every((v) => Number.isFinite(v) && Math.abs(v) <= playerLimit))
    throw new RangeError("player -512..512");
  const origin = centerOf(player),
    world: World = {
      stage,
      player: { ...player },
      radius: 1,
      budget: 2,
      chunks: new Map([[keyOf(origin), newEntry(origin, generate)]]),
      pending: [],
      batches: [],
      cancelledJobs: [],
      loads: 1,
      unloads: 0,
      rebuilds: 0,
      ticks: 0,
      cancelled: 0,
      lastJobs: 0,
      lastMeshes: 0,
      lastBudget: 2,
      peak: 1,
      frameDirty: true,
      generate,
    };
  rebuild(world, origin);
  retarget(world);
  if (stage < 5) pump(world);
  return world;
}
export function movePlayer(world: World, x: number, z: number) {
  if (![x, z].every((v) => Number.isFinite(v) && Math.abs(v) <= playerLimit))
    throw new RangeError("player -512..512");
  if (world.stage < 2) {
    x = Math.max(0, Math.min(15.99, x));
    z = Math.max(0, Math.min(15.99, z));
  }
  if (x === world.player.x && z === world.player.z) return false;
  const before = keyOf(centerOf(world.player));
  world.player = { x, z };
  world.frameDirty = true;
  if (keyOf(centerOf(world.player)) !== before) {
    retarget(world);
    if (world.stage < 5) pump(world);
  }
  return true;
}
export function settings(world: World, radius: number, budget: number) {
  if (
    !Number.isInteger(radius) ||
    radius < 1 ||
    radius > 2 ||
    !Number.isInteger(budget) ||
    budget < 1 ||
    budget > 2
  )
    throw new RangeError("radius/budget 1..2");
  world.radius = 1;
  if (world.stage >= 6) world.radius = radius;
  world.budget = budget;
  retarget(world);
}
export function drain(world: World, maxTicks = 100) {
  if (!Number.isInteger(maxTicks) || maxTicks < 1 || maxTicks > 100)
    throw new RangeError("drain 1..100");
  for (let i = 0; i < maxTicks; i++) {
    if (!world.pending.length) return;
    pump(world);
  }
  if (world.pending.length) throw new Error("streaming did not settle within tick budget");
}
// A finite route drives one manual movement per tick; no catch-up loop.
export const route: Player[] = [
  { x: 8, z: 8 },
  { x: 20, z: 8 },
  { x: 36, z: 8 },
  { x: 36, z: 24 },
  { x: 20, z: 24 },
  { x: 8, z: 24 },
  { x: -4, z: 8 },
  { x: -20, z: -8 },
  { x: 8, z: 8 },
];
