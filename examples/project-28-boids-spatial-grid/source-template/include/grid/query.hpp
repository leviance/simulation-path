#pragma once
#include "boids/neighbors.hpp"
#include "storage.hpp"
#include <utility>

namespace lab {
struct GridQuery {
    std::vector<std::size_t> cells;
    std::vector<std::size_t> candidates;
    std::vector<std::size_t> neighbors;
};

#if LAB_CHECKPOINT >= 3
// [snippet:axisCells]
inline std::vector<std::size_t> axisCells(double center, double radius, double extent, double cellSize) {
    if (!std::isfinite(center) || !std::isfinite(radius) || !std::isfinite(extent) || !std::isfinite(cellSize) || extent <= 0 || cellSize < 4 || radius < 0 || radius >= extent / 2) {
        throw std::invalid_argument("Invalid periodic interval");
    }
    const double countValue = std::max(1.0, std::ceil(extent / cellSize));
    if (countValue > 4096) {
        throw std::invalid_argument("Too many cells on one axis");
    }
    const auto count = static_cast<std::size_t>(countValue);
    const double normalized = wrap(center, extent);
    const double low = normalized - radius;
    const double high = normalized + radius;
    std::vector<std::pair<double, double>> intervals;
    if (low < 0) {
        intervals = {{0, high}, {low + extent, extent}};
    } else if (high >= extent) {
        intervals = {{low, extent}, {0, high - extent}};
    } else {
        intervals = {{low, high}};
    }
    std::vector<std::size_t> cells;
    for (const auto& interval : intervals) {
        const auto first = static_cast<std::size_t>(std::floor(interval.first / cellSize));
        const auto last = std::min(count - 1, static_cast<std::size_t>(std::floor(interval.second / cellSize)));
        for (std::size_t cell = first; cell <= last; ++cell) {
            if (std::find(cells.begin(), cells.end(), cell) == cells.end()) {
                cells.push_back(cell);
            }
        }
    }
    return cells;
}

// [/snippet:axisCells]
#endif

#if LAB_CHECKPOINT >= 4
// [snippet:queryGrid]
inline void queryGrid(const std::vector<Boid>& snapshot, std::size_t targetIndex, const Params& params, const Grid& grid, GridQuery& query) {
    const Boid& target = snapshot.at(targetIndex);
    if (grid.width != params.width || grid.height != params.height) {
        throw std::invalid_argument("Query/grid domain mismatch");
    }
    query.cells.clear();
    query.candidates.clear();
    query.neighbors.clear();
    const auto columns = axisCells(target.position.x, params.radius, grid.width, grid.cellSize);
    const auto rows = axisCells(target.position.y, params.radius, grid.height, grid.cellSize);
    const double radiusSquared = params.radius * params.radius;
    for (std::size_t row : rows) {
        for (std::size_t column : columns) {
            const std::size_t cell = row * grid.columns + column;
            query.cells.push_back(cell);
            for (std::size_t index : grid.buckets.at(cell)) {
                const Boid& other = snapshot.at(index);
                if (other.id == target.id) {
                    continue;
                }
                query.candidates.push_back(index);
                const Vec2 offset = displacement(target.position, other.position, params);
                if (offset.x * offset.x + offset.y * offset.y <= radiusSquared) {
                    query.neighbors.push_back(index);
                }
            }
        }
    }
}

// [/snippet:queryGrid]
#endif
} // namespace lab
