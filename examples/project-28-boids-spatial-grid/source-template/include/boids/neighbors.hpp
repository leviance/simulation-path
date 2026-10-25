// Provided Project 27 baseline: steering and integration rules are unchanged.
#pragma once
#include "flock.hpp"

namespace lab {
// Tại đúng nửa chu kỳ, giữ dấu để offset(a,b) = -offset(b,a).
// [snippet:minimumImage]
inline double minimumImage(double delta, double span) {
    double result = std::fmod(delta, span);
    if (result > span / 2.0) {
        result -= span;
    }
    if (result < -span / 2.0) {
        result += span;
    }
    return result;
}

// [/snippet:minimumImage]

inline Vec2 displacement(Vec2 a, Vec2 b, const Params& params) {
    return {minimumImage(b.x - a.x, params.width), minimumImage(b.y - a.y, params.height)};
}

// [snippet:findNeighbors]
inline void findNeighbors(const std::vector<Boid>& boids, std::size_t targetIndex, const Params& params, std::vector<std::size_t>& neighbors) {
    const Boid& target = boids.at(targetIndex);
    neighbors.clear();
    const double radiusSquared = params.radius * params.radius;
    for (std::size_t index = 0; index < boids.size(); ++index) {
        if (boids[index].id == target.id) {
            continue;
        }
        const Vec2 offset = displacement(target.position, boids[index].position, params);
        const double distanceSquared = offset.x * offset.x + offset.y * offset.y;
        if (distanceSquared <= radiusSquared) {
            neighbors.push_back(index);
        }
    }
}

// [/snippet:findNeighbors]
} // namespace lab
