#pragma once
#include "mesh.hpp"
#include "raster.hpp"

namespace voxel {
// Tách thay đổi hình học khỏi thay đổi góc nhìn.
struct SceneCache {
    BuildResult built;
    Frame frame;
    bool meshDirty = true;
    bool frameDirty = true;
    int rebuilds = 0;
    int rasterizations = 0;
};

inline bool update(SceneCache& cache, const Chunk& chunk, bool culled, int slice, const Camera& camera) {
    if (cache.meshDirty) {
        cache.built = buildMesh(chunk, culled, slice);
        cache.meshDirty = false;
        cache.frameDirty = true;
        ++cache.rebuilds;
    }
    if (!cache.frameDirty) {
        return false;
    }
    render(cache.frame, cache.built.mesh, camera);
    cache.frameDirty = false;
    ++cache.rasterizations;
    return true;
}
} // namespace voxel
