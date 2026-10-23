#pragma once
#include "geometry.hpp"

namespace lab {
// CPU giữ packed RGBA8888; putPixel là nơi duy nhất đổi (x,y) thành row-major index.
struct Framebuffer {
    int width{960};
    int height{640};
    std::vector<std::uint32_t> pixels = std::vector<std::uint32_t>(std::size_t(width) * std::size_t(height));
};

inline std::uint32_t packColor(Color color) {
    const auto byte = [](double value) {
        return std::uint32_t(std::lround(std::clamp(value, 0.0, 255.0)));
    };
    return (byte(color.red) << 24U) | (byte(color.green) << 16U) | (byte(color.blue) << 8U) | 255U;
}

inline void putPixel(Framebuffer& image, int x, int y, Color color) {
    if (x >= 0 && y >= 0 && x < image.width && y < image.height) {
        image.pixels[std::size_t(y) * std::size_t(image.width) + std::size_t(x)] = packColor(color);
    }
}

inline void drawLine(Framebuffer& image, Vec2 a, Vec2 b, Color color, std::optional<Viewport> clip = std::nullopt) {
    int x = int(std::lround(a.x));
    int y = int(std::lround(a.y));
    const int endX = int(std::lround(b.x));
    const int endY = int(std::lround(b.y));
    const int dx = std::abs(endX - x);
    const int dy = -std::abs(endY - y);
    int sx = -1;
    if (x < endX) {
        sx = 1;
    }
    int sy = -1;
    if (y < endY) {
        sy = 1;
    }
    int error = dx + dy;
    while (true) {
        if (!clip || (x >= clip->left && x < clip->left + clip->width && y >= clip->top && y < clip->top + clip->height)) {
            putPixel(image, x, y, color);
        }
        if (x == endX && y == endY) {
            break;
        }
        const int twice = 2 * error;
        if (twice >= dy) {
            error += dy;
            x += sx;
        }
        if (twice <= dx) {
            error += dx;
            y += sy;
        }
    }
}
} // namespace lab
