#pragma once
#include <algorithm>
#include <cstdint>
#include <cstdlib>
#include <vector>

namespace lab {
// Bảng logic cố định; resize/HiDPI chỉ thay cách SDL trình bày bảng.
struct Framebuffer {
    static constexpr int width = 1100;
    static constexpr int height = 800;
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

// Bresenham từ Project 04, nhận các screen point đã được giới hạn bởi bảng vẽ.
inline void drawLine(Framebuffer& image, int x0, int y0, int x1, int y1, std::uint32_t color) {
    const int dx = std::abs(x1 - x0);
    const int dy = -std::abs(y1 - y0);
    int sx = -1;
    int sy = -1;
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
        const int e2 = error * 2;
        if (e2 >= dy) {
            error += dy;
            x0 += sx;
        }
        if (e2 <= dx) {
            error += dx;
            y0 += sy;
        }
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

inline void drawCircle(Framebuffer& image, int cx, int cy, int radius, std::uint32_t color) {
    int x = radius;
    int y = 0;
    int decision = 1 - radius;
    while (x >= y) {
        for (int sx : {-1, 1}) {
            for (int sy : {-1, 1}) {
                image.putPixel(cx + sx * x, cy + sy * y, color);
                image.putPixel(cx + sx * y, cy + sy * x, color);
            }
        }
        ++y;
        if (decision < 0) {
            decision += 2 * y + 1;
        } else {
            --x;
            decision += 2 * (y - x) + 1;
        }
    }
}

constexpr std::uint32_t kBackground = 0x11182BFFu;
constexpr std::uint32_t kGrid = 0x28334DFFu;
constexpr std::uint32_t kShape = 0x53F0AEFFu;
constexpr std::uint32_t kGhost = 0x74839FFFu;
constexpr std::uint32_t kAxisX = 0xFF6B6BFFu;
constexpr std::uint32_t kAxisY = 0x84A9FFFFu;
constexpr std::uint32_t kWhite = 0xFFFFFFFFu;
constexpr std::uint32_t kMarker = 0xFFE26CFFu;
} // namespace lab
