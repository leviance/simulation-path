#pragma once
#include "boids/lab.hpp"

namespace lab {
struct Grid {
    double width{};
    double height{};
    double cellSize{};
    std::size_t columns{};
    std::size_t rows{};
    std::vector<std::vector<std::size_t>> buckets;
    std::size_t occupiedCells{};
    std::size_t maximumOccupancy{};
};

#if LAB_CHECKPOINT >= 1
// [snippet:gridGeometry]
inline Grid gridGeometry(const Params& params, double cellSize) {
    if (!validParams(params) || !std::isfinite(cellSize) || cellSize < 4.0 || cellSize > 1e6) {
        throw std::invalid_argument("Invalid domain or cell size");
    }
    Grid grid{};
    grid.width = params.width;
    grid.height = params.height;
    grid.cellSize = cellSize;
    grid.columns = static_cast<std::size_t>(std::max(1.0, std::ceil(params.width / cellSize)));
    grid.rows = static_cast<std::size_t>(std::max(1.0, std::ceil(params.height / cellSize)));
    if (grid.columns > 4096 || grid.rows > 4096 / grid.columns) {
        throw std::invalid_argument("Grid exceeds 4096 cells");
    }
    return grid;
}

inline std::size_t gridAddress(Vec2 position, const Grid& grid) {
    if (!std::isfinite(position.x) || !std::isfinite(position.y)) {
        throw std::invalid_argument("Invalid grid position");
    }
    const double x = wrap(position.x, grid.width);
    const double y = wrap(position.y, grid.height);
    const auto column = std::min(grid.columns - 1, static_cast<std::size_t>(std::floor(x / grid.cellSize)));
    const auto row = std::min(grid.rows - 1, static_cast<std::size_t>(std::floor(y / grid.cellSize)));
    return row * grid.columns + column;
}

// [/snippet:gridGeometry]
#endif
} // namespace lab
