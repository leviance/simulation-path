#pragma once
#include "neighbors.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 4
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
#if LAB_CHECKPOINT >= 5
    Vec2 velocitySum{};
#endif
#if LAB_CHECKPOINT >= 6
    Vec2 offsetSum{};
#endif
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
#if LAB_CHECKPOINT >= 5
        velocitySum = add(velocitySum, other.velocity);
#endif
#if LAB_CHECKPOINT >= 6
        offsetSum = add(offsetSum, offset);
#endif
    }
    Steering steering{};
    steering.separation = desiredSteering(separationSum, target.velocity, params);
#if LAB_CHECKPOINT >= 5
    steering.alignment = desiredSteering(velocitySum, target.velocity, params);
#endif
#if LAB_CHECKPOINT >= 6
    steering.cohesion = desiredSteering(offsetSum, target.velocity, params);
#endif
    Vec2 acceleration = multiply(steering.separation, params.separationWeight);
#if LAB_CHECKPOINT >= 5
    acceleration = add(acceleration, multiply(steering.alignment, params.alignmentWeight));
#endif
#if LAB_CHECKPOINT >= 6
    acceleration = add(acceleration, multiply(steering.cohesion, params.cohesionWeight));
#endif
    steering.acceleration = limit(acceleration, params.maxAcceleration);
    return steering;
}
// [/snippet:computeSteering]
#endif
} // namespace lab
