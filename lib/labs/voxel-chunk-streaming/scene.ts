import type { Triangle, Vec3 } from "../voxel-chunk/model.ts";
import { defaultCamera } from "../voxel-chunk/raster.ts";
import type { World } from "./types.ts";
export const streamingCamera = { ...defaultCamera, scale: 2, pitch: 0.65 };
export function sceneMesh(world: World): Triangle[] {
  const mesh: Triangle[] = [];
  for (const entry of world.chunks.values())
    for (const triangle of entry.mesh)
      mesh.push({
        color: triangle.color,
        points: triangle.points.map(
          (p) =>
            [
              p[0] + entry.key.x * 16 - world.player.x + 8,
              p[1],
              p[2] + entry.key.z * 16 - world.player.z + 8,
            ] as Vec3,
        ) as [Vec3, Vec3, Vec3],
      });
  return mesh;
}
