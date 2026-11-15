#pragma once
#include "field.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 9
// [snippet viscosity]
inline void diffuseVelocity(Grid& grid, double viscosity) {
    if (!std::isfinite(viscosity) || viscosity < 0 || viscosity > 0.003) {
        throw std::invalid_argument("Viscosity must be in [0,0.003]");
    }
    if (viscosity == 0) {
        return;
    }
    const auto sourceU = grid.u;
    const auto sourceV = grid.v;
    const double a = viscosity * fixedDt / (grid.h * grid.h);
    const int n = grid.n;
    for (int iteration = 0; iteration < 48; ++iteration) {
        for (int y = 0; y < n; ++y) {
            for (int x = 0; x <= n; ++x) {
                const int i = y * (n + 1) + x;
                if (x == 0 || x == n) {
                    grid.uNext[i] = 0;
                    continue;
                }
                double sum = grid.u[i - 1] + grid.u[i + 1];
                int count = 2;
                if (y > 0) {
                    sum += grid.u[i - n - 1];
                    ++count;
                }
                if (y + 1 < n) {
                    sum += grid.u[i + n + 1];
                    ++count;
                }
                grid.uNext[i] = (sourceU[i] + a * sum) / (1 + a * count);
            }
        }
        for (int y = 0; y <= n; ++y) {
            for (int x = 0; x < n; ++x) {
                const int i = y * n + x;
                if (y == 0 || y == n) {
                    grid.vNext[i] = 0;
                    continue;
                }
                double sum = grid.v[i - n] + grid.v[i + n];
                int count = 2;
                if (x > 0) {
                    sum += grid.v[i - 1];
                    ++count;
                }
                if (x + 1 < n) {
                    sum += grid.v[i + 1];
                    ++count;
                }
                grid.vNext[i] = (sourceV[i] + a * sum) / (1 + a * count);
            }
        }
        grid.u.swap(grid.uNext);
        grid.v.swap(grid.vNext);
    }
    enforceWalls(grid);
}

// [/snippet viscosity]
#endif
} // namespace fluid
