#pragma once
#include "model.hpp"
#include <optional>
#include <vector>

namespace slices {
#if LAB_CHECKPOINT >= 2
// [snippet storage]
struct Volume {
    Grid grid;
    std::vector<double> values;

    explicit Volume(Grid shape = {})
        : grid(shape) {
        std::size_t total = 1;
        for (int axis = 0; axis < 3; ++axis) {
            if (grid.count[axis] < 1 || grid.count[axis] > 128 || !std::isfinite(grid.spacing[axis]) || grid.spacing[axis] <= 0) {
                throw std::invalid_argument("Count 1..128; spacing finite and positive");
            }
            total *= static_cast<std::size_t>(grid.count[axis]);
        }
        values.resize(total);
    }

    std::size_t index(int x, int y, int z) const {
        if (x < 0 || x >= grid.count[0] || y < 0 || y >= grid.count[1] || z < 0 || z >= grid.count[2]) {
            throw std::out_of_range("Voxel index outside volume");
        }
        return static_cast<std::size_t>(x) + static_cast<std::size_t>(grid.count[0]) * (y + static_cast<std::size_t>(grid.count[1]) * z);
    }

    double voxel(int x, int y, int z) const {
        return values.at(index(x, y, z));
    }
};

// [/snippet storage]

// [snippet fill]
inline void fillVolume(Volume& volume, Preset preset) {
    const Grid& grid = volume.grid;
    const double denominator = grid.count[0] - 1 + 2 * (grid.count[1] - 1) + 4 * (grid.count[2] - 1);
    for (int z = 0; z < grid.count[2]; ++z) {
        for (int y = 0; y < grid.count[1]; ++y) {
            for (int x = 0; x < grid.count[0]; ++x) {
                const Point point{worldCoordinate(grid, 0, x), worldCoordinate(grid, 1, y), worldCoordinate(grid, 2, z)};
                double value = 0;
                if (preset == Preset::Ramp) {
                    value = 0;
                    if (denominator > 0) {
                        value = (x + 2 * y + 4 * z) / denominator;
                    }
                } else {
                    value = fieldValue(point, preset);
                }
                volume.values[volume.index(x, y, z)] = value;
            }
        }
    }
}

// [/snippet fill]

inline void fillPhantom(Volume& volume) {
    fillVolume(volume, Preset::Phantom);
}

inline void fillOrientation(Volume& volume) {
    fillVolume(volume, Preset::Ramp);
}

inline bool inside(const Grid& grid, Point point) {
    for (int axis = 0; axis < 3; ++axis) {
        if (!std::isfinite(point[axis]) || point[axis] < lower(grid, axis) || point[axis] > -lower(grid, axis)) {
            return false;
        }
    }
    return true;
}

// [snippet nearest]
inline std::optional<double> sampleNearest(const Volume& volume, Point point) {
    if (!inside(volume.grid, point)) {
        return std::nullopt;
    }
    std::array<int, 3> index{};
    for (int axis = 0; axis < 3; ++axis) {
        const double coordinate = gridCoordinate(volume.grid, axis, point[axis]);
        index[axis] = std::clamp(static_cast<int>(std::floor(coordinate + 0.5)), 0, volume.grid.count[axis] - 1);
    }
    return volume.voxel(index[0], index[1], index[2]);
}

// [/snippet nearest]
#endif
} // namespace slices
