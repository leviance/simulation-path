#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 2
#include <algorithm>
#include <cstddef>
#include <cstdint>
#include <new>
#include <vector>

namespace lab {

#if LAB_CHECKPOINT >= 3
// Đây là giá trị số 0xRRGGBBAA, không phải thứ tự byte trong RAM.
constexpr std::uint32_t rgba(std::uint8_t red, std::uint8_t green, std::uint8_t blue, std::uint8_t alpha = 255) {
    const std::uint32_t redBits = static_cast<std::uint32_t>(red) << 24;
    const std::uint32_t greenBits = static_cast<std::uint32_t>(green) << 16;
    const std::uint32_t blueBits = static_cast<std::uint32_t>(blue) << 8;
    return redBits | greenBits | blueBits | static_cast<std::uint32_t>(alpha);
}
#endif

// Mỗi phần tử trong vector là một pixel. Các hàng nằm liền nhau.
struct Framebuffer {
    int width = 0;
    int height = 0;
    std::vector<std::uint32_t> pixels;

    // 16 triệu pixel, tương đương 64 MiB; resize cần thêm một buffer tạm.
    static constexpr std::size_t maximumPixelCount = 16u * 1024u * 1024u;

    bool resize(int newWidth, int newHeight) {
        if (newWidth <= 0 || newHeight <= 0) {
            return false;
        }

        const std::size_t columns = static_cast<std::size_t>(newWidth);
        const std::size_t rows = static_cast<std::size_t>(newHeight);
        if (columns > maximumPixelCount / rows) {
            return false;
        }

        // Chỉ thay kích thước sau khi đã cấp phát thành công.
        try {
            std::vector<std::uint32_t> newPixels(columns * rows, 0u);
            pixels.swap(newPixels);
        } catch (const std::bad_alloc&) {
            return false;
        }

        width = newWidth;
        height = newHeight;
        return true;
    }

    // Điều kiện gọi: 0 <= x < width và 0 <= y < height.
    [[nodiscard]] std::size_t index(int x, int y) const {
        return static_cast<std::size_t>(y) * static_cast<std::size_t>(width) + static_cast<std::size_t>(x);
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
    void gradient() {
        const int denominatorX = std::max(1, width - 1);
        const int denominatorY = std::max(1, height - 1);

        for (int y = 0; y < height; ++y) {
            for (int x = 0; x < width; ++x) {
                const auto red = static_cast<std::uint8_t>(255.0 * x / denominatorX);
                const auto green = static_cast<std::uint8_t>(255.0 * y / denominatorY);
                putPixel(x, y, rgba(red, green, 180));
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

        // uint32_t quay vòng theo modulo 2^32: đây là chủ ý của LCG.
        for (std::uint32_t& pixel : pixels) {
            state = state * 1664525u + 1013904223u;
            const auto value = static_cast<std::uint8_t>(state >> 24);
            pixel = rgba(value, static_cast<std::uint8_t>(value / 2), static_cast<std::uint8_t>(255 - value));
        }
    }
#endif
};

} // namespace lab
#endif
