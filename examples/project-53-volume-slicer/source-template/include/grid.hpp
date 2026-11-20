#pragma once
#include "math.hpp"
#include <cstddef>

namespace slice53 {
// The origin is the lower physical face, not the centre of voxel (0,0,0).
struct Grid {
    std::array<int, 3> size{128, 128, 128};
    Vec3 origin{-80, -96, -112};
    Vec3 spacing{1.25, 1.5, 1.75};

    // [snippet grid-count]
    std::size_t count() const {
        std::size_t result = 1;
        for (int axis = 0; axis < 3; ++axis) {
            if (size[axis] < 1 || size[axis] > 128)
                throw std::invalid_argument("Each dimension must be in [1,128]");
            if (!std::isfinite(origin[axis]) || !std::isfinite(spacing[axis]) || spacing[axis] <= 0)
                throw std::invalid_argument("Finite origin and positive spacing required");
            if (!std::isfinite(origin[axis] + size[axis] * spacing[axis]))
                throw std::invalid_argument("Physical extent must be finite");
            result *= static_cast<std::size_t>(size[axis]);
        }
        return result;
    }
    // [/snippet grid-count]

    Vec3 extent() const {
        return {size[0] * spacing.x, size[1] * spacing.y, size[2] * spacing.z};
    }

    // [snippet voxel-centre]
    Vec3 centre(int x, int y, int z) const {
        return {origin.x + (x + 0.5) * spacing.x, origin.y + (y + 0.5) * spacing.y, origin.z + (z + 0.5) * spacing.z};
    }

    double coordinate(double world, int axis) const {
        return (world - origin[axis]) / spacing[axis] - 0.5;
    }
    // [/snippet voxel-centre]

    bool contains(Vec3 point) const {
        if (!finite(point)) return false;
        const Vec3 upper = origin + extent();
        for (int axis = 0; axis < 3; ++axis)
            if (point[axis] < origin[axis] || point[axis] > upper[axis]) return false;
        return true;
    }

    Vec3 clamp(Vec3 point) const {
        const Vec3 upper = origin + extent();
        for (int axis = 0; axis < 3; ++axis)
            point[axis] = std::clamp(point[axis], origin[axis], upper[axis]);
        return point;
    }
};

inline Grid makeGrid(int side) {
    Grid grid;
    grid.size = {side, side, side};
    if (side < 1 || side > 128) throw std::invalid_argument("Unsupported grid side");
    grid.spacing = {160.0 / side, 192.0 / side, 224.0 / side};
    grid.count();
    return grid;
}
} // namespace slice53
