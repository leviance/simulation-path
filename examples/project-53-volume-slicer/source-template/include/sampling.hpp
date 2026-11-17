#pragma once
#include "volume.hpp"

namespace slices {
#if LAB_CHECKPOINT >= 5
// [snippet trilinear]
inline std::optional<double> sampleLinear(const Volume& volume, Point point) {
    if (!inside(volume.grid, point)) {
        return std::nullopt;
    }
    std::array<int, 3> low{};
    std::array<int, 3> high{};
    Point fraction{};
    for (int axis = 0; axis < 3; ++axis) {
        const double coordinate = std::clamp(gridCoordinate(volume.grid, axis, point[axis]), 0.0, static_cast<double>(volume.grid.count[axis] - 1));
        low[axis] = static_cast<int>(std::floor(coordinate));
        high[axis] = std::min(low[axis] + 1, volume.grid.count[axis] - 1);
        fraction[axis] = coordinate - low[axis];
    }

    // Interpolate four x-edges, then two y-edges, then the z-edge.
    const double c00 = std::lerp(volume.voxel(low[0], low[1], low[2]), volume.voxel(high[0], low[1], low[2]), fraction[0]);
    const double c10 = std::lerp(volume.voxel(low[0], high[1], low[2]), volume.voxel(high[0], high[1], low[2]), fraction[0]);
    const double c01 = std::lerp(volume.voxel(low[0], low[1], high[2]), volume.voxel(high[0], low[1], high[2]), fraction[0]);
    const double c11 = std::lerp(volume.voxel(low[0], high[1], high[2]), volume.voxel(high[0], high[1], high[2]), fraction[0]);
    const double c0 = std::lerp(c00, c10, fraction[1]);
    const double c1 = std::lerp(c01, c11, fraction[1]);
    return std::lerp(c0, c1, fraction[2]);
}

// [/snippet trilinear]
#endif
} // namespace slices
