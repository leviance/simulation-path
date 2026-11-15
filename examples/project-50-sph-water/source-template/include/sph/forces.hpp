#pragma once
#include "kernel.hpp"
#include "neighbors.hpp"

namespace water {
#if LAB_CHECKPOINT >= 4
// [snippet density]
inline void computeDensity(State& state, const Search& search) {
    for (std::size_t i = 0; i < state.particles.size(); ++i) {
        double density = 0;
        for (const int j : search.lists[i]) {
            const double dx = state.particles[i].x - search.samples[j].x;
            const double dy = state.particles[i].y - search.samples[j].y;
            density += mass * kernel(std::sqrt(dx * dx + dy * dy));
        }
        state.particles[i].density = density;
    }
}

// [/snippet density]
#endif
#if LAB_CHECKPOINT >= 5
// [snippet pressure]
inline double pressure(double density, double soundSpeed) {
    return std::max(0.0, soundSpeed * soundSpeed * (density - restDensity));
}

inline void computePressure(State& state, const Settings& settings) {
    for (auto& p : state.particles) {
        p.pressure = pressure(p.density, settings.soundSpeed);
    }
}

// [/snippet pressure]
// [snippet force]
inline void computeForces(State& state, const Search& search, const Settings& settings) {
    const std::size_t count = state.particles.size();
    for (std::size_t i = 0; i < count; ++i) {
        auto& p = state.particles[i];
        p.ax = 0;
        p.ay = -settings.gravity;
        for (const int j : search.lists[i]) {
            if (static_cast<std::size_t>(j) == i) {
                continue;
            }
            const auto& point = search.samples[j];
            double densityB = restDensity;
            double pressureB = p.pressure;
            if (static_cast<std::size_t>(j) < count) {
                densityB = state.particles[j].density;
                pressureB = state.particles[j].pressure;
            }
            const double dx = p.x - point.x;
            const double dy = p.y - point.y;
            const auto grad = gradient(dx, dy);
            double coefficient = p.pressure / (p.density * p.density) + pressureB / (densityB * densityB);
#if LAB_CHECKPOINT >= 6
            coefficient += artificialViscosity(dx, dy, p.vx - point.vx, p.vy - point.vy, p.density, densityB, settings);
#endif
            p.ax -= mass * coefficient * grad.x;
            p.ay -= mass * coefficient * grad.y;
        }
    }
}

// [/snippet force]
#endif
} // namespace water
