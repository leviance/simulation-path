#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 11
#endif
#include <algorithm>
#include <cmath>
#include <stdexcept>
#include <vector>

namespace fluid {
inline constexpr double dt = 1.0 / 60.0;

struct Vec2 {
    double x = 0;
    double y = 0;
};

enum class Preset {
    Plume,
    Compressing,
    Vortex,
    Empty,
    PressureDipole,
};

struct ProjectionReport {
    double before = 0;
    double after = 0;
    double residual = 0;
    int iterations = 0;
};

struct Grid {
    int n;
    double h;
    std::vector<double> density;
    std::vector<double> densityNext;
    std::vector<double> u;
    std::vector<double> uNext;
    std::vector<double> v;
    std::vector<double> vNext;
    std::vector<double> pressure;
    std::vector<double> pressureNext;
    std::vector<double> rhs;
    std::vector<double> div;
    int tick = 0;
    ProjectionReport projection;
    bool hasProjection = false;
    bool pressureReady = false;
    int pressureIterations = 0;

    explicit Grid(int resolution = 24)
        : n(resolution) {
        // Scalar ở tâm ô, u trên cạnh dọc, v trên cạnh ngang.
        if (n < 8 || n > 32) {
            throw std::invalid_argument("Fluid resolution must be in [8, 32]");
        }
        h = 1.0 / n;
        density.assign(static_cast<std::size_t>(n * n), 0);
        densityNext = density;
        pressure = density;
        pressureNext = density;
        rhs = density;
        div = density;
        u.assign(static_cast<std::size_t>((n + 1) * n), 0);
        uNext = u;
        v.assign(static_cast<std::size_t>(n * (n + 1)), 0);
        vNext = v;
    }
};

inline bool inside(Vec2 p) {
    return std::isfinite(p.x) && std::isfinite(p.y) && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1;
}

inline void enforceWalls(Grid& grid) {
    // Chặn vận tốc pháp tuyến; thành phần tiếp tuyến được phép trượt.
    for (int y = 0; y < grid.n; ++y) {
        grid.u[y * (grid.n + 1)] = 0;
        grid.u[y * (grid.n + 1) + grid.n] = 0;
    }
    for (int x = 0; x < grid.n; ++x) {
        grid.v[x] = 0;
        grid.v[grid.n * grid.n + x] = 0;
    }
}

inline Preset initialPreset() {
#if LAB_CHECKPOINT == 4
    return Preset::Compressing;
#elif LAB_CHECKPOINT == 5
    return Preset::Compressing;
#elif LAB_CHECKPOINT == 6
    return Preset::Compressing;
#elif LAB_CHECKPOINT == 7
    return Preset::Vortex;
#elif LAB_CHECKPOINT == 8
    return Preset::Vortex;
#else
    return Preset::Plume;
#endif
}

#if LAB_CHECKPOINT >= 1
inline Grid makeGrid(int n = 24, Preset preset = Preset::Plume) {
    Grid grid(n);
    if (preset != Preset::Empty && preset != Preset::PressureDipole) {
        for (int y = 0; y < n; ++y) {
            for (int x = 0; x < n; ++x) {
                const double px = (x + 0.5) * grid.h - 0.5;
                double centerY = 0.5;
                if (preset == Preset::Plume) {
                    centerY = 0.2;
                }
                const double py = (y + 0.5) * grid.h - centerY;
                grid.density[y * n + x] = std::exp(-(px * px + py * py) / 0.008);
            }
        }
    }
#if LAB_CHECKPOINT >= 4
    const double pi = std::acos(-1.0);
    if (preset == Preset::Compressing) {
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
    if (preset == Preset::Vortex) {
        const auto psi = [&](int x, int y) {
            return 0.05 * std::pow(std::sin(pi * x * grid.h), 2) * std::pow(std::sin(pi * y * grid.h), 2);
        };
        for (int y = 0; y < n; ++y) {
            for (int x = 0; x <= n; ++x) {
                grid.u[y * (n + 1) + x] = (psi(x, y + 1) - psi(x, y)) / grid.h;
            }
        }
        for (int y = 0; y <= n; ++y) {
            for (int x = 0; x < n; ++x) {
                grid.v[y * n + x] = -(psi(x + 1, y) - psi(x, y)) / grid.h;
            }
        }
    }
#endif
#if LAB_CHECKPOINT >= 5
    // One shared face gives opposite RHS values, with no net boundary flux.
    if (preset == Preset::PressureDipole) {
        const int x = n / 2;
        const int y = n / 2 - 1;
        grid.u[y * (n + 1) + x] = -grid.h * dt * 64;
    }
#endif
    enforceWalls(grid);
    return grid;
}
#endif
} // namespace fluid
