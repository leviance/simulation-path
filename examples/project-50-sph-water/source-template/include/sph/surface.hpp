#pragma once
#include "model.hpp"
#include <cstdint>
#include <numbers>

namespace water {
struct Surface {
    int w = 720;
    int hh = 432;
    std::vector<float> coverage = std::vector<float>(w * hh);
    std::vector<std::uint8_t> rgba = std::vector<std::uint8_t>(w * hh * 4);
    std::size_t drawn = 0;
};

#if LAB_CHECKPOINT >= 9
// [snippet surface]
inline void reconstruct(const State& state, Surface& surface) {
    std::fill(surface.coverage.begin(), surface.coverage.end(), 0.0f);
    const double radius = 1.65 * spacing;
    const double scale = surface.w / width;
    const double pixels = radius * scale;
    const double weight = 4 / (std::numbers::pi * 1.65 * 1.65);
    surface.drawn = 0;
    for (const auto& p : state.particles) {
        const double cx = p.x * scale;
        const double cy = (height - p.y) * scale;
        const int left = std::max(0, static_cast<int>(std::floor(cx - pixels)));
        const int right = std::min(surface.w - 1, static_cast<int>(std::ceil(cx + pixels)));
        const int top = std::max(0, static_cast<int>(std::floor(cy - pixels)));
        const int bottom = std::min(surface.hh - 1, static_cast<int>(std::ceil(cy + pixels)));
        for (int y = top; y <= bottom; ++y) {
            for (int x = left; x <= right; ++x) {
                const double dx = (x + 0.5 - cx) / pixels;
                const double dy = (y + 0.5 - cy) / pixels;
                const double q2 = dx * dx + dy * dy;
                if (q2 < 1) {
                    const double t = 1 - q2;
                    surface.coverage[y * surface.w + x] += static_cast<float>(weight * t * t * t);
                }
            }
        }
        ++surface.drawn;
    }
}

// [/snippet surface]
// [snippet shade]
inline void shade(Surface& surface) {
    for (int y = 0; y < surface.hh; ++y) {
        for (int x = 0; x < surface.w; ++x) {
            const int i = y * surface.w + x;
            const double phi = surface.coverage[i];
            const double dx = surface.coverage[y * surface.w + std::min(x + 1, surface.w - 1)] - surface.coverage[y * surface.w + std::max(x - 1, 0)];
            const double dy = surface.coverage[std::min(y + 1, surface.hh - 1) * surface.w + x] - surface.coverage[std::max(y - 1, 0) * surface.w + x];
            const double normal = std::max(0.0, (0.35 * dx + 0.94 * dy) / std::max(1e-9, std::hypot(dx, dy)));
            const double edge = std::exp(-70 * (phi - 0.65) * (phi - 0.65)) * (0.25 + 0.75 * normal);
            const double alpha = std::clamp((phi - 0.30) * 5, 0.0, 1.0);
            const double elevation = 1 - static_cast<double>(y) / surface.hh;
            double grid = 0;
            if (x % 36 == 0 || y % 36 == 0) {
                grid = 4;
            }
            const double background[3] = {9 + grid, 18 + grid, 31 + grid};
            const double waterColor[3] = {14 + 12 * elevation + 128 * edge, 102 + 40 * elevation + 105 * edge, 190 + 25 * elevation + 38 * edge};
            for (int channel = 0; channel < 3; ++channel) {
                surface.rgba[4 * i + channel] = static_cast<std::uint8_t>(std::clamp(background[channel] * (1 - alpha) + waterColor[channel] * alpha, 0.0, 255.0));
            }
            surface.rgba[4 * i + 3] = 255;
        }
    }
}

// [/snippet shade]
#endif
} // namespace water
