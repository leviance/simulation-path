#pragma once
#include "multigrid.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 11
// [snippet multiply-pressure]
inline void multiplyPressure(const Grid& grid, const std::vector<double>& input, std::vector<double>& output) {
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const int i = y * grid.n + x;
            const auto adjacent = neighbours(grid, input, x, y);
            output[i] = adjacent.count * input[i] - adjacent.sum;
        }
    }
}

// [/snippet multiply-pressure]

inline double dot(const std::vector<double>& a, const std::vector<double>& b) {
    double value = 0;
    for (std::size_t i = 0; i < a.size(); ++i) {
        value += a[i] * b[i];
    }
    return value;
}

// [snippet cg]
#if LAB_CHECKPOINT >= 14
inline void solveCG(Grid& grid, int budget, bool usePreconditioner = false) {
#else
inline void solveCG(Grid& grid, int budget) {
#endif
    if (budget < 1 || budget > 384) {
        throw std::invalid_argument("CG budget must be in [1,384]");
    }
    // Pressure cũ chỉ là phỏng đoán ban đầu. Residual mới luôn được tính từ RHS hiện tại.
    preparePressure(grid, false);
    const double hSquared = grid.h * grid.h;
    const double target = std::max(1e-6, 1e-4 * rms(grid.rhs));
    const double targetSquared = target * target * hSquared * hSquared * grid.rhs.size();
    multiplyPressure(grid, grid.pressure, grid.matrixDirection);
    for (std::size_t i = 0; i < grid.rhs.size(); ++i) {
        grid.residualWork[i] = hSquared * grid.rhs[i] - grid.matrixDirection[i];
        grid.direction[i] = grid.residualWork[i];
    }
    double residualSquared = dot(grid.residualWork, grid.residualWork);
    if (residualSquared <= targetSquared) {
        removeMean(grid.pressure);
        return;
    }
    double residualDotDirection = residualSquared;
#if LAB_CHECKPOINT >= 14
    if (usePreconditioner) {
        precondition(grid);
        grid.direction = grid.preconditioned;
        residualDotDirection = dot(grid.residualWork, grid.preconditioned);
    }
#endif
    for (int iteration = 0; iteration < budget && residualSquared > targetSquared; ++iteration) {
        multiplyPressure(grid, grid.direction, grid.matrixDirection);
        const double denominator = dot(grid.direction, grid.matrixDirection);
        if (!std::isfinite(denominator) || denominator <= 0) {
            break;
        }
        const double alpha = residualDotDirection / denominator;
        for (std::size_t i = 0; i < grid.pressure.size(); ++i) {
            grid.pressure[i] += alpha * grid.direction[i];
            grid.residualWork[i] -= alpha * grid.matrixDirection[i];
        }
        ++grid.iterations;
        const double nextSquared = dot(grid.residualWork, grid.residualWork);
        double nextDotDirection = nextSquared;
#if LAB_CHECKPOINT >= 14
        if (usePreconditioner) {
            precondition(grid);
            nextDotDirection = dot(grid.residualWork, grid.preconditioned);
        }
#endif
        const double beta = nextDotDirection / residualDotDirection;
        for (std::size_t i = 0; i < grid.direction.size(); ++i) {
            double newResidual = grid.residualWork[i];
#if LAB_CHECKPOINT >= 14
            if (usePreconditioner) {
                newResidual = grid.preconditioned[i];
            }
#endif
            grid.direction[i] = newResidual + beta * grid.direction[i];
        }
        residualSquared = nextSquared;
        residualDotDirection = nextDotDirection;
    }
    removeMean(grid.pressure);
}

// [/snippet cg]
#endif
} // namespace fluid
