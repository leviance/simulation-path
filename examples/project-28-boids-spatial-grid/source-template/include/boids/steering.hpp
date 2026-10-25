// Provided Project 27 baseline: steering and integration rules are unchanged.
#pragma once
#include "neighbors.hpp"

namespace lab {
struct Steering {
    Vec2 separation{};
    Vec2 alignment{};
    Vec2 cohesion{};
    Vec2 acceleration{};
};

// [snippet:desiredSteering]
inline Vec2 desiredSteering(Vec2 direction, Vec2 velocity, const Params& params) {
    const double magnitude = length(direction);
    if (magnitude <= vectorEpsilon) {
        return {};
    }
    const Vec2 desiredVelocity = multiply(direction, params.maxSpeed / magnitude);
    const Vec2 velocityChange = subtract(desiredVelocity, velocity);
    const Vec2 acceleration = multiply(velocityChange, 1.0 / responseTime);
    return limit(acceleration, params.maxAcceleration);
}

// [/snippet:desiredSteering]

// Cặp trùng vị trí nhận hai hướng đối nhau, quyết định theo ID chứ không theo index.
// [snippet:overlapDirection]
inline Vec2 overlapDirection(std::uint32_t a, std::uint32_t b) {
    double sign = 1.0;
    if (a < b) {
        sign = -1.0;
    }
    if (((a ^ b) & 1U) == 0U) {
        return {sign, 0.0};
    }
    return {0.0, sign};
}

// [/snippet:overlapDirection]

// [snippet:computeSteering]
inline Steering computeSteering(const std::vector<Boid>& boids, std::size_t targetIndex, const std::vector<std::size_t>& neighbors, const Params& params) {
    const Boid& target = boids.at(targetIndex);
    Vec2 separationSum{};
    Vec2 velocitySum{};
    Vec2 offsetSum{};
    for (std::size_t index : neighbors) {
        const Boid& other = boids.at(index);
        const Vec2 offset = displacement(target.position, other.position, params);
        const double distanceSquared = offset.x * offset.x + offset.y * offset.y;
        Vec2 away{};
        if (distanceSquared <= vectorEpsilon * vectorEpsilon) {
            away = overlapDirection(target.id, other.id);
        } else {
            away = multiply(offset, -1.0 / distanceSquared);
        }
        separationSum = add(separationSum, away);
        velocitySum = add(velocitySum, other.velocity);
        offsetSum = add(offsetSum, offset);
    }
    Steering steering{};
    steering.separation = desiredSteering(separationSum, target.velocity, params);
    steering.alignment = desiredSteering(velocitySum, target.velocity, params);
    steering.cohesion = desiredSteering(offsetSum, target.velocity, params);
    Vec2 acceleration = multiply(steering.separation, params.separationWeight);
    acceleration = add(acceleration, multiply(steering.alignment, params.alignmentWeight));
    acceleration = add(acceleration, multiply(steering.cohesion, params.cohesionWeight));
    steering.acceleration = limit(acceleration, params.maxAcceleration);
    return steering;
}

// [/snippet:computeSteering]
} // namespace lab
