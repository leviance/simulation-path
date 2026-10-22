#pragma once
#include "geometry.hpp"
#include <cstdlib>

namespace lab {
// Buffers sở hữu cùng một kích thước; clear depth bắt buộc ở mỗi frame.
struct Framebuffer {
    int width;
    int height;
    std::vector<std::uint32_t> pixels;
    std::vector<double> inverseDepth;
    std::vector<int> owner;

    explicit Framebuffer(int w = 960, int h = 640)
        : width(w), height(h), pixels(std::size_t(w) * std::size_t(h)), inverseDepth(pixels.size()), owner(pixels.size(), -1) {}

    void clear() {
        std::fill(pixels.begin(), pixels.end(), 0x11182BFFu);
        std::fill(inverseDepth.begin(), inverseDepth.end(), 0.0);
        std::fill(owner.begin(), owner.end(), -1);
    }

    void putPixel(int x, int y, std::uint32_t color) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }
        pixels[std::size_t(y) * std::size_t(width) + std::size_t(x)] = color;
    }
};

inline std::uint32_t packColor(Color color) {
    const auto byte = [](double value) {
        return std::uint32_t(std::lround(std::clamp(value, 0.0, 255.0)));
    };
    return (byte(color.red) << 24U) | (byte(color.green) << 16U) | (byte(color.blue) << 8U) | 255U;
}

inline void drawLine(Framebuffer& image, int x0, int y0, int x1, int y1, std::uint32_t color) {
    const int dx = std::abs(x1 - x0), dy = -std::abs(y1 - y0);
    int sx = -1, sy = -1;
    if (x0 < x1) {
        sx = 1;
    }
    if (y0 < y1) {
        sy = 1;
    }
    int error = dx + dy;
    while (true) {
        image.putPixel(x0, y0, color);
        if (x0 == x1 && y0 == y1) {
            break;
        }
        const int twice = error * 2;
        if (twice >= dy) {
            error += dy;
            x0 += sx;
        }
        if (twice <= dx) {
            error += dx;
            y0 += sy;
        }
    }
}
} // namespace lab
