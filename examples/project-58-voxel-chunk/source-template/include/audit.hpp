#pragma once
#include "mesh.hpp"
#include "raster.hpp"

namespace voxel {
// Assertion tự viết để kiểm chứng không biến mất khi build Release/NDEBUG.
inline void check(bool condition, const char* message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}

#if LAB_CHECKPOINT >= 7
inline void audit() {
    const Chunk full = makeChunk(1);
    const Mesh mesh = buildMesh(full);
    check(solidCount(full) == 4096, "full chunk block count");
    check(mesh.size() == 49152, "12 triangles per solid block");
    check(buildMesh(makeChunk(3)).empty(), "empty chunk mesh");
    check(buildMesh(full, 0).size() == 256 * 12, "bottom slice count");
    check(solidCount(full) == 4096, "slice must not mutate storage");

    Frame frame;
    Mesh single;
    appendCube(single, {7, 7, 7}, 3);
    Camera camera;
    camera.center = 7.5;
    camera.scale = 60;
    render(frame, single, camera);
    const auto before = frame.depth;
    std::reverse(single.begin(), single.end());
    render(frame, single, camera);
    for (std::size_t i = 0; i < before.size(); ++i) {
        if (std::isfinite(before[i])) {
            check(std::abs(frame.depth[i] - before[i]) < 1e-9, "depth independent of draw order");
        } else {
            check(!std::isfinite(frame.depth[i]), "background coverage");
        }
    }
}
#endif
} // namespace voxel
