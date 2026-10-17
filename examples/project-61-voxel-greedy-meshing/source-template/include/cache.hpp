#pragma once
#include "mesh.hpp"
#include "raster.hpp"

namespace voxel {
struct Cache {
    Built built;
    Frame frame;
    bool meshDirty = true;
    bool frameDirty = true;
    int rebuilds = 0;
    int rasterizations = 0;
};

inline void refresh(Cache& cache, const Chunk& chunk, int slice, bool merge, const Camera& camera) {
    // Geometry mới luôn kéo theo ảnh mới; đổi camera không cần dựng geometry.
#if LAB_CHECKPOINT < 8
    cache.meshDirty = true;
    cache.frameDirty = true;
#endif
    if (cache.meshDirty) {
        cache.built = buildMesh(chunk, slice, merge);
        cache.meshDirty = false;
        cache.frameDirty = true;
        ++cache.rebuilds;
    }
    if (cache.frameDirty) {
        render(cache.frame, cache.built.mesh, camera);
        cache.frameDirty = false;
        ++cache.rasterizations;
    }
}
} // namespace voxel
