#pragma once
#include "solver.hpp"

namespace fluid {
struct Diagnostics {
    double mass = 0;
    double minDensity = std::numeric_limits<double>::infinity();
    double maxDensity = 0;
    double energy = 0;
    double courant = 0;
};

inline Diagnostics diagnose(const Grid& grid) {
    Diagnostics result;
    for (const double value : grid.density) {
        result.mass += value * grid.h * grid.h;
        result.minDensity = std::min(result.minDensity, value);
        result.maxDensity = std::max(result.maxDensity, value);
    }
#if LAB_CHECKPOINT >= 4
    for (const double value : grid.u) {
        result.energy += value * value;
        result.courant = std::max(result.courant, std::abs(value) * fixedDt / grid.h);
    }
    for (const double value : grid.v) {
        result.energy += value * value;
        result.courant = std::max(result.courant, std::abs(value) * fixedDt / grid.h);
    }
    result.energy *= 0.5 * grid.h * grid.h;
#endif
    return result;
}

#if LAB_CHECKPOINT >= 15
struct ReferenceReport {
    Projection small;
    Projection large;
    double constantError = 0;
    bool passed = false;
};

// [snippet validation]
inline ReferenceReport validate() {
    ReferenceReport result;
    Parameters jacobi;
    jacobi.method = PressureMethod::Jacobi;
    jacobi.pressureBudget = 160;
    auto small = makeScene(16, Scene::Compression);
    result.small = project(small, jacobi);
    auto large = makeScene(128, Scene::Empty);
    impulseAt(large, {0.37, 0.42}, {0.12, 0.07});
    impulseAt(large, {0.65, 0.61}, {-0.08, 0.11});
    result.large = project(large, Parameters{});
    auto constant = makeScene(16, Scene::Vortex);
    std::fill(constant.density.begin(), constant.density.end(), 0.4);
    advectSmoke(constant);
    for (const double value : constant.density) {
        result.constantError = std::max(result.constantError, std::abs(value - 0.4));
    }
    result.passed = result.small.after < 0.08 * result.small.before && result.large.converged && result.large.after < 0.001 * result.large.before && std::abs(result.large.after - fixedDt * result.large.residual) < 1e-9 && result.constantError < 1e-12;
    return result;
}

// [/snippet validation]
#endif
} // namespace fluid
