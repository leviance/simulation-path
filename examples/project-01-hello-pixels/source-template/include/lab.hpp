#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#if LAB_CHECKPOINT >= 2
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <vector>
#endif
namespace lab {
#if LAB_CHECKPOINT >= 3
constexpr std::uint32_t rgba(std::uint8_t r, std::uint8_t g, std::uint8_t b, std::uint8_t a = 255) {
    return (std::uint32_t(r) << 24) | (std::uint32_t(g) << 16) | (std::uint32_t(b) << 8) | std::uint32_t(a);
}

static_assert(rgba(255, 0, 0) == 0xFF0000FFu);
static_assert(rgba(0, 255, 0, 128) == 0x00FF0080u);
#endif
#if LAB_CHECKPOINT >= 2

// Framebuffer sở hữu một mảng pixel row-major ở phía CPU.
struct Framebuffer {
    int width{};
    int height{};
    std::vector<std::uint32_t> pixels;

    Framebuffer(int w, int h) {
        resize(w, h);
    }

    void resize(int w, int h) {
        width = std::max(1, w);
        height = std::max(1, h);
        const std::size_t pixelCount = std::size_t(width) * std::size_t(height);
#if LAB_CHECKPOINT >= 3
        pixels.assign(pixelCount, rgba(11, 16, 32));
#else
        pixels.assign(pixelCount, 0u);
#endif
    }

    [[nodiscard]] std::size_t index(int x, int y) const {
        return std::size_t(y) * std::size_t(width) + std::size_t(x);
    }
#if LAB_CHECKPOINT >= 3
    void putPixel(int x, int y, std::uint32_t color) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }
        pixels[index(x, y)] = color;
    }

    void clear(std::uint32_t color) {
        std::fill(pixels.begin(), pixels.end(), color);
    }
#endif
#if LAB_CHECKPOINT >= 4

    // Mỗi pattern chỉ thay đổi dữ liệu pixel; renderer không cần biết cách tạo màu.
    void gradient() {
        const int denominatorX = std::max(1, width - 1);
        const int denominatorY = std::max(1, height - 1);
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                const auto r = std::uint8_t(255.0 * x / denominatorX);
                const auto g = std::uint8_t(255.0 * y / denominatorY);
                putPixel(x, y, rgba(r, g, 180));
            }
        }
    }

    void checker(int cell = 32) {
        cell = std::max(1, cell);
        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                const int cellX = x / cell;
                const int cellY = y / cell;
                const bool odd = (cellX + cellY) % 2 != 0;
                std::uint32_t color = rgba(83, 240, 174);
                if (odd) {
                    color = rgba(31, 43, 68);
                }
                putPixel(x, y, color);
            }
        }
    }

    void noise(std::uint32_t seed = 17) {
        std::uint32_t state = seed;
        for (auto& pixel : pixels) {
            state = state * 1664525u + 1013904223u;
            const auto value = std::uint8_t(state >> 24);
            pixel = rgba(value, std::uint8_t(value / 2), std::uint8_t(255 - value));
        }
    }
#endif
};
#endif
} // namespace lab
