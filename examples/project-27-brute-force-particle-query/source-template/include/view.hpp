#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
inline constexpr std::uint32_t kCloud = 0x61738dff;
inline constexpr std::uint32_t kHit = 0xe5c07bff;
inline constexpr std::uint32_t kLens = 0x61afefff;

struct WorldView {
    double left{32};
    double top{110};
    double size{620};
};

inline WorldView makeWorldView(bool debug) {
    WorldView view{};
    if (!debug) {
        view.left = 240;
    }
    return view;
}

inline Vec2 worldToScreen(Vec2 point, const WorldView& view) {
    return {view.left + point.x * view.size, view.top + (1.0 - point.y) * view.size};
}
#if LAB_CHECKPOINT >= 2
inline Vec2 screenToWorld(Vec2 point, const WorldView& view) {
    return {std::clamp((point.x - view.left) / view.size, 0.0, 1.0), std::clamp(1.0 - (point.y - view.top) / view.size, 0.0, 1.0)};
}

inline bool inViewport(Vec2 point, const WorldView& view) {
    return point.x >= view.left && point.x <= view.left + view.size && point.y >= view.top && point.y <= view.top + view.size;
}
#endif
inline void circle(Framebuffer& image, Vec2 center, double radius, std::uint32_t color) {
    // Bán kính bị giới hạn trong UI; nối các đoạn ngắn mà không cấp phát bộ đệm.
    Vec2 previous{center.x + radius, center.y};
    for (int i = 1; i <= 180; ++i) {
        const double angle = i * 6.283185307179586 / 180.0;
        const Vec2 next{center.x + radius * std::cos(angle), center.y + radius * std::sin(angle)};
        drawLine(image, previous.x, previous.y, next.x, next.y, color);
        previous = next;
    }
}

inline void drawScene(Framebuffer& image, const Scene& scene) {
    image.clear();
    const WorldView view = makeWorldView(scene.debug);
    rectangle(image, static_cast<int>(view.left) - 1, 109, static_cast<int>(view.left + view.size) + 1, 731, kGrid, false);
    for (std::size_t index = 0; index < scene.count; ++index) {
        const Vec2 point = worldToScreen(scene.particles[index].position, view);
        image.putPixel(static_cast<int>(std::lround(point.x)), static_cast<int>(std::lround(point.y)), kCloud);
    }
#if LAB_CHECKPOINT >= 3
#if LAB_CHECKPOINT >= 4
    const auto& result = scene.workspace;
#else
    const auto& result = scene.readable;
#endif
    for (const std::size_t index : result.hitIndices) {
        const Vec2 point = worldToScreen(scene.particles[index].position, view);
        image.putPixel(static_cast<int>(std::lround(point.x)), static_cast<int>(std::lround(point.y)), kHit);
    }
    if (scene.debug && result.nearestIndex < scene.count) {
        circle(image, worldToScreen(scene.particles[result.nearestIndex].position, view), 6, kColors[0]);
    }
#endif
#if LAB_CHECKPOINT >= 2
    const Vec2 center = worldToScreen(scene.query.center, view);
    circle(image, center, scene.query.radius * view.size, kLens);
    drawLine(image, center.x - 5, center.y, center.x + 5, center.y, kLens);
    drawLine(image, center.x, center.y - 5, center.x, center.y + 5, kLens);
#endif
}
} // namespace lab
