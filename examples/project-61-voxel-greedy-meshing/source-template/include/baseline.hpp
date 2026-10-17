#pragma once
#include "quad.hpp"

namespace voxel {
struct Built {
    Mesh mesh;
    std::vector<Rectangle> quads;
    int unitFaces = 0;
    int samples = 0;
    int comparisons = 0;
};

inline Built buildBaseline(const Chunk& chunk, int slice) {
    // Mỗi mặt ngoài vẫn là một quad đơn vị để làm bản đối chiếu.
    Built built;
    const std::array<std::array<int, 3>, 6> offsets{{{1, 0, 0}, {-1, 0, 0}, {0, 1, 0}, {0, -1, 0}, {0, 0, 1}, {0, 0, -1}}};
    for (int y = 0; y <= slice; ++y) {
        for (int z = 0; z < side; ++z) {
            for (int x = 0; x < side; ++x) {
                const Block material = get(chunk, x, y, z);
                if (material == Block::Air) {
                    continue;
                }
                const std::array<int, 3> cell{{x, y, z}};
                for (int face = 0; face < 6; ++face) {
                    const auto& d = offsets[face];
                    const std::array<int, 3> n{{x + d[0], y + d[1], z + d[2]}};
                    ++built.samples;
                    if (activeBlock(chunk, n, slice) != Block::Air) {
                        continue;
                    }
                    const int axis = face / 2;
                    int plane = cell[axis];
                    if (face % 2 == 0) {
                        ++plane;
                    }
                    const Rectangle r{face, plane, cell[(axis + 1) % 3], cell[(axis + 2) % 3], 1, 1, material};
                    built.quads.push_back(r);
                    appendQuad(built.mesh, r);
                    ++built.unitFaces;
                }
            }
        }
    }
    return built;
}
} // namespace voxel
