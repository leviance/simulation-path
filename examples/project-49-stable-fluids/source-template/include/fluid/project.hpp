#pragma once
#include "cg.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 6
// [snippet project]
inline Projection project(Grid& grid, const Parameters& parameters) {
    const int budget = parameters.pressureBudget;
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
    if (!availablePressureMethod(parameters.method) || budget < 1 || budget > maximum || !finiteState(grid)) {
        throw std::invalid_argument("Invalid projection input");
    }
    enforceWalls(grid);
    Projection report;
    report.method = parameters.method;
    report.budget = budget;
    report.before = divergence(grid);
    if (!std::isfinite(report.before)) {
        throw std::overflow_error("Projection divergence norm overflow");
    }
#if LAB_CHECKPOINT >= 11
    if (parameters.method == PressureMethod::CG) {
        solveCG(grid, budget);
    }
#if LAB_CHECKPOINT >= 14
    else if (parameters.method == PressureMethod::PCG) {
        solveCG(grid, budget, true);
    }
#endif
    else {
        solveJacobi(grid, budget);
    }
#else
    solveJacobi(grid, budget);
#endif
    report.residual = pressureResidual(grid);
    report.target = std::max(1e-6, 1e-4 * rms(grid.rhs));
    report.iterations = grid.iterations;
    report.converged = std::isfinite(report.residual) && std::isfinite(report.target) && report.residual <= report.target;
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 1; x < grid.n; ++x) {
            grid.u[y * (grid.n + 1) + x] -= fixedDt * (grid.pressure[y * grid.n + x] - grid.pressure[y * grid.n + x - 1]) / grid.h;
        }
    }
    for (int y = 1; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            grid.v[y * grid.n + x] -= fixedDt * (grid.pressure[y * grid.n + x] - grid.pressure[(y - 1) * grid.n + x]) / grid.h;
        }
    }
    enforceWalls(grid);
    report.after = divergence(grid);
    report.available = true;
    grid.projection = report;
    grid.pressureReady = false;
    return report;
}

// [/snippet project]
#endif
} // namespace fluid
