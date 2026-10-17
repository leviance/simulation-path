import { index, type Rectangle, type Triangle } from "../voxel-greedy-meshing/model.ts";
import { rectangles } from "../voxel-greedy-meshing/mask.ts";
import { appendQuad } from "../voxel-greedy-meshing/mesh.ts";
import { keyOf, type Key } from "./coordinates.ts";
import type { World } from "./types.ts";
export function worldBlock(world: World, x: number, y: number, z: number) {
  if (y < 0 || y >= 16) return 0;
  const cx = Math.floor(x / 16),
    cz = Math.floor(z / 16),
    entry = world.chunks.get(keyOf({ x: cx, z: cz }));
  return entry?.blocks[index(x - cx * 16, y, z - cz * 16)] ?? 0;
}
export function chunkMask(world: World, key: Key, face: number, plane: number) {
  const entry = world.chunks.get(keyOf(key));
  if (!entry) throw new Error("missing chunk");
  const mask = new Uint8Array(256),
    axis = Math.floor(face / 2),
    uAxis = (axis + 1) % 3,
    vAxis = (axis + 2) % 3,
    sign = face % 2 === 0 ? 1 : -1;
  const sample = (p: number[]) => {
    if (p.some((v) => v < 0 || v >= 16)) {
      if (world.stage >= 7) return worldBlock(world, key.x * 16 + p[0], p[1], key.z * 16 + p[2]);
      return 0;
    }
    return entry.blocks[index(p[0], p[1], p[2])];
  };
  for (let v = 0; v < 16; v++)
    for (let u = 0; u < 16; u++) {
      const source = [0, 0, 0];
      source[axis] = plane - Number(sign > 0);
      source[uAxis] = u;
      source[vAxis] = v;
      // The source must belong to this chunk, even when a neighbor is resident.
      if (source.some((n) => n < 0 || n >= 16)) continue;
      const neighbor = [...source];
      neighbor[axis] += sign;
      const material = sample(source);
      if (material && sample(neighbor) === 0) mask[v * 16 + u] = material;
    }
  return mask;
}
export function rebuild(world: World, key: Key) {
  const entry = world.chunks.get(keyOf(key));
  if (!entry) return;
  const mesh: Triangle[] = [],
    quads: Rectangle[] = [];
  let unitFaces = 0;
  for (let face = 0; face < 6; face++)
    for (let plane = 0; plane <= 16; plane++) {
      const mask = chunkMask(world, key, face, plane);
      unitFaces += mask.reduce((n, m) => n + Number(m !== 0), 0);
      for (const r of rectangles(mask, face, plane)) {
        quads.push(r);
        appendQuad(mesh, r);
      }
    }
  entry.mesh = mesh;
  entry.quads = quads;
  entry.unitFaces = unitFaces;
  entry.revision++;
  world.rebuilds++;
  world.lastMeshes++;
}
export function affected(key: Key) {
  return [
    key,
    { x: key.x - 1, z: key.z },
    { x: key.x + 1, z: key.z },
    { x: key.x, z: key.z - 1 },
    { x: key.x, z: key.z + 1 },
  ];
}
