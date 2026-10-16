#pragma once
#include "cache.hpp"
#include <set>

namespace voxel {
// Check tường minh không mất đi khi Release định nghĩa NDEBUG.
inline void requireCheck(bool condition, const char* message) {
    if (!condition) {
        throw std::runtime_error(message);
    }
}

#if LAB_CHECKPOINT >= 8
inline int oracleFaces(const Chunk& chunk, int slice) {
    int solid = 0;
    int adjacentPairs = 0;
    const int top = effectiveSlice(slice);
    // Chỉ đếm cặp theo ba chiều dương; mỗi cặp vô hướng xuất hiện đúng một lần.
    for (int y = 0; y <= top; ++y) {
        for (int z = 0; z < side; ++z) {
            for (int x = 0; x < side; ++x) {
                if (get(chunk, x, y, z) == Block::Air) {
                    continue;
                }
                ++solid;
                if (x + 1 < side && get(chunk, x + 1, y, z) != Block::Air) {
                    ++adjacentPairs;
                }
                if (y + 1 <= top && get(chunk, x, y + 1, z) != Block::Air) {
                    ++adjacentPairs;
                }
                if (z + 1 < side && get(chunk, x, y, z + 1) != Block::Air) {
                    ++adjacentPairs;
                }
            }
        }
    }
    return 6 * solid - 2 * adjacentPairs;
}

inline void audit() {
    const std::array<int, 7> expectedFaces{6, 10, 1536, 1542, 12288, 0, 912};
    for (int preset = 0; preset < 7; ++preset) {
        const auto chunk = makeChunk(preset);
        const auto before = chunk;
        for (int slice : {0, 7, 15}) {
            const auto result = buildMesh(chunk, true, slice);
            requireCheck(static_cast<int>(result.keys.size()) == oracleFaces(chunk, slice), "F=6N-2E oracle");
            requireCheck(result.mesh.size() == result.keys.size() * 2, "two triangles per face");
            requireCheck(std::set<FaceKey>(result.keys.begin(), result.keys.end()).size() == result.keys.size(), "unique oriented face keys");
            requireCheck(chunk == before, "mesher must not mutate chunk");
            if (slice == 15) {
                requireCheck(static_cast<int>(result.keys.size()) == expectedFaces.at(static_cast<std::size_t>(preset)), "independent preset count");
            }
        }
    }
}
#endif
} // namespace voxel
