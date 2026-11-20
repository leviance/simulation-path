#pragma once
#include "volume.hpp"
#include <optional>

namespace slice53 {
// World queries return miss outside the physical box; array access itself never clamps.
#if LAB_CHECKPOINT >= 3
// [snippet nearest]
inline std::optional<double> sampleNearest(const Volume& volume, Vec3 point) {
    const Grid& grid = volume.grid();
    if (!grid.contains(point)) return std::nullopt;
    std::array<int, 3> voxel{};
    for (int axis = 0; axis < 3; ++axis) {
        const double q = grid.coordinate(point[axis], axis);
        voxel[axis] = std::clamp(static_cast<int>(std::floor(q + 0.5)), 0, grid.size[axis] - 1);
    }
    return volume.at(voxel[0], voxel[1], voxel[2]);
}
// [/snippet nearest]
#endif

#if LAB_CHECKPOINT >= 4
struct Contribution {
    std::array<int, 3> voxel{};
    std::size_t address = 0;
    double weight = 0;
    double value = 0;
};

// [snippet trilinear-stencil]
inline std::optional<std::array<Contribution, 8>> linearStencil(const Volume& volume, Vec3 point) {
    const Grid& grid = volume.grid();
    if (!grid.contains(point)) return std::nullopt;
    std::array<int, 3> lower{}, upper{};
    Vec3 fraction;
    for (int axis = 0; axis < 3; ++axis) {
        const double q = std::clamp(grid.coordinate(point[axis], axis), 0.0, static_cast<double>(grid.size[axis] - 1));
        lower[axis] = static_cast<int>(std::floor(q));
        upper[axis] = std::min(lower[axis] + 1, grid.size[axis] - 1);
        fraction[axis] = q - lower[axis];
    }
    std::array<Contribution, 8> result{};
    int entry = 0;
    for (int z = 0; z < 2; ++z) {
        for (int y = 0; y < 2; ++y) {
            for (int x = 0; x < 2; ++x) {
                const std::array<int, 3> corner{x, y, z};
                Contribution contribution;
                contribution.weight = 1.0;
                for (int axis = 0; axis < 3; ++axis) {
                    contribution.voxel[axis] = lower[axis];
                    double axisWeight = 1.0 - fraction[axis];
                    if (corner[axis] == 1) {
                        contribution.voxel[axis] = upper[axis];
                        axisWeight = fraction[axis];
                    }
                    contribution.weight *= axisWeight;
                }
                const auto& v = contribution.voxel;
                contribution.address = volume.index(v[0], v[1], v[2]);
                contribution.value = volume.at(v[0], v[1], v[2]);
                result[entry++] = contribution;
            }
        }
    }
    return result;
}
// [/snippet trilinear-stencil]

// [snippet trilinear-sum]
inline std::optional<double> sampleLinear(const Volume& volume, Vec3 point) {
    const auto stencil = linearStencil(volume, point);
    if (!stencil) return std::nullopt;
    double value = 0;
    for (const Contribution& contribution : *stencil)
        value += contribution.weight * contribution.value;
    return value;
}
// [/snippet trilinear-sum]
#endif

#if LAB_CHECKPOINT >= 3
inline std::optional<double> sample(const Volume& volume, Vec3 point, bool linear) {
#if LAB_CHECKPOINT >= 4
    if (linear) return sampleLinear(volume, point);
#else
    (void)linear;
#endif
    return sampleNearest(volume, point);
}
#endif
} // namespace slice53
