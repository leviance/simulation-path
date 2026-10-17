import { project, type Camera } from "../voxel-chunk/raster.ts";
import type { World } from "../voxel-chunk-streaming/types.ts";

export const minimumNearDepth = 64;
export const pickReach = 96;
export type ViewVolume = { near: number; far: number };

// Put the near plane in front of every resident chunk, including retained chunks
// after a teleport. Eight corners suffice because orthographic depth is linear.
export function cameraVolume(world: World, camera: Camera): ViewVolume {
  let nearest = minimumNearDepth - 1;
  for (const { key } of world.chunks.values())
    for (const x of [0, 16])
      for (const y of [0, 16])
        for (const z of [0, 16]) {
          const depth = project(
            [key.x * 16 - world.player.x + 8 + x, y, key.z * 16 - world.player.z + 8 + z],
            camera,
          ).depth;
          nearest = Math.max(nearest, depth);
        }
  const near = Math.max(minimumNearDepth, Math.ceil(nearest) + 1);
  return { near, far: near - pickReach };
}
