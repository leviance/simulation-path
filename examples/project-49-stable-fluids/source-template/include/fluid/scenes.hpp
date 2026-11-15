#pragma once
#include "field.hpp"

namespace fluid {
inline Scene startingScene() {
#if LAB_CHECKPOINT == 4
    return Scene::Compression;
#elif LAB_CHECKPOINT == 5
    return Scene::JacobiPair;
#elif LAB_CHECKPOINT == 6
    return Scene::Compression;
#elif LAB_CHECKPOINT == 7
    return Scene::Vortex;
#elif LAB_CHECKPOINT == 9
    return Scene::Vortex;
#else
    return Scene::TwinJets;
#endif
}

inline Grid makeScene(int n, Scene scene) {
    Grid grid(n);
#if LAB_CHECKPOINT >= 1
    // [snippet seed-smoke]
    for (int y = 0; y < n; ++y) {
        for (int x = 0; x < n; ++x) {
            const double px = (x + 0.5) * grid.h;
            const double py = (y + 0.5) * grid.h;
            double left = std::exp(-((px - 0.34) * (px - 0.34) / 0.002 + (py - 0.18) * (py - 0.18) / 0.009));
            double right = std::exp(-((px - 0.66) * (px - 0.66) / 0.002 + (py - 0.18) * (py - 0.18) / 0.009));
            if (scene == Scene::Empty || scene == Scene::JacobiPair) {
                left = 0;
                right = 0;
            }
            if (scene == Scene::Vortex) {
                left = std::exp(-((px - 0.30) * (px - 0.30) + (py - 0.50) * (py - 0.50)) / 0.003);
                right = std::exp(-((px - 0.70) * (px - 0.70) + (py - 0.50) * (py - 0.50)) / 0.003);
            }
            grid.density[y * n + x] = left + right;
#if LAB_CHECKPOINT >= 8
            grid.pigment[0][y * n + x] = left * cyan.r + right * amber.r;
            grid.pigment[1][y * n + x] = left * cyan.g + right * amber.g;
            grid.pigment[2][y * n + x] = left * cyan.b + right * amber.b;
#endif
        }
    }
    // [/snippet seed-smoke]
#else
    static_cast<void>(scene);
#endif
#if LAB_CHECKPOINT >= 4
    const double pi = std::acos(-1.0);
    if (scene == Scene::Compression) {
        for (int y = 0; y < n; ++y) {
            for (int x = 0; x <= n; ++x) {
                grid.u[y * (n + 1) + x] = 0.3 * std::sin(2 * pi * x * grid.h);
            }
        }
        for (int y = 0; y <= n; ++y) {
            for (int x = 0; x < n; ++x) {
                grid.v[y * n + x] = 0.3 * std::sin(2 * pi * y * grid.h);
            }
        }
    }
    if (scene == Scene::Vortex) {
        const auto streamfunction = [&](int x, int y) {
            return 0.10 * std::pow(std::sin(pi * x * grid.h), 2) * std::pow(std::sin(pi * y * grid.h), 2);
        };
        for (int y = 0; y < n; ++y) {
            for (int x = 0; x <= n; ++x) {
                grid.u[y * (n + 1) + x] = (streamfunction(x, y + 1) - streamfunction(x, y)) / grid.h;
            }
        }
        for (int y = 0; y <= n; ++y) {
            for (int x = 0; x < n; ++x) {
                grid.v[y * n + x] = -(streamfunction(x + 1, y) - streamfunction(x, y)) / grid.h;
            }
        }
    }
#if LAB_CHECKPOINT >= 5
    if (scene == Scene::JacobiPair) {
        grid.u[(n / 2 - 1) * (n + 1) + n / 2] = -grid.h * fixedDt * 64;
    }
#endif
    enforceWalls(grid);
    divergence(grid);
#endif
    return grid;
}
} // namespace fluid
