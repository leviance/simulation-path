#pragma once
#include "boundary.hpp"
#include "forces.hpp"

namespace water {
#if LAB_CHECKPOINT >= 8
// [snippet timestep]
inline double chooseDt(const State& state, const Settings& settings) {
    validate(settings);
    requireFinite(state);
    double maximumSpeed = 0;
    double maximumAcceleration = 0;
    for (const auto& p : state.particles) {
        maximumSpeed = std::max(maximumSpeed, std::hypot(p.vx, p.vy));
        maximumAcceleration = std::max(maximumAcceleration, std::hypot(p.ax, p.ay));
    }
    const double acoustic = 0.25 * h / (settings.soundSpeed + maximumSpeed + 3);
    const double forceBound = 0.25 * std::sqrt(h / std::max(maximumAcceleration, 1e-12));
    const double dt = std::min({maxDt, acoustic, forceBound});
    if (!std::isfinite(dt) || dt < 1e-7) {
        throw std::runtime_error("dt below 1e-7 s: pause and reduce forcing/reset");
    }
    return dt;
}

// [/snippet timestep]
#endif

// Chạy khi cần đọc density ở đúng tọa độ hiện tại, không tái dùng giá trị trước integrate.
inline void inspectCurrent(State& state, const Settings& settings) {
    validate(settings);
    requireFinite(state);
#if LAB_CHECKPOINT >= 4
    bool useGrid = false;
#if LAB_CHECKPOINT >= 7
    useGrid = settings.useGrid;
#endif
    auto search = buildNeighbors(state, useGrid);
    computeDensity(state, search);
    state.candidates = search.candidates;
#if LAB_CHECKPOINT >= 5
    computePressure(state, settings);
#endif
#endif
    requireFinite(state);
}

// [snippet step]
inline void step(State& state, const Settings& settings) {
    validate(settings);
    requireFinite(state);
#if LAB_CHECKPOINT >= 2
    for (auto& p : state.particles) {
        p.ax = 0;
        p.ay = -settings.gravity;
    }
#if LAB_CHECKPOINT >= 4
    bool useGrid = false;
#if LAB_CHECKPOINT >= 7
    useGrid = settings.useGrid;
#endif
    auto search = buildNeighbors(state, useGrid);
    computeDensity(state, search);
    state.candidates = search.candidates;
#if LAB_CHECKPOINT >= 5
    computePressure(state, settings);
    computeForces(state, search, settings);
#endif
#endif
    requireFinite(state);
#if LAB_CHECKPOINT >= 8
    const double dt = chooseDt(state, settings);
#elif LAB_CHECKPOINT >= 5
    const double dt = 0.00025;
#else
    const double dt = 0.01;
#endif
#if LAB_CHECKPOINT >= 11
    movePaddle(state, dt);
#endif
    integrate(state, dt);
    requireFinite(state);
#endif
}

// [/snippet step]
} // namespace water
