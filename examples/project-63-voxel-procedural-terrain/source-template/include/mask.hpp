#pragma once
#include "model.hpp"

namespace voxel {
using Mask = std::array<Block, side * side>;

inline Mask makeMask(const Chunk& chunk, int face, int plane, int slice) {
    // Mask thuộc một hướng/plane; Air biểu thị không có mặt ngoài ở ô đó.
    if (face < 0 || face > 5 || plane < 0 || plane > side || slice < 0 || slice >= side) {
        throw std::out_of_range("face/plane/slice");
    }

    const int axis = face / 2;
    const int uAxis = (axis + 1) % 3;
    const int vAxis = (axis + 2) % 3;
    int sign = -1;
    if (face % 2 == 0) {
        sign = 1;
    }
    Mask mask{};
    for (int v = 0; v < side; ++v) {
        for (int u = 0; u < side; ++u) {
            std::array<int, 3> source{};
            source[axis] = plane;
            if (sign > 0) {
                --source[axis];
            }
            source[uAxis] = u;
            source[vAxis] = v;
            auto neighbor = source;
            neighbor[axis] += sign;
            const Block material = activeBlock(chunk, source, slice);
            if (material != Block::Air && activeBlock(chunk, neighbor, slice) == Block::Air) {
                mask[v * side + u] = material;
            }
        }
    }
    return mask;
}
} // namespace voxel
