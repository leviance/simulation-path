#pragma once
#include "raster.hpp"
#include "world.hpp"

namespace voxel {
#if LAB_CHECKPOINT >= 2
inline constexpr double minimumNearDepth = 64;
inline constexpr double pickReach = 96;

struct ViewVolume {
    double near;
    double far;
};

// Depth trực giao là hàm tuyến tính: chỉ cần xét tám góc của mỗi chunk.
// Near phải đứng trước cả chunk cũ đang chờ unload sau khi teleport.
inline ViewVolume cameraVolume(const World& world, const Camera& camera) {
    double nearest = minimumNearDepth - 1;
    for (const auto& [key, entry] : world.chunks) {
        (void)entry;
        for (int x : {0, side}) {
            for (int y : {0, side}) {
                for (int z : {0, side}) {
                    const Vec3 point{key.x * side - world.player.x + 8 + x, static_cast<double>(y), key.z * side - world.player.z + 8 + z};
                    nearest = std::max(nearest, project(point, camera).depth);
                }
            }
        }
    }
    const double near = std::max(minimumNearDepth, std::ceil(nearest) + 1);
    return {near, near - pickReach};
}
#endif
} // namespace voxel
