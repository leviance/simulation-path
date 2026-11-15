#pragma once
#include "brush.hpp"
#include "detail.hpp"
#include "project.hpp"
#include "scenes.hpp"
#include "sources.hpp"
#include "transport.hpp"
#include "viscosity.hpp"
#include "vorticity.hpp"

namespace fluid {
inline bool validParameters(const Parameters& parameters) {
    if (!availablePressureMethod(parameters.method)) {
        return false;
    }
    if (!std::isfinite(parameters.viscosity) || parameters.viscosity < 0 || parameters.viscosity > 0.003) {
        return false;
    }
    if (!std::isfinite(parameters.buoyancy) || parameters.buoyancy < 0 || parameters.buoyancy > 2) {
        return false;
    }
    if (!std::isfinite(parameters.confinement) || parameters.confinement < 0 || parameters.confinement > 20) {
        return false;
    }
    int maximum = 160;
#if LAB_CHECKPOINT >= 11
    if (parameters.method == PressureMethod::CG) {
        maximum = 384;
    }
#endif
#if LAB_CHECKPOINT >= 14
    if (parameters.method == PressureMethod::PCG) {
        maximum = 384;
    }
#endif
    return parameters.pressureBudget >= 1 && parameters.pressureBudget <= maximum;
}

#if LAB_CHECKPOINT >= 3
// [snippet step]
inline bool step(Grid& grid, const Parameters& parameters, [[maybe_unused]] Scene scene) {
    if (!validParameters(parameters) || !finiteState(grid)) {
        return false;
    }
#if LAB_CHECKPOINT >= 8
    if (parameters.emit && scene == Scene::TwinJets) {
        emitSmoke(grid);
    }
    addForces(grid, parameters, scene);
#endif
#if LAB_CHECKPOINT >= 13
    confineVorticity(grid, parameters.confinement);
#endif
#if LAB_CHECKPOINT >= 9
    diffuseVelocity(grid, parameters.viscosity);
    project(grid, parameters);
#endif
#if LAB_CHECKPOINT >= 7
    advectVelocity(grid);
#endif
#if LAB_CHECKPOINT >= 6
    project(grid, parameters);
#elif LAB_CHECKPOINT == 5
    solveJacobi(grid, parameters.pressureBudget);
#endif
#if LAB_CHECKPOINT >= 12
    if (parameters.highOrder) {
        advectSmokeDetailed(grid);
    } else {
        advectSmoke(grid);
    }
#else
    advectSmoke(grid);
#endif
#if LAB_CHECKPOINT >= 4
    divergence(grid);
#endif
    ++grid.tick;
    return finiteState(grid);
}

// [/snippet step]
#endif

#if LAB_CHECKPOINT >= 10
struct StepPlan {
    int steps = 0;
    double remainder = 0;
    double dropped = 0;
};

// [snippet step-plan]
inline StepPlan planSteps(double accumulator, double elapsed) {
    if (!std::isfinite(accumulator) || accumulator < 0 || accumulator >= fixedDt) {
        accumulator = 0;
    }
    if (!std::isfinite(elapsed) || elapsed < 0) {
        elapsed = 0;
    }
    const double accepted = std::min(elapsed, 0.25);
    const double total = accumulator + accepted;
    const double due = std::floor((total + 1e-10) / fixedDt);
    StepPlan result;
    result.steps = static_cast<int>(std::min(4.0, due));
    result.remainder = std::max(0.0, total - due * fixedDt);
    result.dropped = elapsed - accepted + (due - result.steps) * fixedDt;
    return result;
}

// [/snippet step-plan]
#endif
} // namespace fluid
