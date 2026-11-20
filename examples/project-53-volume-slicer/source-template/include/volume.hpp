#pragma once
#include "grid.hpp"
#include <vector>

namespace slice53 {
// Storage is x-fastest. Only the original scalar array is used for measurements.
#if LAB_CHECKPOINT >= 2
class Volume {
    Grid grid_;
    std::vector<float> values_;

    public:
    explicit Volume(Grid grid) : grid_(grid), values_(grid.count(), 0.0f) {}

    const Grid& grid() const { return grid_; }
    const std::vector<float>& values() const { return values_; }

    // [snippet flat-index]
    std::size_t index(int x, int y, int z) const {
        if (x < 0 || x >= grid_.size[0] || y < 0 || y >= grid_.size[1] || z < 0 || z >= grid_.size[2])
            throw std::out_of_range("Voxel index outside volume");
        return static_cast<std::size_t>(x) + static_cast<std::size_t>(grid_.size[0]) * (static_cast<std::size_t>(y) + static_cast<std::size_t>(grid_.size[1]) * z);
    }

    float at(int x, int y, int z) const { return values_.at(index(x, y, z)); }

    void set(int x, int y, int z, double value) {
        if (!std::isfinite(value) || std::abs(value) > 1e30)
            throw std::invalid_argument("Scalar must be finite and representable");
        values_.at(index(x, y, z)) = static_cast<float>(value);
    }
    // [/snippet flat-index]
};
#endif
} // namespace slice53
