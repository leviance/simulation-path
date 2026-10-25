// Provided Project 27 baseline: steering and integration rules are unchanged.
#pragma once
#include "lab.hpp"
#include <set>

namespace lab {
class Random {
    public:
    explicit Random(std::uint32_t seed)
        : state_(seed) {
        if (state_ == 0U) {
            state_ = 0x6d2b79f5U;
        }
    }

    double unit() {
        state_ ^= state_ << 13U;
        state_ ^= state_ >> 17U;
        state_ ^= state_ << 5U;
        return static_cast<double>(state_) / 4294967296.0;
    }

    private:
    std::uint32_t state_{};
};

// [snippet:makeFlock]
inline std::vector<Boid> makeFlock(std::size_t count, std::uint32_t seed, const Params& params) {
    if (!validParams(params) || count > 10000) {
        throw std::invalid_argument("Invalid flock parameters or count > 10000");
    }
    std::vector<Boid> boids;
    boids.reserve(count);
    Random random{seed};
    for (std::size_t index = 0; index < count; ++index) {
        const Vec2 position{random.unit() * params.width, random.unit() * params.height};
        const double angle = random.unit() * 6.2831853071795864769;
        const double speed = params.maxSpeed * 0.6;
        const Vec2 velocity{std::cos(angle) * speed, std::sin(angle) * speed};
        boids.push_back({static_cast<std::uint32_t>(index), position, velocity});
    }
    return boids;
}

// [/snippet:makeFlock]

inline void validateBoids(const std::vector<Boid>& boids, const Params& params) {
    if (!validParams(params) || boids.size() > 10000) {
        throw std::invalid_argument("Invalid domain, parameters or count");
    }
    std::set<std::uint32_t> ids;
    for (const Boid& boid : boids) {
        if (!ids.insert(boid.id).second) {
            throw std::invalid_argument("Duplicate boid ID");
        }
        if (!std::isfinite(boid.position.x) || !std::isfinite(boid.position.y) || !std::isfinite(boid.velocity.x) || !std::isfinite(boid.velocity.y)) {
            throw std::invalid_argument("Non-finite boid state");
        }
        if (!std::isfinite(length(boid.velocity))) {
            throw std::invalid_argument("Velocity norm overflow");
        }
        if (boid.position.x < 0.0 || boid.position.x >= params.width || boid.position.y < 0.0 || boid.position.y >= params.height) {
            throw std::invalid_argument("Position outside periodic domain");
        }
    }
}
} // namespace lab
