#pragma once

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace framebuffer {

// Các hàm vẽ trên CPU nhận tọa độ pixel. SDL chỉ đưa framebuffer đã vẽ lên cửa sổ.
inline void putPixel(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int x,
    int y,
    std::uint32_t color
) {
    // Bỏ qua pixel ngoài cửa sổ trước khi tính chỉ số row-major y * width + x.
    if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
    }
    pixels[std::size_t(y) * std::size_t(width) + std::size_t(x)] = color;
}

inline void clear(std::vector<std::uint32_t>& pixels, std::uint32_t color) {
    std::fill(pixels.begin(), pixels.end(), color);
}

inline void drawLine(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int x0,
    int y0,
    int x1,
    int y1,
    std::uint32_t color
) {
    // Bresenham chọn pixel kế tiếp bằng sai số nguyên, không phụ thuộc độ dốc của đoạn thẳng.
    const int deltaX = std::abs(x1 - x0);
    const int deltaY = -std::abs(y1 - y0);
    int stepX = -1;
    if (x0 < x1) {
        stepX = 1;
    }
    int stepY = -1;
    if (y0 < y1) {
        stepY = 1;
    }
    int error = deltaX + deltaY;

    while (true) {
        putPixel(pixels, width, height, x0, y0, color);
        if (x0 == x1 && y0 == y1) {
            break;
        }
        const int doubledError = 2 * error;
        // Hai nhánh độc lập: có bước cần đổi cả x lẫn y, nên không dùng else if.
        if (doubledError >= deltaY) {
            error += deltaY;
            x0 += stepX;
        }
        if (doubledError <= deltaX) {
            error += deltaX;
            y0 += stepY;
        }
    }
}

inline void drawRectangle(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int left,
    int top,
    int right,
    int bottom,
    std::uint32_t color
) {
    drawLine(pixels, width, height, left, top, right, top, color);
    drawLine(pixels, width, height, right, top, right, bottom, color);
    drawLine(pixels, width, height, right, bottom, left, bottom, color);
    drawLine(pixels, width, height, left, bottom, left, top, color);
}

inline void fillCircle(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int centerX,
    int centerY,
    int radius,
    std::uint32_t color
) {
    // Duyệt hình vuông bao quanh tâm, chỉ tô điểm nằm trong bán kính của hình tròn.
    const int radiusSquared = radius * radius;
    for (int offsetY = -radius; offsetY <= radius; ++offsetY) {
        for (int offsetX = -radius; offsetX <= radius; ++offsetX) {
            if (offsetX * offsetX + offsetY * offsetY <= radiusSquared) {
                putPixel(pixels, width, height, centerX + offsetX, centerY + offsetY, color);
            }
        }
    }
}

inline void drawArrow(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int startX,
    int startY,
    int endX,
    int endY,
    std::uint32_t color
) {
    drawLine(pixels, width, height, startX, startY, endX, endY, color);
    const double directionX = double(endX - startX);
    const double directionY = double(endY - startY);
    const double length = std::hypot(directionX, directionY);
    if (length < 1.0) {
        return;
    }

    const double unitX = directionX / length;
    const double unitY = directionY / length;
    constexpr double headLength = 9.0;
    constexpr double headWidth = 5.0;
    // Lùi từ đầu mũi tên theo hướng trục, rồi lệch sang hai bên theo vector vuông góc.
    const int leftX = int(std::lround(double(endX) - headLength * unitX - headWidth * unitY));
    const int leftY = int(std::lround(double(endY) - headLength * unitY + headWidth * unitX));
    const int rightX = int(std::lround(double(endX) - headLength * unitX + headWidth * unitY));
    const int rightY = int(std::lround(double(endY) - headLength * unitY - headWidth * unitX));
    drawLine(pixels, width, height, endX, endY, leftX, leftY, color);
    drawLine(pixels, width, height, endX, endY, rightX, rightY, color);
}

} // namespace framebuffer
