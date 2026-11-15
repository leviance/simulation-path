#pragma once
#include "field.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 2
// [snippet brush-disk]
inline void paintDisk(Grid& grid, Vec2 point, int radius, bool erase, [[maybe_unused]] Ink ink) {
    if (!inside(point) || radius < 1 || radius > 16 || !std::isfinite(ink.r) || !std::isfinite(ink.g) || !std::isfinite(ink.b) || ink.r < 0 || ink.r > 1 || ink.g < 0 || ink.g > 1 || ink.b < 0 || ink.b > 1) {
        return;
    }
    const int minX = std::max(0, static_cast<int>(std::floor(point.x / grid.h - radius)));
    const int maxX = std::min(grid.n - 1, static_cast<int>(std::ceil(point.x / grid.h + radius)));
    const int minY = std::max(0, static_cast<int>(std::floor(point.y / grid.h - radius)));
    const int maxY = std::min(grid.n - 1, static_cast<int>(std::ceil(point.y / grid.h + radius)));
    for (int y = minY; y <= maxY; ++y) {
        for (int x = minX; x <= maxX; ++x) {
            const double dx = x + 0.5 - point.x / grid.h;
            const double dy = y + 0.5 - point.y / grid.h;
            if (dx * dx + dy * dy > radius * radius) {
                continue;
            }
            const int i = y * grid.n + x;
            grid.density[i] = 1;
            if (erase) {
                grid.density[i] = 0;
            }
#if LAB_CHECKPOINT >= 8
            grid.pigment[0][i] = grid.density[i] * ink.r;
            grid.pigment[1][i] = grid.density[i] * ink.g;
            grid.pigment[2][i] = grid.density[i] * ink.b;
#endif
        }
    }
}

// [/snippet brush-disk]

// [snippet brush-stroke]
inline void paintStroke(Grid& grid, Vec2 from, Vec2 to, int radius, bool erase, Ink ink) {
    if (!inside(from) || !inside(to)) {
        return;
    }
    const double distance = std::hypot(to.x - from.x, to.y - from.y);
    const int count = std::max(1, static_cast<int>(std::ceil(distance / (0.5 * grid.h))));
    for (int i = 0; i <= count; ++i) {
        const double t = static_cast<double>(i) / count;
        paintDisk(grid, {from.x + t * (to.x - from.x), from.y + t * (to.y - from.y)}, radius, erase, ink);
    }
}

// [/snippet brush-stroke]
#endif

#if LAB_CHECKPOINT >= 8
inline void impulseAt(Grid& grid, Vec2 point, Vec2 displacement) {
    if (!inside(point) || !std::isfinite(displacement.x) || !std::isfinite(displacement.y)) {
        return;
    }
    const double length = std::hypot(displacement.x, displacement.y);
    if (length == 0 || length > 2) {
        return;
    }
    const double sigma = std::max(0.05, 2 * grid.h);
    const double tail = std::exp(-9.0);
    const auto weight = [&](double x, double y) {
        const double distanceSquared = ((x - point.x) * (x - point.x) + (y - point.y) * (y - point.y)) / (sigma * sigma);
        if (distanceSquared >= 9) {
            return 0.0;
        }
        return (std::exp(-distanceSquared) - tail) / (1 - tail);
    };
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 1; x < grid.n; ++x) {
            grid.u[y * (grid.n + 1) + x] += 6 * displacement.x * weight(x * grid.h, (y + 0.5) * grid.h);
        }
    }
    for (int y = 1; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            grid.v[y * grid.n + x] += 6 * displacement.y * weight((x + 0.5) * grid.h, y * grid.h);
        }
    }
    enforceWalls(grid);
    divergence(grid);
    grid.projection.available = false;
    grid.pressureReady = false;
}

// [snippet stir-stroke]
inline void stirStroke(Grid& grid, Vec2 from, Vec2 to) {
    if (!inside(from) || !inside(to)) {
        return;
    }
    const double sigma = std::max(0.05, 2 * grid.h);
    const int count = std::max(1, static_cast<int>(std::ceil(std::hypot(to.x - from.x, to.y - from.y) / (0.5 * sigma))));
    const Vec2 increment{(to.x - from.x) / count, (to.y - from.y) / count};
    for (int i = 0; i < count; ++i) {
        const double t = (i + 0.5) / count;
        impulseAt(grid, {from.x + t * (to.x - from.x), from.y + t * (to.y - from.y)}, increment);
    }
}

// [/snippet stir-stroke]
#endif
} // namespace fluid
