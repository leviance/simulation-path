#pragma once
#include "field.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 13
inline double centerU(const Grid& grid, int x, int y) {
    const int i = y * (grid.n + 1) + x;
    return 0.5 * (grid.u[i] + grid.u[i + 1]);
}

inline double centerV(const Grid& grid, int x, int y) {
    const int i = y * grid.n + x;
    return 0.5 * (grid.v[i] + grid.v[i + grid.n]);
}

// [snippet confinement]
inline void confineVorticity(Grid& grid, double strength) {
    if (!std::isfinite(strength) || strength < 0 || strength > 20) {
        throw std::invalid_argument("Confinement strength must be in [0,20]");
    }
    if (strength == 0) {
        return;
    }
    const int n = grid.n;
    for (int y = 0; y < n; ++y) {
        for (int x = 0; x < n; ++x) {
            const int left = std::max(0, x - 1);
            const int right = std::min(n - 1, x + 1);
            const int lower = std::max(0, y - 1);
            const int upper = std::min(n - 1, y + 1);
            const double dvdx = (centerV(grid, right, y) - centerV(grid, left, y)) / ((right - left) * grid.h);
            const double dudy = (centerU(grid, x, upper) - centerU(grid, x, lower)) / ((upper - lower) * grid.h);
            grid.curl[y * n + x] = dvdx - dudy;
        }
    }
    for (int y = 0; y < n; ++y) {
        for (int x = 0; x < n; ++x) {
            const int i = y * n + x;
            const int left = std::max(0, x - 1);
            const int right = std::min(n - 1, x + 1);
            const int lower = std::max(0, y - 1);
            const int upper = std::min(n - 1, y + 1);
            const double gx = (std::abs(grid.curl[y * n + right]) - std::abs(grid.curl[y * n + left])) / ((right - left) * grid.h);
            const double gy = (std::abs(grid.curl[upper * n + x]) - std::abs(grid.curl[lower * n + x])) / ((upper - lower) * grid.h);
            const double length = std::hypot(gx, gy);
            grid.forceX[i] = 0;
            grid.forceY[i] = 0;
            if (length > 1e-10) {
                grid.forceX[i] = strength * grid.h * (gy / length) * grid.curl[i];
                grid.forceY[i] = -strength * grid.h * (gx / length) * grid.curl[i];
            }
        }
    }
    for (int y = 0; y < n; ++y) {
        for (int x = 1; x < n; ++x) {
            grid.u[y * (n + 1) + x] += fixedDt * 0.5 * (grid.forceX[y * n + x - 1] + grid.forceX[y * n + x]);
        }
    }
    for (int y = 1; y < n; ++y) {
        for (int x = 0; x < n; ++x) {
            grid.v[y * n + x] += fixedDt * 0.5 * (grid.forceY[(y - 1) * n + x] + grid.forceY[y * n + x]);
        }
    }
    enforceWalls(grid);
}

// [/snippet confinement]
#endif
} // namespace fluid
