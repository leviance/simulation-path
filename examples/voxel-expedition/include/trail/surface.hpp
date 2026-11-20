#pragma once
#include "bank.hpp"
#include <vector>

namespace trail {
struct Face {
    Vec3 origin;
    int direction;
    int width, height;
    Block block;
};

using Mesh = std::vector<Face>;
// Trên vách đứng, u nằm ngang và v hướng lên. Mặt trên/dưới trải theo X/Z.
inline constexpr std::array<Cell, 6> neighbors{{{1, 0, 0}, {-1, 0, 0}, {0, 1, 0}, {0, -1, 0}, {0, 0, 1}, {0, 0, -1}}};
inline constexpr std::array<Vec3, 6> faceStarts{{{1, 0, 0}, {0, 0, 0}, {0, 1, 0}, {0, 0, 0}, {0, 0, 1}, {0, 0, 0}}};
inline constexpr std::array<Vec3, 6> faceU{{{0, 0, 1}, {0, 0, 1}, {1, 0, 0}, {1, 0, 0}, {1, 0, 0}, {1, 0, 0}}};
inline constexpr std::array<Vec3, 6> faceV{{{0, 1, 0}, {0, 1, 0}, {0, 0, 1}, {0, 0, 1}, {0, 1, 0}, {0, 1, 0}}};

#if LAB_CHECKPOINT >= 5801
// [snippet six-faces]
inline void appendCube(Mesh& mesh, Vec3 cell, Block block) {
    for (int face = 0; face < 6; ++face) {
        mesh.push_back({cell + faceStarts[face], face, 1, 1, block});
    }
}
// [/snippet six-faces]
#endif

#if LAB_CHECKPOINT >= 5803
// [snippet naive-mesh]
inline Mesh naiveMesh(const Column& column) {
    Mesh mesh;
    for (int y = 0; y < column.height(); ++y) {
        for (int z = 0; z < side; ++z) {
            for (int x = 0; x < side; ++x) {
                const Block block = column.get(x, y, z);
                if (block == Block::Air)
                    continue;
                const Vec3 cell{double(column.cx * side + x), double(y), double(column.cz * side + z)};
                appendCube(mesh, cell, block);
            }
        }
    }
    return mesh;
}
// [/snippet naive-mesh]
#endif
} // namespace trail
