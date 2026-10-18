#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
// Bộ khung chạy được ngay: grid/trục có sẵn trước khi thêm vector.
inline void drawBoard(Framebuffer& image) {
    image.clear(kBackground);
    for (int x = kOriginX % kPixelsPerUnit; x < Framebuffer::width; x += kPixelsPerUnit) {
        drawLine(image, x, 0, x, Framebuffer::height - 1, kGrid);
    }
    for (int y = kOriginY % kPixelsPerUnit; y < Framebuffer::height; y += kPixelsPerUnit) {
        drawLine(image, 0, y, Framebuffer::width - 1, y, kGrid);
    }
    drawLine(image, 0, kOriginY, Framebuffer::width - 1, kOriginY, kGuide);
    drawLine(image, kOriginX, 0, kOriginX, Framebuffer::height - 1, kGuide);
}

#if LAB_CHECKPOINT >= 1
inline void drawScreenLine(Framebuffer& image, Vec2 start, Vec2 end, std::uint32_t color) {
    // Không cho một đầu vào lỗi tạo vòng Bresenham dài vô hạn.
    if (!finite(start) || !finite(end) || std::abs(start.x) > 4096.0 || std::abs(start.y) > 4096.0 || std::abs(end.x) > 4096.0 || std::abs(end.y) > 4096.0) {
        return;
    }
    drawLine(image, static_cast<int>(std::lround(start.x)), static_cast<int>(std::lround(start.y)), static_cast<int>(std::lround(end.x)), static_cast<int>(std::lround(end.y)), color);
}

inline void drawHandle(Framebuffer& image, Vec2 screen, std::uint32_t color) {
    if (!finite(screen) || std::abs(screen.x) > 4096.0 || std::abs(screen.y) > 4096.0) {
        return;
    }
    disc(image, static_cast<int>(std::lround(screen.x)), static_cast<int>(std::lround(screen.y)), 7, color);
}
#endif

#if LAB_CHECKPOINT >= 2
inline void drawArrow(Framebuffer& image, Vec2 start, Vec2 end, std::uint32_t color) {
    if (!finite(start) || !finite(end)) {
        return;
    }
    drawScreenLine(image, start, end, color);
    const ArrowHead head = arrowHead(start, end);
    if (!head.visible) {
        drawHandle(image, end, color);
        return;
    }
    drawScreenLine(image, end, head.leftWing, color);
    drawScreenLine(image, end, head.rightWing, color);
}
#endif

inline void renderScene(Framebuffer& image, const Scene& scene) {
    drawBoard(image);
#if LAB_CHECKPOINT >= 1
    const Vec2 origin = worldToScreen({});
    const Vec2 endpointA = worldToScreen(scene.vectorA);
    const Vec2 endpointB = worldToScreen(scene.vectorB);
#if LAB_CHECKPOINT >= 4
    const Vec2 vectorSum = scene.vectorA + scene.vectorB;
    const Vec2 sumScreen = worldToScreen(vectorSum);
    drawScreenLine(image, endpointA, sumScreen, kGuide);
    drawScreenLine(image, endpointB, sumScreen, kGuide);
    drawArrow(image, origin, sumScreen, kSum);
#endif
#if LAB_CHECKPOINT >= 5
    const Vec2 vectorDifference = scene.vectorA - scene.vectorB;
    drawArrow(image, origin, worldToScreen(vectorDifference), kDifference);
    drawArrow(image, endpointB, endpointA, kDifference);
    drawArrow(image, origin, worldToScreen(scene.vectorB * -1.0), kGuide);
#endif
#if LAB_CHECKPOINT >= 6
    if (scene.viewMode == Scene::ViewMode::Scalar || scene.viewMode == Scene::ViewMode::All) {
        const Vec2 scaledA = scene.vectorA * scene.scalar;
        drawArrow(image, origin, worldToScreen(scaledA), kScalar);
        drawScreenLine(image, endpointA, endpointB, kGuide);
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (scene.viewMode == Scene::ViewMode::Unit || scene.viewMode == Scene::ViewMode::All) {
        drawCircle(image, kOriginX, kOriginY, kPixelsPerUnit, kWhite);
        const Vec2 unitA = normalize(scene.vectorA);
        drawArrow(image, origin, worldToScreen(unitA), kWhite);
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (scene.viewMode == Scene::ViewMode::Interpolation || scene.viewMode == Scene::ViewMode::All) {
        drawScreenLine(image, endpointA, endpointB, kGuide);
    }
#endif
#if LAB_CHECKPOINT >= 2
    drawArrow(image, origin, endpointA, kA);
    drawArrow(image, origin, endpointB, kB);
#else
    drawScreenLine(image, origin, endpointA, kA);
    drawScreenLine(image, origin, endpointB, kB);
#endif
#if LAB_CHECKPOINT >= 3
    Vec2 selected = endpointA;
    if (scene.selected == 1) {
        selected = endpointB;
    }
    disc(image, static_cast<int>(std::lround(selected.x)), static_cast<int>(std::lround(selected.y)), 10, kWhite);
#endif
    drawHandle(image, endpointA, kA);
    drawHandle(image, endpointB, kB);
#if LAB_CHECKPOINT >= 8
    // Vẽ cuối để P(0)/P(1) không bị chấm endpoint che mất.
    if (scene.viewMode == Scene::ViewMode::Interpolation || scene.viewMode == Scene::ViewMode::All) {
        const Vec2 point = lerp(scene.vectorA, scene.vectorB, scene.interpolation);
        const Vec2 screen = worldToScreen(point);
        disc(image, static_cast<int>(std::lround(screen.x)), static_cast<int>(std::lround(screen.y)), 6, kLerp);
    }
#endif
#else
    (void)scene;
#endif
}
} // namespace lab
