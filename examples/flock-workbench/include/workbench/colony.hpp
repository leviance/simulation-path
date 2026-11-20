#pragma once
#include "boids/steering.hpp"
#include "grid/query.hpp"

namespace bench {
inline constexpr int population = 192;
inline constexpr unsigned seed = 28;
inline constexpr double cellSize = 64.0;

// Lấy đúng mô hình, miền tuần hoàn và lưới của P28. Không có bản Boids thứ hai cho UI.
struct Colony {
    lab::Params params;
    std::vector<lab::Boid> birds = lab::makeFlock(population, seed, params);
    std::vector<lab::Boid> next;
    std::size_t selected = 0;
    bool showNeighbors = true;

    // Chọn chim nằm gần giữa ảnh ở lúc mở chương trình để dễ theo dõi.
    Colony() { selectAt({params.width * 0.5, params.height * 0.5}); }

    void selectAt(lab::Vec2 world) {
        double nearest = params.width + params.height;
        for (std::size_t i = 0; i < birds.size(); ++i) {
            const double distance = lab::length(lab::displacement(world, birds[i].position, params));
            if (distance < nearest) {
                nearest = distance;
                selected = i;
            }
        }
    }

    // [snippet selected-neighbors]
    lab::GridQuery observe() const {
        const lab::Grid grid = lab::buildGrid(birds, params, cellSize);
        lab::GridQuery found;
        lab::queryGrid(birds, selected, params, grid, found);
        return found;
    }
    // [/snippet selected-neighbors]

    // [snippet flock-step]
    void step() {
        const lab::Grid grid = lab::buildGrid(birds, params, cellSize);
        lab::GridQuery found;
        next.resize(birds.size());
        for (std::size_t i = 0; i < birds.size(); ++i) {
            lab::queryGrid(birds, i, params, grid, found);
            const auto force = lab::computeSteering(birds, i, found.neighbors, params);
            next[i] = lab::integrateBoid(birds[i], force.acceleration, params, lab::fixedDt);
        }
        birds.swap(next);
    }
    // [/snippet flock-step]
};
} // namespace bench
