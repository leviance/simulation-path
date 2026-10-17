#pragma once
#include "mask.hpp"

#if LAB_CHECKPOINT >= 3
namespace voxel {
// Direction and plane are fixed by the current mask; only material varies here.
inline bool sameFace(Block candidate, Block material) {
    return material != Block::Air && candidate == material;
}
} // namespace voxel
#endif
#if LAB_CHECKPOINT >= 4
namespace voxel {
inline std::vector<Rectangle> extractRectangles(Mask mask, int face, int plane, int& comparisons) {
    std::vector<Rectangle> rectangles;
    for (int v = 0; v < side; ++v) {
        for (int u = 0; u < side; ++u) {
            const Block material = mask[v * side + u];
            if (material == Block::Air) {
                continue;
            }
            // Prefer width, then extend the whole row, not just its first cell.
            int width = 1;
            while (u + width < side) {
                ++comparisons;
                if (!sameFace(mask[v * side + u + width], material)) {
                    break;
                }
                ++width;
            }
            int height = 1;

            while (v + height < side) {
                bool matches = true;
                for (int du = 0; du < width; ++du) {
                    ++comparisons;
                    if (!sameFace(mask[(v + height) * side + u + du], material)) {
                        matches = false;
                        break;
                    }
                }
                if (!matches) {
                    break;
                }
                ++height;
            }
            rectangles.push_back({face, plane, u, v, width, height, material});
            // Remove exactly the covered rectangle before scanning the next seed.
            for (int dv = 0; dv < height; ++dv) {
                for (int du = 0; du < width; ++du) {
                    mask[(v + dv) * side + u + du] = Block::Air;
                }
            }
        }
    }
    return rectangles;
}
} // namespace voxel
#endif
