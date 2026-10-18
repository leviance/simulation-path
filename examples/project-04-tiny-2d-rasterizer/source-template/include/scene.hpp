#pragma once
#include "framebuffer.hpp"
#include "lab.hpp"
#if LAB_CHECKPOINT >= 3
#include <array>
#include <optional>
#endif

namespace lab {
#if LAB_CHECKPOINT >= 3
enum class Tool {
    Line,
#if LAB_CHECKPOINT >= 4
    Rectangle,
#endif
#if LAB_CHECKPOINT >= 5
    Circle,
#endif
#if LAB_CHECKPOINT >= 6
    Gallery,
#endif
};
#endif

// Hình học sống qua nhiều frame; kéo chuột chỉ sửa dữ liệu, không vẽ trực tiếp.
struct Scene {
#if LAB_CHECKPOINT >= 1
    Point a{220, 270};
    Point b{740, 150};
#endif
#if LAB_CHECKPOINT >= 2
    Algorithm algorithm = Algorithm::Bresenham;
#endif
#if LAB_CHECKPOINT >= 3
    Tool tool = Tool::Line;
    int dragged = -1;
    bool zoom = true;
    std::size_t inspectedStep = 0;
    std::size_t octant = 0;
#endif
#if LAB_CHECKPOINT >= 4
    bool filled = false;
#endif
#if LAB_CHECKPOINT >= 5
    int radius = 110;
#endif
};

#if LAB_CHECKPOINT >= 3
inline std::optional<Point> imagePoint(double x, double y) {
    if (!std::isfinite(x) || !std::isfinite(y) || x < 0.0 || y < 0.0 || x >= Framebuffer::width || y >= Framebuffer::height) {
        return std::nullopt;
    }
    return Point{static_cast<int>(std::floor(x)), static_cast<int>(std::floor(y))};
}

inline void cancelDrag(Scene& scene) {
    scene.dragged = -1;
}

inline Point secondHandle(const Scene& scene) {
#if LAB_CHECKPOINT >= 5
    if (scene.tool == Tool::Circle) {
        return {scene.a.x + scene.radius, scene.a.y};
    }
#endif
    return scene.b;
}

inline void moveHandle(Scene& scene, Point point) {
    if (scene.dragged < 0 || !imagePoint(point.x, point.y)) {
        cancelDrag(scene);
        return;
    }
    if (scene.dragged == 0) {
        scene.a = point;
    } else {
#if LAB_CHECKPOINT >= 5
        if (scene.tool == Tool::Circle) {
            const double length = std::hypot(static_cast<double>(point.x - scene.a.x), static_cast<double>(point.y - scene.a.y));
            scene.radius = std::clamp(static_cast<int>(std::lround(length)), 0, 256);
        } else
#endif
        {
            scene.b = point;
        }
    }
    scene.inspectedStep = 0;
}

inline bool beginDrag(Scene& scene, Point point) {
    if (scene.dragged >= 0 || !imagePoint(point.x, point.y)) {
        return false;
    }
#if LAB_CHECKPOINT >= 6
    if (scene.tool == Tool::Gallery) {
        return false;
    }
#endif
    const Point second = secondHandle(scene);
    const double distanceA = std::hypot(static_cast<double>(point.x - scene.a.x), static_cast<double>(point.y - scene.a.y));
    const double distanceB = std::hypot(static_cast<double>(point.x - second.x), static_cast<double>(point.y - second.y));
    scene.dragged = 1;
    if (distanceA <= distanceB) {
        scene.dragged = 0;
    }
    moveHandle(scene, point);
    return true;
}

inline void endDrag(Scene& scene, Point point) {
    moveHandle(scene, point);
    cancelDrag(scene);
}

inline void selectOctant(Scene& scene) {
    constexpr std::array<Point, 8> offsets{{
        {9, 2},
        {2, 9},
        {-2, 9},
        {-9, 2},
        {-9, -2},
        {-2, -9},
        {2, -9},
        {9, -2},
    }};
    cancelDrag(scene);
    scene.tool = Tool::Line;
    scene.a = {480, 270};
    const Point offset = offsets[scene.octant];
    scene.b = {scene.a.x + offset.x * 22, scene.a.y + offset.y * 22};
    scene.octant = (scene.octant + 1) % offsets.size();
    scene.inspectedStep = 0;
}
#endif
} // namespace lab
