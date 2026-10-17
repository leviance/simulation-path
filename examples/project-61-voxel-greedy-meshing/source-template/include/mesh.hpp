#pragma once
#include "baseline.hpp"
#include "rectangles.hpp"

namespace voxel {
#if LAB_CHECKPOINT >= 5
inline Built buildGreedy(const Chunk& chunk, int slice) {
    Built built;
    for (int face = 0; face < 6; ++face) {
        for (int plane = 0; plane <= side; ++plane) {
            const Mask mask = makeMask(chunk, face, plane, slice);
            built.samples += side * side;
            for (const Block material : mask) {
                if (material != Block::Air) {
                    ++built.unitFaces;
                }
            }
            std::vector<Rectangle> rectangles;
#if LAB_CHECKPOINT >= 6
            rectangles = extractRectangles(mask, face, plane, built.comparisons);
#else
            // First integrate +Y. Other directions remain correct unit faces.
            if (face == 2) {
                rectangles = extractRectangles(mask, face, plane, built.comparisons);
            } else {
                for (int v = 0; v < side; ++v) {
                    for (int u = 0; u < side; ++u) {
                        const Block material = mask[v * side + u];
                        if (material != Block::Air) {
                            rectangles.push_back({face, plane, u, v, 1, 1, material});
                        }
                    }
                }
            }
#endif
            for (const Rectangle& r : rectangles) {
                built.quads.push_back(r);
                appendQuad(built.mesh, r);
            }
        }
    }
    return built;
}
#endif
inline Built buildMesh(const Chunk& chunk, int slice, bool merge) {
    // Cả hai cách dựng mesh dùng chung miền active; không sửa chunk.
    if (slice < 0 || slice >= side) {
        throw std::out_of_range("slice 0..15");
    }

#if LAB_CHECKPOINT >= 5
    if (merge) {
        return buildGreedy(chunk, slice);
    }
#else
    (void)merge;
#endif
    return buildBaseline(chunk, slice);
}
} // namespace voxel
