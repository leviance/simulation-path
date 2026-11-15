#pragma once
#include "field.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 3
// [snippet backtrace]
inline Vec2 backtrace(const Grid& grid, Vec2 point, double dt) {
    const Vec2 first = velocityAt(grid, point);
    const Vec2 middle{point.x - 0.5 * dt * first.x, point.y - 0.5 * dt * first.y};
    const Vec2 flow = velocityAt(grid, middle);
    return {point.x - dt * flow.x, point.y - dt * flow.y};
}

// [/snippet backtrace]

// [snippet advect-smoke]
inline void advectSmoke(Grid& grid, double dt = fixedDt) {
    if (!std::isfinite(dt) || dt <= 0 || dt > 0.1) {
        throw std::invalid_argument("Advection dt must be in (0,0.1]");
    }
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const int i = y * grid.n + x;
            const Vec2 point{(x + 0.5) * grid.h, (y + 0.5) * grid.h};
            const Vec2 origin = backtrace(grid, point, dt);
            grid.densityNext[i] = sample(grid, grid.density, grid.n, grid.n, {0.5, 0.5}, origin);
#if LAB_CHECKPOINT >= 8
            for (int channel = 0; channel < 3; ++channel) {
                grid.pigmentNext[channel][i] = sample(grid, grid.pigment[channel], grid.n, grid.n, {0.5, 0.5}, origin);
            }
#endif
        }
    }
    grid.density.swap(grid.densityNext);
#if LAB_CHECKPOINT >= 8
    for (int channel = 0; channel < 3; ++channel) {
        grid.pigment[channel].swap(grid.pigmentNext[channel]);
    }
#endif
}

// [/snippet advect-smoke]
#endif

#if LAB_CHECKPOINT >= 7
// [snippet advect-velocity]
inline void advectVelocity(Grid& grid) {
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x <= grid.n; ++x) {
            const Vec2 point{x * grid.h, (y + 0.5) * grid.h};
            grid.uNext[y * (grid.n + 1) + x] = sample(grid, grid.u, grid.n + 1, grid.n, {0, 0.5}, backtrace(grid, point, fixedDt));
        }
    }
    for (int y = 0; y <= grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const Vec2 point{(x + 0.5) * grid.h, y * grid.h};
            grid.vNext[y * grid.n + x] = sample(grid, grid.v, grid.n, grid.n + 1, {0.5, 0}, backtrace(grid, point, fixedDt));
        }
    }
    // Cả hai lượt đã đọc cùng u/v cũ. Chỉ bây giờ mới thay state.
    grid.u.swap(grid.uNext);
    grid.v.swap(grid.vNext);
    enforceWalls(grid);
}

// [/snippet advect-velocity]
#endif
} // namespace fluid
