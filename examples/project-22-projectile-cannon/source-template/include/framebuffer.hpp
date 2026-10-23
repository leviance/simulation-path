#pragma once
#include "lab.hpp"
#include <cstdint>

namespace lab {
struct Framebuffer {
    static constexpr int width = 1000;
    static constexpr int height = 560;
    std::vector<std::uint32_t> pixels = std::vector<std::uint32_t>(width * height);
};

inline void putPixel(Framebuffer& frame, int x, int y, std::uint32_t color) {
    if (x >= 0 && x < frame.width && y >= 0 && y < frame.height) {
        frame.pixels[std::size_t(y) * std::size_t(frame.width) + std::size_t(x)] = color;
    }
}

// Clip bằng tham số trước khi đổi sang int; đường ngoài màn hình vẫn hữu hạn.
inline void drawLine(Framebuffer& frame, Vec2 a, Vec2 b, std::uint32_t color) {
    const Vec2 delta = subtract(b, a);
    double first = 0.0;
    double last = 1.0;
    const auto clip = [&](double p, double q) {
        if (std::abs(p) < 1e-12) {
            return q >= 0.0;
        }
        const double t = q / p;
        if (p < 0.0) {
            first = std::max(first, t);
        } else {
            last = std::min(last, t);
        }
        return first <= last;
    };
    if (!clip(-delta.x, a.x) || !clip(delta.x, frame.width - 1.0 - a.x) || !clip(-delta.y, a.y) || !clip(delta.y, frame.height - 1.0 - a.y)) {
        return;
    }
    const int steps = std::max(1, int(std::ceil(std::max(std::abs(delta.x), std::abs(delta.y)) * (last - first))));
    for (int index = 0; index <= steps; ++index) {
        const double t = first + (last - first) * double(index) / double(steps);
        putPixel(frame, int(std::lround(a.x + delta.x * t)), int(std::lround(a.y + delta.y * t)), color);
    }
}

inline void fillCircle(Framebuffer& frame, Vec2 center, int radius, std::uint32_t color) {
    if (center.x < -radius || center.x > frame.width + radius || center.y < -radius || center.y > frame.height + radius) {
        return;
    }
    const int cx = int(std::lround(center.x));
    const int cy = int(std::lround(center.y));
    for (int y = -radius; y <= radius; ++y) {
        for (int x = -radius; x <= radius; ++x) {
            if (x * x + y * y <= radius * radius) {
                putPixel(frame, cx + x, cy + y, color);
            }
        }
    }
}

inline void drawArrow(Framebuffer& frame, Vec2 a, Vec2 b, std::uint32_t color) {
    drawLine(frame, a, b, color);
    const Vec2 delta = subtract(b, a);
    if (length(delta) < 1e-9) {
        return;
    }
    const Vec2 back = scale(delta, -10.0 / length(delta));
    const Vec2 wing{-back.y * 0.5, back.x * 0.5};
    drawLine(frame, b, add(b, add(back, wing)), color);
    drawLine(frame, b, add(b, subtract(back, wing)), color);
}
} // namespace lab
