#pragma once
#include "drawing.hpp"
#include "scene.hpp"
#if LAB_CHECKPOINT >= 3
#include <array>
#endif

namespace lab {
struct SceneFrame {
#if LAB_CHECKPOINT >= 1
    std::vector<LineStep> line;
    std::vector<Point> points;
#endif
};

#if LAB_CHECKPOINT >= 3
inline void drawHandle(Framebuffer& framebuffer, Point center, std::uint32_t color) {
    for (int y = center.y - 4; y <= center.y + 4; ++y) {
        for (int x = center.x - 4; x <= center.x + 4; ++x) {
            framebuffer.putPixel(x, y, color);
        }
    }
}

inline void drawInspector(Framebuffer& framebuffer, Point selected) {
    constexpr int kCells = 9;
    constexpr int kCellSize = 16;
    constexpr int kOriginX = 800;
    constexpr int kOriginY = 380;
    std::array<std::uint32_t, kCells * kCells> source{};

    // Chụp vùng nguồn trước khi vẽ overlay để không tự đọc pixel vừa phóng to.
    for (int row = 0; row < kCells; ++row) {
        for (int column = 0; column < kCells; ++column) {
            const int x = selected.x + column - kCells / 2;
            const int y = selected.y + row - kCells / 2;
            std::uint32_t color = kBackground;
            if (imagePoint(x, y)) {
                color = framebuffer.pixels[static_cast<std::size_t>(y) * Framebuffer::width + x];
            }
            source[static_cast<std::size_t>(row * kCells + column)] = color;
        }
    }

    for (int row = 0; row < kCells; ++row) {
        for (int column = 0; column < kCells; ++column) {
            std::uint32_t border = 0x39445FFFu;
            if (column == kCells / 2 && row == kCells / 2) {
                border = kSelectedColor;
            }
            for (int dy = 0; dy < kCellSize; ++dy) {
                for (int dx = 0; dx < kCellSize; ++dx) {
                    std::uint32_t color = border;
                    if (dx > 0 && dy > 0) {
                        color = source[static_cast<std::size_t>(row * kCells + column)];
                    }
                    framebuffer.putPixel(kOriginX + column * kCellSize + dx, kOriginY + row * kCellSize + dy, color);
                }
            }
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 6
inline void drawGallery(Framebuffer& framebuffer) {
    for (int row = 0; row < 3; ++row) {
        for (int column = 0; column < 4; ++column) {
            const int left = 20 + column * 235;
            const int top = 20 + row * 170;
            drawRect(framebuffer, {left, top}, {left + 215, top + 145}, 0x39445FFFu);
            fillRect(framebuffer, {left + 14, top + 18}, {left + 58, top + 62}, 0x233255FFu);
            drawRect(framebuffer, {left + 14, top + 18}, {left + 58, top + 62}, kShapeColor);
            const Point center{left + 150, top + 76};
            const int radius = 22 + 5 * row;
            fillCircle(framebuffer, center, radius, 0x243B50FFu);
            drawCircle(framebuffer, center, radius, kLineColor);
            const Point start{left + 20, top + 120};
            const Point end{left + 194, top + 20 + column * 26};
            drawLine(framebuffer, start, end, kSelectedColor);
        }
    }
}
#endif

inline SceneFrame renderScene(Framebuffer& framebuffer, Scene& scene) {
    framebuffer.clear(kBackground);
    SceneFrame frame;
#if LAB_CHECKPOINT >= 6
    if (scene.tool == Tool::Gallery) {
        drawGallery(framebuffer);
        return frame;
    }
#endif
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 3
    if (scene.tool == Tool::Line) {
#endif
#if LAB_CHECKPOINT == 1
        frame.line = dda(scene.a, scene.b);
#else
        frame.line = lineSteps(scene.a, scene.b, scene.algorithm);
#endif
        plotSteps(framebuffer, frame.line, kLineColor);
        for (const LineStep& step : frame.line) {
            frame.points.push_back(step.point);
        }
#if LAB_CHECKPOINT >= 3
    }
#endif
#endif

#if LAB_CHECKPOINT >= 4
    if (scene.tool == Tool::Rectangle) {
        if (scene.filled) {
            frame.points = filledRectangle(scene.a, scene.b);
        } else {
            frame.points = rectangle(scene.a, scene.b);
        }
        plotPoints(framebuffer, frame.points, kShapeColor);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (scene.tool == Tool::Circle) {
        if (scene.filled) {
            frame.points = filledCircle(scene.a, scene.radius);
        } else {
            frame.points = circle(scene.a, scene.radius);
        }
        plotPoints(framebuffer, frame.points, kLineColor);
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (!frame.points.empty()) {
        scene.inspectedStep = std::min(scene.inspectedStep, frame.points.size() - 1);
        if (scene.zoom) {
            drawInspector(framebuffer, frame.points[scene.inspectedStep]);
        }
    }
    drawHandle(framebuffer, scene.a, kSelectedColor);
    drawHandle(framebuffer, secondHandle(scene), kShapeColor);
#endif
#if LAB_CHECKPOINT == 0
    (void)scene;
#endif
    return frame;
}
} // namespace lab
