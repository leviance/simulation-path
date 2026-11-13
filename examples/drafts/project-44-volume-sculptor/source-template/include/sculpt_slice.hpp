#pragma once

#include "sculpt_grid.hpp"

namespace sculpt {

struct SliceState {
    bool enabled{};
    int axis{2};
    int layer{};
    float u{0.5F}, v{0.5F};

    void validate(const GridSpec& grid) const {
        grid.validate();
        if (axis < 0 || axis > 2 || layer < 0 || layer >= grid.samples || !std::isfinite(u) || !std::isfinite(v) || u < 0 || u > 1 || v < 0 || v > 1)
            throw std::invalid_argument("Slice needs a valid axis/layer and finite normalized probe coordinates");
    }
};

// Cyclic axes: X -> YZ, Y -> ZX, Z -> XY. Screen v grows down, world vertical grows up.
inline Vec3 sliceGridCoordinate(const GridSpec& grid, const SliceState& slice) {
    slice.validate(grid);
    std::array<float, 3> coordinate{};
    coordinate[slice.axis] = static_cast<float>(slice.layer);
    coordinate[(slice.axis + 1) % 3] = slice.u * (grid.samples - 1);
    coordinate[(slice.axis + 2) % 3] = (1 - slice.v) * (grid.samples - 1);
    return {coordinate[0], coordinate[1], coordinate[2]};
}

inline Vec3 sliceWorldPoint(const GridSpec& grid, const SliceState& slice) {
    return grid.worldFromGrid(sliceGridCoordinate(grid, slice));
}

} // namespace sculpt
