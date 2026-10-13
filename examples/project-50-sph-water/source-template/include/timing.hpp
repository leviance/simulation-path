#pragma once
#include "emitter.hpp"
#include "solver.hpp"

namespace water {
// The budget bounds work; discarded wall-clock time is reported, never hidden.
#if LAB_CHECKPOINT >= 9
struct FramePlan {
    double remainder = 0;
    int steps = 0;
    double dropped = 0;
};

inline FramePlan advanceFrame(State& state, const Settings& settings, double accumulator, double elapsed, bool pouring, Vec2 nozzle) {
    if (!std::isfinite(elapsed) || elapsed < 0 || !std::isfinite(accumulator) || accumulator < 0) {
        throw std::invalid_argument("Invalid frame time");
    }
    FramePlan plan{accumulator + std::min(elapsed, 0.05), 0, std::max(0.0, elapsed - 0.05)};
    while (plan.steps < 64) {
        const auto prepared = prepare(state, settings);
        if (plan.remainder + 1e-12 < prepared.dt) {
            break;
        }
        integrate(state, prepared.acceleration, prepared.dt);
        if (pouring) {
            pour(state, nozzle);
        }
        plan.remainder = std::max(0.0, plan.remainder - prepared.dt);
        ++plan.steps;
    }
    if (plan.steps == 64) {
        plan.dropped += plan.remainder;
        plan.remainder = 0;
    }
    return plan;
}
#endif
} // namespace water
