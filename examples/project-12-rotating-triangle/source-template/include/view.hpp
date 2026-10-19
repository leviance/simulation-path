#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
// Cắt screen trước khi đổi sang int để Bresenham luôn chạy trong giới hạn bảng.
inline bool clipScreen(Vec2& start, Vec2& end, const Viewport& viewport) {
    const Vec2 delta{end.x - start.x, end.y - start.y};
    double first = 0.0;
    double last = 1.0;
    const auto boundary = [&](double direction, double distance) {
        if (direction == 0.0) {
            return distance >= 0.0;
        }
        const double fraction = distance / direction;
        if (direction < 0.0) {
            first = std::max(first, fraction);
        } else {
            last = std::min(last, fraction);
        }
        return first <= last;
    };
    if (!boundary(-delta.x, start.x - viewport.x) || !boundary(delta.x, viewport.x + viewport.width - start.x) || !boundary(-delta.y, start.y - viewport.y) || !boundary(delta.y, viewport.y + viewport.height - start.y)) {
        return false;
    }
    end = {start.x + last * delta.x, start.y + last * delta.y};
    start = {start.x + first * delta.x, start.y + first * delta.y};
    return true;
}

inline void line3D(Framebuffer& image, Vec3 start, Vec3 end, const Scene& scene, std::uint32_t color) {
    start = worldToCamera(start, scene.camera);
    end = worldToCamera(end, scene.camera);
    if (!clipDepth(start, end, scene.lens)) {
        return;
    }
    const Camera3D origin{};
    const auto a = projectPerspective(start, origin, scene.lens, viewportFor());
    const auto b = projectPerspective(end, origin, scene.lens, viewportFor());
    if (!a.screen || !b.screen) {
        return;
    }
    Vec2 from = *a.screen;
    Vec2 to = *b.screen;
    if (clipScreen(from, to, viewportFor())) {
        drawLine(image, static_cast<int>(std::lround(from.x)), static_cast<int>(std::lround(from.y)), static_cast<int>(std::lround(to.x)), static_cast<int>(std::lround(to.y)), color);
    }
}

inline void drawDepthScene(Framebuffer& image, const Scene& scene) {
    for (int i = -4; i <= 4; ++i) {
        const double x = static_cast<double>(i);
        line3D(image, {x, -2.0, 1.0}, {x, -2.0, 14.0}, scene, kGrid);
    }
    for (int i = 1; i <= 14; ++i) {
        const double z = static_cast<double>(i);
        line3D(image, {-4.0, -2.0, z}, {4.0, -2.0, z}, scene, kGrid);
    }
    for (double z : {4.0, 8.0, 12.0}) {
        line3D(image, {-3.0, -2.0, z}, {-3.0, 2.0, z}, scene, kGhost);
        line3D(image, {-3.0, 2.0, z}, {3.0, 2.0, z}, scene, kGhost);
        line3D(image, {3.0, 2.0, z}, {3.0, -2.0, z}, scene, kGhost);
    }
}
#if LAB_CHECKPOINT >= 1
inline void marker(Framebuffer& image, Vec2 center, std::uint32_t color) {
    const Viewport viewport = viewportFor();
    const int cx = static_cast<int>(std::lround(center.x));
    const int cy = static_cast<int>(std::lround(center.y));
    for (int y = -5; y <= 5; ++y) {
        for (int x = -5; x <= 5; ++x) {
            if (x * x + y * y <= 25 && cx + x >= viewport.x && cx + x < viewport.x + viewport.width && cy + y >= viewport.y && cy + y < viewport.y + viewport.height) {
                image.putPixel(cx + x, cy + y, color);
            }
        }
    }
}

inline void drawProjectedTriangle(Framebuffer& image, const Triangle3& world, const TriangleProjection& projection, const Scene& scene) {
    line3D(image, world.a, world.b, scene, 0xFFB454FFu);
    line3D(image, world.b, world.c, scene, kShape);
    line3D(image, world.c, world.a, scene, kAxisY);
    if (scene.debug) {
        for (const auto& vertex : projection.vertices) {
            if (vertex.status == ProjectionStatus::Visible && vertex.screen) {
                marker(image, *vertex.screen, kWhite);
            }
        }
    }
}
#endif
#if LAB_CHECKPOINT >= 5
// Thân và cánh mũi tên đều ở world space rồi mới được chiếu.
inline void arrow3D(Framebuffer& image, Vec3 start, Vec3 end, const Scene& scene) {
    const Vec3 delta = subtract(end, start);
    const double length = magnitude(delta);
    if (length <= 1e-12) {
        return;
    }
    const Vec3 direction = normalize(delta);
    Vec3 side = cross(direction, {0.0, 1.0, 0.0});
    if (magnitude(side) < 0.1) {
        side = cross(direction, {1.0, 0.0, 0.0});
    }
    side = normalize(side);
    const double head = std::min(0.2, length * 0.25);
    const Vec3 back = subtract(end, scale(direction, head));
    line3D(image, start, end, scene, kMarker);
    line3D(image, end, add(back, scale(side, head * 0.5)), scene, kMarker);
    line3D(image, end, subtract(back, scale(side, head * 0.5)), scene, kMarker);
}
#endif
inline void renderScene(Framebuffer& image, const Scene& scene) {
    image.clear(kBackground);
    drawDepthScene(image, scene);
#if LAB_CHECKPOINT >= 1
    const Triangle3 world = worldTriangle(scene);
    const TriangleProjection projection = projectTriangle(world, scene.camera, scene.lens, viewportFor());
#if LAB_CHECKPOINT >= 3
    if (scene.debug) {
        const Triangle3 ghost = translateTriangle(toLocalTriangle(defaultWorldTriangle()), scene.position);
        line3D(image, ghost.a, ghost.b, scene, kGhost);
        line3D(image, ghost.b, ghost.c, scene, kGhost);
        line3D(image, ghost.c, ghost.a, scene, kGhost);
    }
#endif
    drawProjectedTriangle(image, world, projection, scene);
#if LAB_CHECKPOINT >= 2
    const auto pivot = projectPerspective(scene.position, scene.camera, scene.lens, viewportFor());
    if (scene.debug && pivot.status == ProjectionStatus::Visible && pivot.screen) {
        marker(image, *pivot.screen, kAxisX);
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (scene.debug) {
        // Trục tham chiếu world cố định; thay rotation order không làm trục này đổi.
        const Vec3 origin{-3.0, -1.8, 5.0};
        line3D(image, origin, add(origin, {1.2, 0.0, 0.0}), scene, kAxisX);
        line3D(image, origin, add(origin, {0.0, 1.2, 0.0}), scene, kShape);
        line3D(image, origin, add(origin, {0.0, 0.0, 1.2}), scene, kAxisY);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (scene.debug && normalHasDirection(world)) {
        const Vec3 center = triangleCentroid(world);
        const Vec3 endpoint = add(center, scale(triangleUnitNormal(world), 1.2));
        arrow3D(image, center, endpoint, scene);
    }
#endif
#endif
}
} // namespace lab
