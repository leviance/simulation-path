#pragma once
#include "kernel.hpp"
#include "neighbors.hpp"

namespace water {
// Density and pressure are computed for every particle before evaluating forces.
#if LAB_CHECKPOINT >= 4
inline void computeDensity(State& state, const Neighborhood& neighbors) {
    for (std::size_t i = 0; i < state.particles.size(); ++i) {
        auto& p = state.particles[i];
        double density = 0;
        for (const auto j : neighbors.lists[i]) {
            density += mass * kernel(length(subtract(p.position, neighbors.positions[j])));
        }
        p.density = density;
    }
}
#endif

#if LAB_CHECKPOINT >= 5
inline void computePressure(State& state, double soundSpeed) {
    for (auto& p : state.particles) {
        p.pressure = std::max(0.0, soundSpeed * soundSpeed * (p.density - restDensity));
    }
}
#endif

#if LAB_CHECKPOINT >= 2
inline std::vector<Vec2> accelerations(const State& state, [[maybe_unused]] const Neighborhood& neighbors, const Settings& settings) {
    std::vector<Vec2> result(state.particles.size(), {0, -settings.gravity});
#if LAB_CHECKPOINT >= 5
    for (std::size_t i = 0; i < state.particles.size(); ++i) {
        const auto& p = state.particles[i];
        for (const auto j : neighbors.lists[i]) {
            if (j == i) {
                continue;
            }
            const auto displacement = subtract(p.position, neighbors.positions[j]);
            const auto grad = gradient(displacement);
            double densityB = restDensity;
            double pressureB = p.pressure;
            [[maybe_unused]] Vec2 velocityB{0, 0};
            if (j < state.particles.size()) {
                const auto& other = state.particles[j];
                densityB = other.density;
                pressureB = other.pressure;
                velocityB = other.velocity;
            }
            double coefficient = p.pressure / (p.density * p.density) + pressureB / (densityB * densityB);
#if LAB_CHECKPOINT >= 6
            coefficient += artificialViscosity(displacement, subtract(p.velocity, velocityB), p.density, densityB, settings.soundSpeed, settings.alpha);
#endif
            result[i].x -= mass * coefficient * grad.x;
            result[i].y -= mass * coefficient * grad.y;
        }
    }
#endif
    return result;
}

inline void collide(Vec2& position, Vec2& velocity) {
    const double radius = spacing / 2;
    if (position.x < radius) {
        position.x = radius;
        if (velocity.x < 0) {
            velocity.x *= -0.1;
        }
    }
    if (position.x > 1 - radius) {
        position.x = 1 - radius;
        if (velocity.x > 0) {
            velocity.x *= -0.1;
        }
    }
    if (position.y < radius) {
        position.y = radius;
        if (velocity.y < 0) {
            velocity.y *= -0.1;
        }
    }
    // No upper SPH wall; this analytic ceiling only bounds the teaching demo.
    if (position.y > 0.8 - radius) {
        position.y = 0.8 - radius;
        if (velocity.y > 0) {
            velocity.y *= -0.1;
        }
    }
}

inline void integrate(State& state, const std::vector<Vec2>& acceleration, double dt) {
    for (std::size_t i = 0; i < state.particles.size(); ++i) {
        auto& p = state.particles[i];
        p.velocity.x += acceleration[i].x * dt;
        p.velocity.y += acceleration[i].y * dt;
        p.position.x += p.velocity.x * dt;
        p.position.y += p.velocity.y * dt;
        collide(p.position, p.velocity);
    }
    state.time += dt;
    if (!finiteState(state)) {
        throw std::runtime_error("Non-finite result; simulation stopped");
    }
}

struct Prepared {
    Neighborhood neighbors;
    std::vector<Vec2> acceleration;
    double dt = maxDt;
};

#if LAB_CHECKPOINT >= 9
inline double chooseDt(const State& state, const std::vector<Vec2>& acceleration, const Settings& settings) {
    validateSettings(settings);
    if (acceleration.size() != state.particles.size() || !finiteState(state)) {
        throw std::invalid_argument("Non-finite or incomplete timestep input");
    }
    double speed = 0;
    double force = 0;
    for (std::size_t i = 0; i < state.particles.size(); ++i) {
        if (!std::isfinite(acceleration[i].x) || !std::isfinite(acceleration[i].y)) {
            throw std::invalid_argument("Non-finite acceleration in timestep input");
        }
        speed = std::max(speed, length(state.particles[i].velocity));
        force = std::max(force, length(acceleration[i]));
    }
    const double acoustic = 0.25 * h / (settings.soundSpeed + speed);
    const double forceBound = 0.25 * std::sqrt(h / std::max(force, 1e-12));
    const double dt = std::min({maxDt, acoustic, forceBound});
    if (!std::isfinite(dt) || dt < 1e-6) {
        throw std::runtime_error("SPH step too small: reset or reduce the forcing");
    }
    return dt;
}
#endif

inline Prepared prepare(State& state, const Settings& settings) {
    validateSettings(settings);
    if (!finiteState(state)) {
        throw std::runtime_error("Non-finite SPH state");
    }
    Prepared result;
#if LAB_CHECKPOINT >= 4
    result.neighbors = buildNeighbors(state, settings.useGrid);
    computeDensity(state, result.neighbors);
#endif
#if LAB_CHECKPOINT >= 5
    computePressure(state, settings.soundSpeed);
#endif
    result.acceleration = accelerations(state, result.neighbors, settings);
#if LAB_CHECKPOINT >= 9
    result.dt = chooseDt(state, result.acceleration, settings);
#endif
    return result;
}

inline void step(State& state, const Settings& settings) {
    const auto prepared = prepare(state, settings);
    integrate(state, prepared.acceleration, prepared.dt);
}
#endif
} // namespace water
