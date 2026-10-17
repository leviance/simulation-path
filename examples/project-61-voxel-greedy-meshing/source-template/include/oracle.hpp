#pragma once
#include "mesh.hpp"
#include <algorithm>
#include <string>
#if LAB_CHECKPOINT >= 9
namespace voxel {
using FaceKey = std::array<int, 5>;

inline std::vector<FaceKey> expectedFaces(const Chunk& chunk, int slice) {
    std::vector<FaceKey> keys;
    // Independent cell-neighbor enumeration, not a call to makeMask.
    const std::array<std::array<int, 3>, 6> offsets{{{1, 0, 0}, {-1, 0, 0}, {0, 1, 0}, {0, -1, 0}, {0, 0, 1}, {0, 0, -1}}};
    for (int y = 0; y <= slice; ++y) {
        for (int z = 0; z < side; ++z) {
            for (int x = 0; x < side; ++x) {
                const Block material = get(chunk, x, y, z);
                if (material == Block::Air) {
                    continue;
                }
                for (int face = 0; face < 6; ++face) {
                    const auto& d = offsets[face];
                    const int nx = x + d[0], ny = y + d[1], nz = z + d[2];
                    if (ny <= slice && get(chunk, nx, ny, nz) != Block::Air) {
                        continue;
                    }
                    keys.push_back({x, y, z, face, static_cast<int>(material)});
                }
            }
        }
    }
    std::sort(keys.begin(), keys.end());
    return keys;
}

inline std::vector<FaceKey> expandedFaces(const std::vector<Rectangle>& quads) {
    std::vector<FaceKey> keys;
    for (const Rectangle& r : quads) {
        if (r.face < 0 || r.face > 5 || r.plane < 0 || r.plane > side || r.u < 0 || r.v < 0 || r.width < 1 || r.height < 1 || r.u + r.width > side || r.v + r.height > side || r.material == Block::Air || static_cast<int>(r.material) > 3) {
            throw std::runtime_error("invalid rectangle");
        }
        for (int dv = 0; dv < r.height; ++dv) {
            for (int du = 0; du < r.width; ++du) {
                std::array<int, 3> p{};
                p[r.face / 2] = r.plane;
                if (r.face % 2 == 0) {
                    --p[r.face / 2];
                }
                p[(r.face / 2 + 1) % 3] = r.u + du;
                p[(r.face / 2 + 2) % 3] = r.v + dv;
                if (!inside(p[0], p[1], p[2])) {
                    throw std::runtime_error("source outside chunk");
                }
                keys.push_back({p[0], p[1], p[2], r.face, static_cast<int>(r.material)});
            }
        }
    }
    std::sort(keys.begin(), keys.end());
    return keys;
}

inline int verify(const Chunk& chunk, const std::vector<Rectangle>& quads, int slice) {
    const auto expected = expectedFaces(chunk, slice);
    if (expected != expandedFaces(quads)) {
        throw std::runtime_error("oriented material coverage mismatch");
    }
    return static_cast<int>(expected.size());
}
} // namespace voxel
#endif
