#pragma once
#include "geometry.hpp"

namespace voxel {
struct FaceKey {
    int x;
    int y;
    int z;
    int face;
    auto operator<=>(const FaceKey&) const = default;
};

struct BuildResult {
    Mesh mesh;
    std::vector<FaceKey> keys;
    int solid = 0;
    int neighborChecks = 0;
};

#if LAB_CHECKPOINT >= 3
inline constexpr std::array<std::array<int, 3>, 6> offsets{{{1, 0, 0}, {-1, 0, 0}, {0, 1, 0}, {0, -1, 0}, {0, 0, 1}, {0, 0, -1}}};

inline bool activeSolid(const Chunk& chunk, int x, int y, int z, int slice) {
    // Ngoài chunk hoặc phía trên mặt cắt là Air của miền hiển thị.
    if (!inside(x, y, z) || y > effectiveSlice(slice)) {
        return false;
    }
    return get(chunk, x, y, z) != Block::Air;
}

inline bool keepFace(const Chunk& chunk, int x, int y, int z, int face, int slice) {
    const auto offset = offsets.at(static_cast<std::size_t>(face));
    return !activeSolid(chunk, x + offset[0], y + offset[1], z + offset[2], slice);
}
#endif

inline BuildResult buildMesh([[maybe_unused]] const Chunk& chunk, [[maybe_unused]] bool culled, int slice) {
    BuildResult result;
    const int top = effectiveSlice(slice);
    static_cast<void>(top);
#if LAB_CHECKPOINT >= 1
    for (int y = 0; y <= top; ++y) {
        for (int z = 0; z < side; ++z) {
            for (int x = 0; x < side; ++x) {
                const Block block = get(chunk, x, y, z);
                if (block == Block::Air) {
                    continue;
                }
                ++result.solid;
                const Vec3 origin{static_cast<double>(x), static_cast<double>(y), static_cast<double>(z)};
#if LAB_CHECKPOINT < 2
                appendCube(result.mesh, origin, static_cast<int>(block));
#endif
                for (int face = 0; face < 6; ++face) {
#if LAB_CHECKPOINT >= 3
                    if (culled) {
                        ++result.neighborChecks;
                        if (!keepFace(chunk, x, y, z, face, slice)) {
                            continue;
                        }
                    }
#endif
#if LAB_CHECKPOINT >= 2
                    appendFace(result.mesh, origin, static_cast<int>(block), face);
#endif
                    result.keys.push_back({x, y, z, face});
                }
            }
        }
    }
#endif
    return result;
}
} // namespace voxel
