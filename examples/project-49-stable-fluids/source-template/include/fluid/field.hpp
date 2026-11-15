#pragma once
#include "state.hpp"

namespace fluid {
inline double rms(const std::vector<double>& values) {
    double sum = 0;
    for (const double value : values) {
        if (!std::isfinite(value)) {
            return std::numeric_limits<double>::infinity();
        }
        sum += value * value;
    }
    return std::sqrt(sum / values.size());
}

#if LAB_CHECKPOINT >= 3
// [snippet sample]
inline double sample(const Grid& grid, const std::vector<double>& values, int width, int height, Vec2 offset, Vec2 point) {
    if (!std::isfinite(point.x) || !std::isfinite(point.y)) {
        throw std::invalid_argument("Nonfinite sample point");
    }
    const double gx = std::clamp(point.x / grid.h - offset.x, 0.0, static_cast<double>(width - 1));
    const double gy = std::clamp(point.y / grid.h - offset.y, 0.0, static_cast<double>(height - 1));
    const int x = std::min(width - 2, static_cast<int>(std::floor(gx)));
    const int y = std::min(height - 2, static_cast<int>(std::floor(gy)));
    const double tx = gx - x;
    const double ty = gy - y;
    const int i = y * width + x;
    const double lower = (1 - tx) * values[i] + tx * values[i + 1];
    const double upper = (1 - tx) * values[i + width] + tx * values[i + width + 1];
    return (1 - ty) * lower + ty * upper;
}

// [/snippet sample]

inline Vec2 velocityAt(const Grid& grid, Vec2 point) {
#if LAB_CHECKPOINT >= 4
    return {sample(grid, grid.u, grid.n + 1, grid.n, {0, 0.5}, point), sample(grid, grid.v, grid.n, grid.n + 1, {0.5, 0}, point)};
#else
    static_cast<void>(grid);
    static_cast<void>(point);
    return {0.18, 0};
#endif
}
#endif

#if LAB_CHECKPOINT >= 4
// [snippet walls]
inline void enforceWalls(Grid& grid) {
    for (int y = 0; y < grid.n; ++y) {
        grid.u[y * (grid.n + 1)] = 0;
        grid.u[y * (grid.n + 1) + grid.n] = 0;
    }
    for (int x = 0; x < grid.n; ++x) {
        grid.v[x] = 0;
        grid.v[grid.n * grid.n + x] = 0;
    }
}

// [/snippet walls]

// [snippet divergence]
inline double divergence(Grid& grid) {
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const int faceU = y * (grid.n + 1) + x;
            const int faceV = y * grid.n + x;
            grid.divergence[y * grid.n + x] = (grid.u[faceU + 1] - grid.u[faceU] + grid.v[faceV + grid.n] - grid.v[faceV]) / grid.h;
        }
    }
    return rms(grid.divergence);
}

// [/snippet divergence]
#endif
} // namespace fluid
