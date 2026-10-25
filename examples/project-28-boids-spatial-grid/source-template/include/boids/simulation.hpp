// Provided Project 27 baseline: steering and integration rules are unchanged.
#pragma once
#include "steering.hpp"
#include <chrono>

namespace lab {
struct Metrics {
    std::size_t comparisons{};
    std::size_t neighbors{};
    double queryMs{};
    double updateMs{};
    double totalMs{};
};

inline double milliseconds(std::chrono::steady_clock::time_point start, std::chrono::steady_clock::time_point end) {
    return std::chrono::duration<double, std::milli>(end - start).count();
}

// [snippet:stepBoids]
inline Metrics stepBoids(const std::vector<Boid>& boids, std::vector<Boid>& output, const Params& params, double dt) {
    const auto start = std::chrono::steady_clock::now();
    if (&boids == &output) {
        throw std::invalid_argument("Read and write buffers must be different");
    }
    validateBoids(boids, params);
    if (!std::isfinite(dt) || dt < 0.0 || dt > 0.05) {
        throw std::invalid_argument("dt outside [0, 0.05]");
    }
    output.resize(boids.size());
    std::vector<std::size_t> neighbors;
    neighbors.reserve(boids.size());
    Metrics metrics{};
    for (std::size_t index = 0; index < boids.size(); ++index) {
        const auto queryStart = std::chrono::steady_clock::now();
        findNeighbors(boids, index, params, neighbors);
        metrics.comparisons += boids.size() - 1;
        metrics.neighbors += neighbors.size();
        const auto queryEnd = std::chrono::steady_clock::now();
        metrics.queryMs += milliseconds(queryStart, queryEnd);
        Vec2 acceleration{};
        const Steering steering = computeSteering(boids, index, neighbors, params);
        acceleration = steering.acceleration;
        output[index] = integrateBoid(boids[index], acceleration, params, dt);
        metrics.updateMs += milliseconds(queryEnd, std::chrono::steady_clock::now());
    }
    metrics.totalMs = milliseconds(start, std::chrono::steady_clock::now());
    return metrics;
}

// [/snippet:stepBoids]
} // namespace lab
