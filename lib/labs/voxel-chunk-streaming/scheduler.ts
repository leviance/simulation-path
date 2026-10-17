import { centerOf, distance, keyOf, maxResident, square } from "./coordinates.ts";
import { newEntry } from "./data.ts";
import { affected, rebuild } from "./meshing.ts";
import type { Job, World } from "./types.ts";
export const loadRadius = (world: World) => (world.stage >= 3 ? world.radius : 0);
export const targetCenter = (world: World) =>
  world.stage >= 3 ? centerOf(world.player) : { x: 0, z: 0 };
export const keepRadius = (world: World) => loadRadius(world) + Number(world.stage >= 6);
export function plan(world: World): Job[] {
  const center = targetCenter(world),
    jobs: Job[] = [];
  if (world.stage >= 4)
    for (const entry of world.chunks.values())
      if (distance(entry.key, center) > keepRadius(world))
        jobs.push({ kind: "unload", key: entry.key, priority: 0 });
  for (const key of square(center, loadRadius(world)))
    if (!world.chunks.has(keyOf(key))) jobs.push({ kind: "load", key, priority: 0 });
  for (const job of jobs) job.priority = (job.key.x - center.x) ** 2 + (job.key.z - center.z) ** 2;
  return jobs.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "unload" ? -1 : 1;
    const priority = a.kind === "load" ? a.priority - b.priority : b.priority - a.priority;
    return priority || a.key.z - b.key.z || a.key.x - b.key.x;
  });
}
export function retarget(world: World) {
  const jobs = plan(world),
    ids = new Set(jobs.map((j) => j.kind + keyOf(j.key)));
  world.cancelledJobs = world.pending.filter((j) => !ids.has(j.kind + keyOf(j.key))).map(copyJob);
  world.cancelled += world.cancelledJobs.length;
  world.pending = jobs;
}
export function pump(world: World) {
  world.pending = plan(world);
  world.lastJobs = 0;
  world.lastMeshes = 0;
  world.lastBudget = world.budget;
  world.ticks++;
  const limit = world.stage >= 5 ? world.budget : world.pending.length,
    dirty = new Map<string, { x: number; z: number }>();
  if (world.stage >= 5) {
    world.batches.push({ tick: world.ticks, jobs: world.pending.slice(0, limit).map(copyJob) });
    if (world.batches.length > 8) world.batches.shift();
  }
  for (const job of world.pending.slice(0, limit)) {
    world.lastJobs++;
    if (job.kind === "unload") {
      world.chunks.delete(keyOf(job.key));
      world.unloads++;
    } else {
      if (world.chunks.size >= maxResident) continue;
      world.chunks.set(keyOf(job.key), newEntry(job.key, world.generate));
      world.loads++;
    }
    for (const key of affected(job.key)) dirty.set(keyOf(key), key);
    world.frameDirty = true;
  }
  if (world.stage < 8 && dirty.size)
    for (const entry of world.chunks.values()) rebuild(world, entry.key);
  else for (const key of dirty.values()) rebuild(world, key);
  world.peak = Math.max(world.peak, world.chunks.size);
  world.pending = plan(world);
  return world.lastJobs;
}

function copyJob(job: Job): Job {
  return { ...job, key: { ...job.key } };
}
