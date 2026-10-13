#pragma once
#include "grid.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 3
inline double sample(const Grid& grid, const std::vector<double>& values, int width, int height, Vec2 offset, Vec2 p) {
    // Backtrace có thể ra ngoài miền: mở rộng giá trị bằng mẫu gần mép nhất.
    const double gx = std::clamp(p.x * grid.n - offset.x, 0.0, static_cast<double>(width - 1));
    const double gy = std::clamp(p.y * grid.n - offset.y, 0.0, static_cast<double>(height - 1));
    const int x = std::min(width - 2, static_cast<int>(std::floor(gx)));
    const int y = std::min(height - 2, static_cast<int>(std::floor(gy)));
    const double tx = gx - x;
    const double ty = gy - y;
    const int i = y * width + x;
    const double bottom = (1 - tx) * values[i] + tx * values[i + 1];
    const double top = (1 - tx) * values[i + width] + tx * values[i + width + 1];
    return (1 - ty) * bottom + ty * top;
}
#endif

#if LAB_CHECKPOINT >= 4
inline Vec2 velocity(const Grid& grid, Vec2 p) {
    return {sample(grid, grid.u, grid.n + 1, grid.n, {0, 0.5}, p), sample(grid, grid.v, grid.n, grid.n + 1, {0.5, 0}, p)};
}
#endif

#if LAB_CHECKPOINT >= 3
inline void advectDensity(Grid& grid) {
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const Vec2 p{(x + 0.5) * grid.h, (y + 0.5) * grid.h};
#if LAB_CHECKPOINT >= 4
            const Vec2 flow = velocity(grid, p);
#else
            const Vec2 flow{0.2, 0};
#endif
            const Vec2 from{p.x - dt * flow.x, p.y - dt * flow.y};
            grid.densityNext[y * grid.n + x] = sample(grid, grid.density, grid.n, grid.n, {0.5, 0.5}, from);
        }
    }
    grid.density.swap(grid.densityNext);
}
#endif

#if LAB_CHECKPOINT >= 7
inline void advectVelocity(Grid& grid) {
    // Cả hai thành phần đều đọc u/v cũ; chỉ swap sau khi ghi xong cả hai.
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x <= grid.n; ++x) {
            const Vec2 p{x * grid.h, (y + 0.5) * grid.h};
            const Vec2 flow = velocity(grid, p);
            grid.uNext[y * (grid.n + 1) + x] = sample(grid, grid.u, grid.n + 1, grid.n, {0, 0.5}, {p.x - dt * flow.x, p.y - dt * flow.y});
        }
    }
    for (int y = 0; y <= grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const Vec2 p{(x + 0.5) * grid.h, y * grid.h};
            const Vec2 flow = velocity(grid, p);
            grid.vNext[y * grid.n + x] = sample(grid, grid.v, grid.n, grid.n + 1, {0.5, 0}, {p.x - dt * flow.x, p.y - dt * flow.y});
        }
    }
    grid.u.swap(grid.uNext);
    grid.v.swap(grid.vNext);
    enforceWalls(grid);
}
#endif
} // namespace fluid
