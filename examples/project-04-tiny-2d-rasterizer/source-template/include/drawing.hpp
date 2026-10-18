#pragma once
#include "framebuffer.hpp"
#include "lab.hpp"

namespace lab {
// Các API này ghép hình học với putPixel; không có lệnh SDL nào vẽ hộ primitive.
#if LAB_CHECKPOINT >= 1
inline void plotSteps(Framebuffer& framebuffer, const std::vector<LineStep>& steps, std::uint32_t color) {
    for (const LineStep& step : steps) {
        framebuffer.putPixel(step.point.x, step.point.y, color);
    }
}

#if LAB_CHECKPOINT == 1
inline void drawLine(Framebuffer& framebuffer, Point start, Point end, std::uint32_t color) {
    plotSteps(framebuffer, dda(start, end), color);
}
#else
inline void drawLine(Framebuffer& framebuffer, Point start, Point end, std::uint32_t color, Algorithm algorithm = Algorithm::Bresenham) {
    plotSteps(framebuffer, lineSteps(start, end, algorithm), color);
}
#endif
#endif

#if LAB_CHECKPOINT >= 4
inline void plotPoints(Framebuffer& framebuffer, const std::vector<Point>& points, std::uint32_t color) {
    for (Point point : points) {
        framebuffer.putPixel(point.x, point.y, color);
    }
}

inline void drawRect(Framebuffer& framebuffer, Point first, Point second, std::uint32_t color) {
    plotPoints(framebuffer, rectangle(first, second), color);
}

inline void fillRect(Framebuffer& framebuffer, Point first, Point second, std::uint32_t color) {
    plotPoints(framebuffer, filledRectangle(first, second), color);
}
#endif

#if LAB_CHECKPOINT >= 5
inline void drawCircle(Framebuffer& framebuffer, Point center, int radius, std::uint32_t color) {
    plotPoints(framebuffer, circle(center, radius), color);
}

inline void fillCircle(Framebuffer& framebuffer, Point center, int radius, std::uint32_t color) {
    plotPoints(framebuffer, filledCircle(center, radius), color);
}
#endif
} // namespace lab
