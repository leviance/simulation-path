#pragma once
#include "grid.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 2
inline void paintDisk(Grid& grid, Vec2 p, int radius, double value) {
    // Bút đặt concentration, không phải nguồn phát khói liên tục theo thời gian.
    if (!inside(p) || radius < 1 || radius > 6 || (value != 0 && value != 1)) {
        return;
    }
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const double dx = (x + 0.5) - p.x * grid.n;
            const double dy = (y + 0.5) - p.y * grid.n;
            if (dx * dx + dy * dy <= radius * radius) {
                grid.density[y * grid.n + x] = value;
            }
        }
    }
}

inline void paintStroke(Grid& grid, Vec2 from, Vec2 to, int radius, double value) {
    if (!inside(from) || !inside(to)) {
        return;
    }
    const int steps = std::max(1, static_cast<int>(std::ceil(std::hypot(to.x - from.x, to.y - from.y) * grid.n * 2)));
    for (int i = 0; i <= steps; ++i) {
        const double t = static_cast<double>(i) / steps;
        paintDisk(grid, {from.x + t * (to.x - from.x), from.y + t * (to.y - from.y)}, radius, value);
    }
}
#endif

#if LAB_CHECKPOINT >= 9
inline void addImpulse(Grid& grid, Vec2 p, Vec2 delta) {
    // Impulse tỉ lệ với quãng kéo, không nhân thêm dt như một lực liên tục.
    if (!inside(p) || !std::isfinite(delta.x) || !std::isfinite(delta.y) || std::hypot(delta.x, delta.y) > 2) {
        return;
    }
    const double sigma = 2.5 * grid.h;
    const auto weight = [&](double x, double y) {
        return std::exp(-((x - p.x) * (x - p.x) + (y - p.y) * (y - p.y)) / (sigma * sigma));
    };
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 1; x < grid.n; ++x) {
            grid.u[y * (grid.n + 1) + x] += 4 * delta.x * weight(x * grid.h, (y + 0.5) * grid.h);
        }
    }
    for (int y = 1; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            grid.v[y * grid.n + x] += 4 * delta.y * weight((x + 0.5) * grid.h, y * grid.h);
        }
    }
    enforceWalls(grid);
    grid.hasProjection = false;
    grid.pressureReady = false;
}

inline void addBuoyancy(Grid& grid, double strength) {
    for (int y = 1; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const double concentration = 0.5 * (grid.density[y * grid.n + x] + grid.density[(y - 1) * grid.n + x]);
            grid.v[y * grid.n + x] += dt * strength * concentration;
        }
    }
    enforceWalls(grid);
}
#endif
} // namespace fluid
