#pragma once
#include "diffusion.hpp"
#include "input.hpp"
#include "pressure.hpp"
#include "transport.hpp"

namespace fluid {
struct Settings {
    int iterations = 160;
    double viscosity = 0.0005;
    double buoyancy = 0.8;
};

#if LAB_CHECKPOINT >= 3
inline bool step(Grid& grid, const Settings& settings) {
    // Từ chối tham số sai trước khi sửa state hoặc tăng tick.
    if (settings.iterations < 1 || settings.iterations > 160 || !std::isfinite(settings.viscosity) || settings.viscosity < 0 || settings.viscosity > 0.003 || !std::isfinite(settings.buoyancy) || settings.buoyancy < 0 || settings.buoyancy > 1.6) {
        return false;
    }
#if LAB_CHECKPOINT >= 9
    addBuoyancy(grid, settings.buoyancy);
#endif
#if LAB_CHECKPOINT >= 8
    diffuseVelocity(grid, settings.viscosity);
    project(grid, settings.iterations);
#endif
#if LAB_CHECKPOINT >= 7
    advectVelocity(grid);
#endif
#if LAB_CHECKPOINT >= 6
    project(grid, settings.iterations);
#elif LAB_CHECKPOINT == 5
    solvePressure(grid, settings.iterations);
#endif
    advectDensity(grid);
#if LAB_CHECKPOINT >= 4
    computeDivergence(grid);
#endif
    ++grid.tick;
    return true;
}
#endif

#if LAB_CHECKPOINT >= 10
struct StepPlan {
    int steps = 0;
    double remainder = 0;
    double dropped = 0;
};

inline StepPlan planSteps(double accumulator, double elapsed) {
    if (!std::isfinite(accumulator) || accumulator < 0 || accumulator >= dt) {
        accumulator = 0;
    }
    if (!std::isfinite(elapsed) || elapsed < 0) {
        elapsed = 0;
    }
    const double accepted = std::min(elapsed, 0.25);
    const double total = accumulator + accepted;
    const double due = std::floor((total + 1e-10) / dt);
    StepPlan plan;
    plan.steps = static_cast<int>(std::min(4.0, due));
    plan.remainder = std::max(0.0, total - due * dt);
    plan.dropped = elapsed - accepted + (due - plan.steps) * dt;
    return plan;
}
#endif
} // namespace fluid
