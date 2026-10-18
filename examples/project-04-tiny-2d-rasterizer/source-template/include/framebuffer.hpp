#pragma once
#include <algorithm>
#include <cstdint>
#include <vector>

namespace lab {

// Ảnh logic không đổi kích thước khi window được phóng to hoặc thu nhỏ.
struct Framebuffer {
    static constexpr int width = 960;
    static constexpr int height = 540;
    std::vector<std::uint32_t> pixels = std::vector<std::uint32_t>(width * height);

    void clear(std::uint32_t color) {
        std::fill(pixels.begin(), pixels.end(), color);
    }

    void putPixel(int x, int y, std::uint32_t color) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }
        const std::size_t index = static_cast<std::size_t>(y) * width + x;
        pixels[index] = color;
    }
};

constexpr std::uint32_t kBackground = 0x11182BFFu;
constexpr std::uint32_t kLineColor = 0x53F0AEFFu;
constexpr std::uint32_t kShapeColor = 0x84A9FFFFu;
constexpr std::uint32_t kSelectedColor = 0xFFB454FFu;

} // namespace lab
