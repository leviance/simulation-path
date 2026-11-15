#pragma once
#include "transport.hpp"

namespace fluid {
#if LAB_CHECKPOINT >= 12
inline void advectField(const Grid& grid, const std::vector<double>& input, std::vector<double>& output, const std::vector<Vec2>& origins) {
    for (std::size_t i = 0; i < input.size(); ++i) {
        output[i] = sample(grid, input, grid.n, grid.n, {0.5, 0.5}, origins[i]);
    }
}

// [snippet maccormack]
inline void advectDetailed(Grid& grid, const std::vector<double>& input, std::vector<double>& output) {
    advectField(grid, input, grid.scalarForward, grid.forwardOrigin);
    advectField(grid, grid.scalarForward, grid.scalarBackward, grid.backwardOrigin);
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const int i = y * grid.n + x;
            const Vec2 origin = grid.forwardOrigin[i];
            const double gx = origin.x / grid.h - 0.5;
            const double gy = origin.y / grid.h - 0.5;
            if (gx < 0 || gy < 0 || gx > grid.n - 1 || gy > grid.n - 1) {
                output[i] = grid.scalarForward[i];
                continue;
            }
            const int left = std::min(grid.n - 2, static_cast<int>(std::floor(gx)));
            const int lower = std::min(grid.n - 2, static_cast<int>(std::floor(gy)));
            const int j = lower * grid.n + left;
            const double minimum = std::min({input[j], input[j + 1], input[j + grid.n], input[j + grid.n + 1]});
            const double maximum = std::max({input[j], input[j + 1], input[j + grid.n], input[j + grid.n + 1]});
            const double corrected = grid.scalarForward[i] + 0.5 * (input[i] - grid.scalarBackward[i]);
            output[i] = std::clamp(corrected, minimum, maximum);
        }
    }
}

// [/snippet maccormack]

inline void advectSmokeDetailed(Grid& grid) {
    // Cả bốn scalar dùng cùng velocity: tính đường lấy mẫu một lần, không lặp cho từng màu.
    for (int y = 0; y < grid.n; ++y) {
        for (int x = 0; x < grid.n; ++x) {
            const int i = y * grid.n + x;
            const Vec2 point{(x + 0.5) * grid.h, (y + 0.5) * grid.h};
            grid.forwardOrigin[i] = backtrace(grid, point, fixedDt);
            grid.backwardOrigin[i] = backtrace(grid, point, -fixedDt);
        }
    }
    advectDetailed(grid, grid.density, grid.densityNext);
    for (int channel = 0; channel < 3; ++channel) {
        advectDetailed(grid, grid.pigment[channel], grid.pigmentNext[channel]);
    }
    grid.density.swap(grid.densityNext);
    for (int channel = 0; channel < 3; ++channel) {
        grid.pigment[channel].swap(grid.pigmentNext[channel]);
    }
}
#endif
} // namespace fluid
