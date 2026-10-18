#pragma once
#include <algorithm>
#include <cstdint>
#include <vector>

namespace lab {

// Ảnh logic cố định: resize cửa sổ chỉ đổi tỉ lệ hiển thị, không đổi đơn vị.
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

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#if LAB_CHECKPOINT >= 1
// Hai cạnh phải/dưới không thuộc hình: width=34 luôn tô đúng 34 cột.
inline void fillRectangle(Framebuffer& framebuffer, int left, int top, int width, int height, std::uint32_t color) {
    if (width <= 0 || height <= 0) {
        return;
    }

    // Dùng int64_t trước khi cộng để cả tọa độ cực trị cũng không tràn int.
    const auto right = std::clamp<std::int64_t>(std::int64_t(left) + width, 0, Framebuffer::width);
    const auto bottom = std::clamp<std::int64_t>(std::int64_t(top) + height, 0, Framebuffer::height);
    const int firstX = std::clamp(left, 0, Framebuffer::width);
    const int firstY = std::clamp(top, 0, Framebuffer::height);
    for (int y = firstY; y < bottom; ++y) {
        for (int x = firstX; x < right; ++x) {
            framebuffer.putPixel(x, y, color);
        }
    }
}
#endif

} // namespace lab
