import { raster, type Camera } from "../voxel-chunk/raster.ts";
import { buildMesh, type BuildResult } from "./mesh.ts";
export type Cache = {
  built: BuildResult;
  frame: ReturnType<typeof raster> | null;
  meshDirty: boolean;
  frameDirty: boolean;
  rebuilds: number;
  rasterizations: number;
};
export function createCache(): Cache {
  return {
    built: { mesh: [], keys: [], solid: 0, neighborChecks: 0 },
    frame: null,
    meshDirty: true,
    frameDirty: true,
    rebuilds: 0,
    rasterizations: 0,
  };
}
export function update(
  cache: Cache,
  chunk: Uint8Array,
  culled: boolean,
  slice: number,
  camera: Camera,
  stage = 8,
) {
  if ((stage >= 7 && cache.meshDirty) || (stage < 7 && cache.frameDirty)) {
    cache.built = buildMesh(chunk, culled, slice, stage);
    cache.meshDirty = false;
    cache.frameDirty = true;
    cache.rebuilds++;
  }
  if (!cache.frameDirty) return false;
  cache.frame = raster(cache.built.mesh, camera);
  cache.frameDirty = false;
  cache.rasterizations++;
  return true;
}
