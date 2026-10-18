#pragma once
#include <algorithm>
#include <cstdint>
#include <vector>

namespace lab {
// Ảnh CPU theo kích thước logic của window, không theo số pixel vật lý HiDPI.
struct Framebuffer {
    int width{960};
    int height{540};
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

constexpr std::uint32_t kBackground = 0x11182BFFu;
constexpr std::uint32_t kGrid = 0x28334DFFu;
constexpr std::uint32_t kAxisX = 0xFFB454FFu;
constexpr std::uint32_t kAxisY = 0x84A9FFFFu;
constexpr std::uint32_t kPoint = 0x53F0AEFFu;
constexpr std::uint32_t kSelected = 0xFFFFFFFFu;

// Các primitive chỉ ghi framebuffer; SDL không tính hình học thay chúng ta.
inline void horizontal(Framebuffer& image, int y, std::uint32_t color) {
    for (int x = 0; x < image.width; ++x) {
        image.putPixel(x, y, color);
    }
}

inline void vertical(Framebuffer& image, int x, std::uint32_t color) {
    for (int y = 0; y < image.height; ++y) {
        image.putPixel(x, y, color);
    }
}

inline void disc(Framebuffer& image, int cx, int cy, int radius, std::uint32_t color) {
    for (int y = -radius; y <= radius; ++y) {
        for (int x = -radius; x <= radius; ++x) {
            if (x * x + y * y <= radius * radius) {
                image.putPixel(cx + x, cy + y, color);
            }
        }
    }
}
} // namespace lab
