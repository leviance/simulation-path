import { keyOf, maxResident } from "./coordinates.ts";
import type { World } from "./types.ts";
const offsets = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];
export function verifySurface(world: World) {
  // Slow test oracle enumerates global cells, independently of masks/lookup.
  const solid = new Map<string, number>();
  for (const e of world.chunks.values())
    for (let y = 0; y < 16; y++)
      for (let z = 0; z < 16; z++)
        for (let x = 0; x < 16; x++) {
          const m = e.blocks[x + 16 * (z + 16 * y)];
          if (m) solid.set(`${e.key.x * 16 + x},${y},${e.key.z * 16 + z}`, m);
        }
  const expected: string[] = [],
    actual: string[] = [];
  for (const [key, material] of solid) {
    const p = key.split(",").map(Number);
    offsets.forEach((d, face) => {
      if (!solid.has(p.map((v, i) => v + d[i]).join(",")))
        expected.push(`${key},${face},${material}`);
    });
  }
  for (const e of world.chunks.values())
    for (const r of e.quads) {
      const axis = Math.floor(r.face / 2),
        uAxis = (axis + 1) % 3,
        vAxis = (axis + 2) % 3;
      for (let v = 0; v < r.height; v++)
        for (let u = 0; u < r.width; u++) {
          const p = [0, 0, 0];
          p[axis] = r.plane - Number(r.face % 2 === 0);
          p[uAxis] = r.u + u;
          p[vAxis] = r.v + v;
          actual.push(
            `${p[0] + e.key.x * 16},${p[1]},${p[2] + e.key.z * 16},${r.face},${r.material}`,
          );
        }
    }
  expected.sort();
  actual.sort();
  if (expected.length !== actual.length || expected.some((k, i) => k !== actual[i]))
    throw new Error("global oriented surface mismatch");
  return expected.length;
}
export function verifySchedule(world: World) {
  if (
    world.chunks.size > maxResident ||
    world.pending.length > 74 ||
    world.lastJobs > world.lastBudget ||
    world.lastMeshes > 5 * world.lastBudget
  )
    throw new Error("streaming work bound violated");
  const ids = world.pending.map((j) => j.kind + keyOf(j.key));
  if (new Set(ids).size !== ids.length) throw new Error("duplicate job");
  return `PASS: resident=${world.chunks.size}, pending=${world.pending.length}; chỉ kiểm state hiện tại.`;
}
