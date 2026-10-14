#pragma once
#include "volume.hpp"

namespace slices {
#if LAB_CHECKPOINT >= 5
// Extend the boundary sample to the voxel edge, but never sample outside the physical box.
inline std::optional<double> sampleLinear(const Volume& volume, Point point) {
    if (!inside(volume.grid, point))
        return std::nullopt;
    std::array<int, 3> low{};
    std::array<int, 3> high{};
    Point fraction{};
    for (int axis = 0; axis < 3; ++axis) {
        const double coordinate = std::clamp(gridCoordinate(volume.grid, axis, point[axis]), 0.0, static_cast<double>(volume.grid.count[axis] - 1));
        low[axis] = static_cast<int>(std::floor(coordinate));
        high[axis] = std::min(low[axis] + 1, volume.grid.count[axis] - 1);
        fraction[axis] = coordinate - low[axis];
    }

    double result = 0;
    for (int z = 0; z < 2; ++z) {
        for (int y = 0; y < 2; ++y) {
            for (int x = 0; x < 2; ++x) {
                const std::array<int, 3> corner{x, y, z};
                std::array<int, 3> index = low;
                double weight = 1;
                for (int axis = 0; axis < 3; ++axis) {
                    double factor = 1 - fraction[axis];
                    if (corner[axis] == 1) {
                        index[axis] = high[axis];
                        factor = fraction[axis];
                    }
                    weight *= factor;
                }
                result += weight * volume.voxel(index[0], index[1], index[2]);
            }
        }
    }
    return result;
}
#endif
} // namespace slices
