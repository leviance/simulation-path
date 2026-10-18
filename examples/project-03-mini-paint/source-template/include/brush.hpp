#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 1
#include "framebuffer.hpp"
#include "lab.hpp"

namespace lab {

// Floor chọn ô pixel đang chứa con trỏ; kiểm trước khi chuyển double sang int.
inline void stampPoint(Framebuffer& framebuffer, Point point, std::uint32_t color) {
    if (!insideCanvas(point)) {
        return;
    }
    const int x = static_cast<int>(std::floor(point.x));
    const int y = static_cast<int>(std::floor(point.y));
    framebuffer.putPixel(x, y, color);
}

#if LAB_CHECKPOINT >= 2
inline void stampCircle(Framebuffer& framebuffer, Point center, int radius, std::uint32_t color) {
    if (!insideCanvas(center) || radius < 2 || radius > 64) {
        return;
    }
    const int centerX = static_cast<int>(std::floor(center.x));
    const int centerY = static_cast<int>(std::floor(center.y));

    // Bán kính đã giới hạn, nên bình phương và hai vòng lặp đều nhỏ, hữu hạn.
    for (int dy = -radius; dy <= radius; ++dy) {
        for (int dx = -radius; dx <= radius; ++dx) {
            if (dx * dx + dy * dy <= radius * radius) {
                framebuffer.putPixel(centerX + dx, centerY + dy, color);
            }
        }
    }
}
#endif

} // namespace lab
#endif
