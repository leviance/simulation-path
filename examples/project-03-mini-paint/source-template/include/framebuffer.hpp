#pragma once
#include <algorithm>
#include <cstdint>
#include <vector>

namespace lab {

// Giữ nguyên ảnh logic sau resize: tranh là dữ liệu, không phải frame vẽ lại từ đầu.
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
        pixels[static_cast<std::size_t>(y) * width + x] = color;
    }
};

inline std::uint32_t rgba(std::uint8_t red, std::uint8_t green, std::uint8_t blue) {
    return (std::uint32_t(red) << 24) | (std::uint32_t(green) << 16) | (std::uint32_t(blue) << 8) | 255u;
}

constexpr std::uint32_t kBackground = 0x11182BFFu;

} // namespace lab
