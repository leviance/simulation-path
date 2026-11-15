#pragma once
#include "field.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 8
inline double nozzle(double x, double y, double centerX) {
    return std::exp(-((x - centerX) * (x - centerX) / 0.00065 + (y - 0.09) * (y - 0.09) / 0.0018));
}

// [snippet emit-smoke]
inline void emitSmoke(Grid& grid) {
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const int i = y * grid.n + x;
            const double px = (x + 0.5) * grid.h;
            const double py = (y + 0.5) * grid.h;
            const double left = fixedDt * 4 * nozzle(px, py, 0.34);
            const double right = fixedDt * 3.4 * nozzle(px, py, 0.66);
            grid.density[i] += left + right;
            grid.pigment[0][i] += left * cyan.r + right * amber.r;
            grid.pigment[1][i] += left * cyan.g + right * amber.g;
            grid.pigment[2][i] += left * cyan.b + right * amber.b;
        }
    }
}

// [/snippet emit-smoke]

// [snippet forces]
inline void addForces(Grid& grid, const Parameters& parameters, Scene scene) {
    for (int y = 1; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const double concentration = 0.5 * (grid.density[y * grid.n + x] + grid.density[(y - 1) * grid.n + x]);
            double acceleration = parameters.buoyancy * concentration;
            if (parameters.emit && scene == Scene::TwinJets) {
                acceleration += 2.2 * nozzle((x + 0.5) * grid.h, y * grid.h, 0.34) + 1.8 * nozzle((x + 0.5) * grid.h, y * grid.h, 0.66);
            }
            grid.v[y * grid.n + x] += fixedDt * acceleration;
        }
    }
    if (parameters.emit && scene == Scene::TwinJets) {
        for (int y = 0; y < grid.n; ++y) {
            for (int x = 1; x < grid.n; ++x) {
                const double acceleration = 0.45 * nozzle(x * grid.h, (y + 0.5) * grid.h, 0.34) - 0.35 * nozzle(x * grid.h, (y + 0.5) * grid.h, 0.66);
                grid.u[y * (grid.n + 1) + x] += fixedDt * acceleration;
            }
        }
    }
    enforceWalls(grid);
}

// [/snippet forces]
#endif
} // namespace fluid
