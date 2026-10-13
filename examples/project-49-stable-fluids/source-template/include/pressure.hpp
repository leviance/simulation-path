#pragma once
#include "grid.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 4
inline double rms(const std::vector<double>& values) {
    double sum = 0;
    for (const double value : values) {
        sum += value * value;
    }
    return std::sqrt(sum / values.size());
}

inline double computeDivergence(Grid& grid) {
    // Dòng ra qua bốn cạnh, chia diện tích: hiệu vận tốc chia h.
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            grid.div[y * grid.n + x] = (grid.u[y * (grid.n + 1) + x + 1] - grid.u[y * (grid.n + 1) + x] + grid.v[(y + 1) * grid.n + x] - grid.v[y * grid.n + x]) / grid.h;
        }
    }
    return rms(grid.div);
}
#endif

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

inline double pressureResidual(const Grid& grid) {
    double sum = 0;
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const int i = y * grid.n + x;
            const auto nearby = neighbours(grid, grid.pressure, x, y);
            const double residual = (nearby.count * grid.pressure[i] - nearby.sum) / (grid.h * grid.h) - grid.rhs[i];
            sum += residual * residual;
        }
    }
    return std::sqrt(sum / grid.pressure.size());
}

inline void beginPressure(Grid& grid) {
    enforceWalls(grid);
    computeDivergence(grid);
    std::fill(grid.pressure.begin(), grid.pressure.end(), 0);
    double mean = 0;
    for (std::size_t i = 0; i < grid.rhs.size(); ++i) {
        grid.rhs[i] = -grid.div[i] / dt;
        mean += grid.rhs[i];
    }
    mean /= grid.rhs.size();
    for (double& value : grid.rhs) {
        value -= mean;
    }
    grid.pressureReady = true;
    grid.pressureIterations = 0;
    grid.hasProjection = false;
}

struct JacobiTrace {
    int x = 0;
    int y = 0;
    double rhs = 0;
    double previous = 0;
    double sum = 0;
    int count = 0;
    double candidate = 0;
    double weighted = 0;
    double gauge = 0;
    double result = 0;
    int iteration = 0;
};

inline JacobiTrace inspectJacobiCell(const Grid& grid, int x, int y) {
    if (x < 0 || y < 0 || x >= grid.n || y >= grid.n) {
        throw std::invalid_argument("Invalid pressure cell");
    }
    const int i = y * grid.n + x;
    const auto nearby = neighbours(grid, grid.pressure, x, y);
    JacobiTrace trace;
    trace.x = x;
    trace.y = y;
    trace.rhs = grid.rhs[i];
    trace.previous = grid.pressure[i];
    trace.sum = nearby.sum;
    trace.count = nearby.count;
    trace.candidate = (nearby.sum + grid.h * grid.h * grid.rhs[i]) / nearby.count;
    trace.weighted = 0.25 * trace.previous + 0.75 * trace.candidate;
    return trace;
}

inline JacobiTrace jacobiIteration(Grid& grid, int selectedX = 0, int selectedY = 0) {
    if (!grid.pressureReady || grid.pressureIterations >= 160) {
        throw std::invalid_argument("Begin pressure before stepping; budget is 160 iterations");
    }
    auto trace = inspectJacobiCell(grid, selectedX, selectedY);
    double gauge = 0;
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const int i = y * grid.n + x;
            const auto nearby = neighbours(grid, grid.pressure, x, y);
            const double candidate = (nearby.sum + grid.h * grid.h * grid.rhs[i]) / nearby.count;
            grid.pressureNext[i] = 0.25 * grid.pressure[i] + 0.75 * candidate;
            gauge += grid.pressureNext[i];
        }
    }
    // Neumann không quyết định hằng số pressure: chọn trung bình bằng 0.
    gauge /= grid.pressure.size();
    for (double& value : grid.pressureNext) {
        value -= gauge;
    }
    grid.pressure.swap(grid.pressureNext);
    ++grid.pressureIterations;
    trace.gauge = gauge;
    trace.result = grid.pressure[selectedY * grid.n + selectedX];
    trace.iteration = grid.pressureIterations;
    return trace;
}

inline double solvePressure(Grid& grid, int iterations) {
    if (iterations < 1 || iterations > 160) {
        throw std::invalid_argument("Pressure iterations must be in [1, 160]");
    }
    beginPressure(grid);
    for (int iteration = 0; iteration < iterations; ++iteration) {
        jacobiIteration(grid);
    }
    return pressureResidual(grid);
}
#endif

#if LAB_CHECKPOINT >= 6
inline ProjectionReport project(Grid& grid, int iterations) {
    if (iterations < 1 || iterations > 160) {
        throw std::invalid_argument("Invalid projection budget");
    }
    enforceWalls(grid);
    ProjectionReport report;
    report.before = computeDivergence(grid);
    report.residual = solvePressure(grid, iterations);
    report.iterations = iterations;
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 1; x < grid.n; ++x) {
            grid.u[y * (grid.n + 1) + x] -= dt * (grid.pressure[y * grid.n + x] - grid.pressure[y * grid.n + x - 1]) / grid.h;
        }
    }
    for (int y = 1; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            grid.v[y * grid.n + x] -= dt * (grid.pressure[y * grid.n + x] - grid.pressure[(y - 1) * grid.n + x]) / grid.h;
        }
    }
    enforceWalls(grid);
    report.after = computeDivergence(grid);
    grid.projection = report;
    grid.hasProjection = true;
    grid.pressureReady = false;
    return report;
}
#endif
} // namespace fluid
