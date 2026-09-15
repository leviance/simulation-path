#pragma once

#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <vector>

namespace framebuffer {

// Các primitive CPU này giữ renderer SDL ở mức tối thiểu để bài học tập trung vào mô phỏng.
inline void putPixel(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    int x,
    int y,
    std::uint32_t color
) {
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
    const double arrowLength = std::hypot(directionX, directionY);
    if (arrowLength < 1.0) {
        return;
    }

    const double unitX = directionX / arrowLength;
    const double unitY = directionY / arrowLength;
    constexpr double headLength = 8.0;
    constexpr double headWidth = 4.0;
    const int leftX = int(std::lround(double(endX) - headLength * unitX - headWidth * unitY));
    const int leftY = int(std::lround(double(endY) - headLength * unitY + headWidth * unitX));
    const int rightX = int(std::lround(double(endX) - headLength * unitX + headWidth * unitY));
    const int rightY = int(std::lround(double(endY) - headLength * unitY - headWidth * unitX));
    drawLine(pixels, width, height, endX, endY, leftX, leftY, color);
    drawLine(pixels, width, height, endX, endY, rightX, rightY, color);
}

} // namespace framebuffer
