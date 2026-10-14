#pragma once
#include "model.hpp"
#include <optional>
#include <vector>

namespace slices {
#if LAB_CHECKPOINT >= 2
// Checked dimensions prevent overflow and accidental allocations of huge datasets.
struct Volume {
    Grid grid;
    std::vector<double> values;

    explicit Volume(Grid specification = {})
        : grid(specification) {
        std::size_t total = 1;
        for (int axis = 0; axis < 3; ++axis) {
            if (grid.count[axis] < 1 || grid.count[axis] > 128 || !std::isfinite(grid.spacing[axis]) || grid.spacing[axis] <= 0) {
                throw std::invalid_argument("Count must be 1..128; spacing finite and positive");
            }
            total *= static_cast<std::size_t>(grid.count[axis]);
        }
        values.resize(total);
    }

    std::size_t index(int x, int y, int z) const {
        if (x < 0 || x >= grid.count[0] || y < 0 || y >= grid.count[1] || z < 0 || z >= grid.count[2]) {
            throw std::out_of_range("Voxel index outside volume");
        }
        return static_cast<std::size_t>(x) + static_cast<std::size_t>(grid.count[0]) * (static_cast<std::size_t>(y) + static_cast<std::size_t>(grid.count[1]) * static_cast<std::size_t>(z));
    }

    double voxel(int x, int y, int z) const {
        return values.at(index(x, y, z));
    }
};

inline void fillPhantom(Volume& volume) {
    for (int z = 0; z < volume.grid.count[2]; ++z) {
        for (int y = 0; y < volume.grid.count[1]; ++y) {
            for (int x = 0; x < volume.grid.count[0]; ++x) {
                const Point point{worldCoordinate(volume.grid, 0, x), worldCoordinate(volume.grid, 1, y), worldCoordinate(volume.grid, 2, z)};
                volume.values[volume.index(x, y, z)] = phantom(point);
            }
        }
    }
}

inline bool inside(const Grid& grid, Point point) {
    for (int axis = 0; axis < 3; ++axis) {
        if (!std::isfinite(point[axis]) || point[axis] < lower(grid, axis) || point[axis] > -lower(grid, axis))
            return false;
    }
    return true;
}

inline void fillOrientation(Volume& volume) {
    const auto count = volume.grid.count;
    const double denominator = (count[0] - 1) + 2 * (count[1] - 1) + 4 * (count[2] - 1);
    for (int z = 0; z < count[2]; ++z) {
        for (int y = 0; y < count[1]; ++y) {
            for (int x = 0; x < count[0]; ++x) {
                double value = 0;
                if (denominator > 0)
                    value = (x + 2 * y + 4 * z) / denominator;
                volume.values[volume.index(x, y, z)] = value;
            }
        }
    }
}

inline std::optional<double> sampleNearest(const Volume& volume, Point point) {
    if (!inside(volume.grid, point))
        return std::nullopt;
    std::array<int, 3> index{};
    for (int axis = 0; axis < 3; ++axis) {
        const double coordinate = gridCoordinate(volume.grid, axis, point[axis]);
        index[axis] = std::clamp(static_cast<int>(std::floor(coordinate + 0.5)), 0, volume.grid.count[axis] - 1);
    }
    return volume.voxel(index[0], index[1], index[2]);
}
#endif
} // namespace slices
