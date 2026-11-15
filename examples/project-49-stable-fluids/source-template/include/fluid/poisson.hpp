#pragma once
#include "field.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 5
struct Neighbours {
    double sum = 0;
    int count = 0;
};

inline Neighbours neighbours(const Grid& grid, const std::vector<double>& values, int x, int y) {
    const int i = y * grid.n + x;
    Neighbours result;
    if (x > 0) {
        result.sum += values[i - 1];
        ++result.count;
    }
    if (x + 1 < grid.n) {
        result.sum += values[i + 1];
        ++result.count;
    }
    if (y > 0) {
        result.sum += values[i - grid.n];
        ++result.count;
    }
    if (y + 1 < grid.n) {
        result.sum += values[i + grid.n];
        ++result.count;
    }
    return result;
}

inline void removeMean(std::vector<double>& values) {
    double mean = 0;
    for (const double value : values) {
        mean += value;
    }
    mean /= values.size();
    for (double& value : values) {
        value -= mean;
    }
}

// [snippet prepare-pressure]
inline void preparePressure(Grid& grid, bool clear) {
    if (!finiteState(grid)) {
        throw std::invalid_argument("Nonfinite pressure input");
    }
    enforceWalls(grid);
    if (!std::isfinite(divergence(grid))) {
        throw std::overflow_error("Divergence norm overflow");
    }
    for (std::size_t i = 0; i < grid.rhs.size(); ++i) {
        grid.rhs[i] = -grid.divergence[i] / fixedDt;
    }
    removeMean(grid.rhs);
    if (!std::isfinite(rms(grid.rhs))) {
        throw std::overflow_error("Pressure RHS norm overflow");
    }
    if (clear) {
        std::fill(grid.pressure.begin(), grid.pressure.end(), 0);
    }
    grid.iterations = 0;
    grid.pressureReady = true;
    grid.projection.available = false;
}

// [/snippet prepare-pressure]

// [snippet pressure-residual]
inline double pressureResidual(const Grid& grid) {
    double sum = 0;
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const int i = y * grid.n + x;
            const auto adjacent = neighbours(grid, grid.pressure, x, y);
            const double residual = (adjacent.count * grid.pressure[i] - adjacent.sum) / (grid.h * grid.h) - grid.rhs[i];
            if (!std::isfinite(residual)) {
                return std::numeric_limits<double>::infinity();
            }
            sum += residual * residual;
        }
    }
    return std::sqrt(sum / grid.pressure.size());
}

// [/snippet pressure-residual]

struct JacobiCell {
    double oldValue = 0;
    double rhs = 0;
    double sum = 0;
    int count = 0;
    double candidate = 0;
    double weighted = 0;
};

inline JacobiCell inspectJacobi(const Grid& grid, int x, int y) {
    if (x < 0 || y < 0 || x >= grid.n || y >= grid.n) {
        throw std::invalid_argument("Invalid cell");
    }
    const int i = y * grid.n + x;
    const auto adjacent = neighbours(grid, grid.pressure, x, y);
    JacobiCell cell;
    cell.oldValue = grid.pressure[i];
    cell.rhs = grid.rhs[i];
    cell.sum = adjacent.sum;
    cell.count = adjacent.count;
    cell.candidate = (adjacent.sum + grid.h * grid.h * cell.rhs) / adjacent.count;
    cell.weighted = 0.25 * cell.oldValue + 0.75 * cell.candidate;
    return cell;
}

// [snippet jacobi]
inline void jacobiIteration(Grid& grid) {
    if (!grid.pressureReady || grid.iterations >= 160) {
        throw std::invalid_argument("Jacobi requires a prepared RHS and at most 160 rounds");
    }
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            grid.pressureNext[y * grid.n + x] = inspectJacobi(grid, x, y).weighted;
        }
    }
    removeMean(grid.pressureNext);
    grid.pressure.swap(grid.pressureNext);
    ++grid.iterations;
}

// [/snippet jacobi]

inline void solveJacobi(Grid& grid, int budget) {
    if (budget < 1 || budget > 160) {
        throw std::invalid_argument("Jacobi budget must be in [1,160]");
    }
    preparePressure(grid, true);
    for (int iteration = 0; iteration < budget; ++iteration) {
        jacobiIteration(grid);
    }
}
#endif
} // namespace fluid
