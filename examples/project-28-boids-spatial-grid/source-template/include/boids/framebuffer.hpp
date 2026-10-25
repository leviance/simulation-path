// Provided Project 27 baseline: steering and integration rules are unchanged.
#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <vector>

namespace lab {
inline constexpr std::uint32_t kBackground = 0x0b1020ff;
inline constexpr std::uint32_t kGrid = 0x24324dff;
inline constexpr std::uint32_t kRail = 0x66738cff;
inline constexpr std::uint32_t kExact = 0xf5f7ffff;
inline constexpr std::uint32_t kColors[3]{0xff7b72ff, 0x53f0aeff, 0xc792eaff};

struct Framebuffer {
    static constexpr int width = 1100;
    static constexpr int height = 820;
    std::vector<std::uint32_t> pixels = std::vector<std::uint32_t>(width * height, kBackground);

    void clear() {
        std::fill(pixels.begin(), pixels.end(), kBackground);
    }

    void putPixel(int x, int y, std::uint32_t color) {
        if (x >= 0 && y >= 0 && x < width && y < height) {
            pixels[static_cast<std::size_t>(y * width + x)] = color;
        }
    }
};

// Cắt tọa độ liên tục trước khi làm tròn để tọa độ ngoài màn hình không tạo vòng lặp dài.
inline void drawLine(Framebuffer& image, double x0, double y0, double x1, double y1, std::uint32_t color) {
    if (!std::isfinite(x0) || !std::isfinite(y0) || !std::isfinite(x1) || !std::isfinite(y1)) {
        return;
    }
    const double dx = x1 - x0;
    const double dy = y1 - y0;
    if (!std::isfinite(dx) || !std::isfinite(dy)) {
        return;
    }
    double first = 0.0;
    double last = 1.0;
    const auto clip = [&](double direction, double distance) {
        if (direction == 0.0) {
            return distance >= 0.0;
        }
        const double fraction = distance / direction;
        if (direction < 0.0) {
            first = std::max(first, fraction);
        } else {
            last = std::min(last, fraction);
        }
        return first <= last;
    };
    if (!clip(-dx, x0) || !clip(dx, Framebuffer::width - 1.0 - x0) || !clip(-dy, y0) || !clip(dy, Framebuffer::height - 1.0 - y0)) {
        return;
    }
    int x = static_cast<int>(std::lround(x0 + first * dx));
    int y = static_cast<int>(std::lround(y0 + first * dy));
    const int endX = static_cast<int>(std::lround(x0 + last * dx));
    const int endY = static_cast<int>(std::lround(y0 + last * dy));
    const int ax = std::abs(endX - x);
    const int ay = -std::abs(endY - y);
    int sx = -1;
    int sy = -1;
    if (x < endX) {
        sx = 1;
    }
    if (y < endY) {
        sy = 1;
    }
    int error = ax + ay;
    while (true) {
        image.putPixel(x, y, color);
        if (x == endX && y == endY) {
            break;
        }
        const int twice = 2 * error;
        if (twice >= ay) {
            error += ay;
            x += sx;
        }
        if (twice <= ax) {
            error += ax;
            y += sy;
        }
    }
}

inline void rectangle(Framebuffer& image, int left, int top, int right, int bottom, std::uint32_t color, bool filled) {
    if (!filled) {
        drawLine(image, left, top, right, top, color);
        drawLine(image, right, top, right, bottom, color);
        drawLine(image, right, bottom, left, bottom, color);
        drawLine(image, left, bottom, left, top, color);
        return;
    }
    for (int y = std::max(0, top); y <= std::min(bottom, Framebuffer::height - 1); ++y) {
        for (int x = std::max(0, left); x <= std::min(right, Framebuffer::width - 1); ++x) {
            image.putPixel(x, y, color);
        }
    }
}
} // namespace lab
