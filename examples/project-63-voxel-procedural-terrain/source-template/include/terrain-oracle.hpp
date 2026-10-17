#pragma once
#include "mesh-oracle.hpp"
#include "oracle.hpp"

namespace voxel {
// Đối chiếu từng cell với truy vấn world, không gọi lại vòng fill của generator.
#if LAB_CHECKPOINT >= 9
inline int verifyColumns(Key key, const Chunk& blocks, const TerrainConfig& config) {
    int errors = 0;
    for (int z = 0; z < side; ++z) {
        for (int x = 0; x < side; ++x) {
            const int height = heightAt(key.x * side + x, key.z * side + z, config);
            for (int y = 0; y < side; ++y) {
                if (get(blocks, x, y, z) != materialAt(y, height, config)) {
                    ++errors;
                }
            }
        }
    }
    return errors;
}

inline void verifyTerrain(const World& world) {
    verifySchedule(world);
    for (const auto& [key, entry] : world.chunks) {
        if (verifyColumns(key, entry.blocks, world.config) != 0) {
            throw std::runtime_error("terrain column mismatch");
        }
    }
    verifySurface(world);
    verifyTriangles(world);
}
#endif

} // namespace voxel
