#pragma once
#include "boids/flock.hpp"
#include "coordinates.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 2
// [snippet:buildGrid]
inline Grid buildGrid(const std::vector<Boid>& snapshot, const Params& params, double cellSize) {
    validateBoids(snapshot, params);
    Grid grid = gridGeometry(params, cellSize);
    grid.buckets.resize(grid.columns * grid.rows);
    for (std::size_t index = 0; index < snapshot.size(); ++index) {
        auto& bucket = grid.buckets[gridAddress(snapshot[index].position, grid)];
        if (bucket.empty()) {
            ++grid.occupiedCells;
        }
        bucket.push_back(index);
        grid.maximumOccupancy = std::max(grid.maximumOccupancy, bucket.size());
    }
    return grid;
}

// [/snippet:buildGrid]
#endif
} // namespace lab
