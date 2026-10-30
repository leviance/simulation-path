#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
// Clip 2D trước khi đổi sang int, giữ công việc rasterizer trong viewport hữu hạn.
inline bool clipScreen(Vec2& start, Vec2& end) {
    if (!std::isfinite(start.x) || !std::isfinite(start.y) || !std::isfinite(end.x) || !std::isfinite(end.y)) {
        return false;
    }
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
    if (!boundary(-delta.x, start.x - 20.0) || !boundary(delta.x, 1080.0 - start.x) || !boundary(-delta.y, start.y - 140.0) || !boundary(delta.y, 680.0 - start.y)) {
        return false;
    }
    end = {start.x + last * delta.x, start.y + last * delta.y};
    start = {start.x + first * delta.x, start.y + first * delta.y};
    return true;
}

inline void line3D(Framebuffer& image, Vec3 start, Vec3 end, const Camera& camera, std::uint32_t color) {
    start = worldToCamera(start, camera);
    end = worldToCamera(end, camera);
    if (!clipDepth(start, end)) {
        return;
    }
    const ProjectedPoint a = projectPerspective(start);
    const ProjectedPoint b = projectPerspective(end);
    Vec2 from = a.screen;
    Vec2 to = b.screen;
    if (!a.visible || !b.visible || !clipScreen(from, to)) {
        return;
    }
    drawLine(image, static_cast<int>(std::lround(from.x)), static_cast<int>(std::lround(from.y)), static_cast<int>(std::lround(to.x)), static_cast<int>(std::lround(to.y)), color);
}

// Cả thân lẫn hai cánh đầu mũi tên là các đoạn world 3D, chiếu cùng một camera.
inline void arrow3D(Framebuffer& image, Vec3 start, Vec3 end, const Camera& camera, std::uint32_t color) {
    const Vec3 difference = subtract(end, start);
    const double length = magnitude(difference);
    if (length <= 1e-12) {
        return;
    }
    const Vec3 direction = normalize(difference);
    Vec3 reference{std::cos(camera.yaw), 0.0, -std::sin(camera.yaw)};
    if (std::abs(dot(direction, reference)) > 0.9) {
        reference = {0.0, 1.0, 0.0};
    }
    const Vec3 side = normalize(subtract(reference, scale(direction, dot(direction, reference))));
    const double head = std::min(0.22, length * 0.25);
    const Vec3 back = subtract(end, scale(direction, head));
    line3D(image, start, end, camera, color);
    line3D(image, end, add(back, scale(side, head * 0.5)), camera, color);
    line3D(image, end, subtract(back, scale(side, head * 0.5)), camera, color);
}

inline void marker3D(Framebuffer& image, Vec3 point, const Camera& camera, std::uint32_t color) {
    const ProjectedPoint projected = projectPerspective(worldToCamera(point, camera));
    if (projected.visible && projected.screen.x >= 25.0 && projected.screen.x <= 1075.0 && projected.screen.y >= 145.0 && projected.screen.y <= 675.0) {
        disc(image, static_cast<int>(std::lround(projected.screen.x)), static_cast<int>(std::lround(projected.screen.y)), 5, color);
    }
}
#if LAB_CHECKPOINT >= 1
inline void drawAxes(Framebuffer& image, const Camera& camera) {
    arrow3D(image, {}, {3.0, 0.0, 0.0}, camera, kAxisX);
    arrow3D(image, {}, {0.0, 3.0, 0.0}, camera, kShape);
    arrow3D(image, {}, {0.0, 0.0, 3.0}, camera, kAxisY);
}
#endif

inline void renderScene(Framebuffer& image, const Scene& scene) {
    image.clear(kBackground);
    for (int index = -3; index <= 3; ++index) {
        const double value = static_cast<double>(index);
        line3D(image, {value, -2.0, -3.0}, {value, -2.0, 3.0}, scene.camera, kGrid);
        line3D(image, {-3.0, -2.0, value}, {3.0, -2.0, value}, scene.camera, kGrid);
    }
#if LAB_CHECKPOINT >= 1
    drawAxes(image, scene.camera);
#if LAB_CHECKPOINT == 1
    // This reference point belongs to the first lesson, not the editable triangle.
    marker3D(image, {1.0, 1.0, 1.0}, scene.camera, kWhite);
#endif
#endif
#if LAB_CHECKPOINT >= 2
    const Triangle& triangle = scene.triangle;
    const Edges edges = triangleEdges(triangle);
    line3D(image, triangle.p0, triangle.p1, scene.camera, kWhite);
    line3D(image, triangle.p1, triangle.p2, scene.camera, kWhite);
    line3D(image, triangle.p2, triangle.p0, scene.camera, kWhite);
    arrow3D(image, triangle.p0, add(triangle.p0, edges.a), scene.camera, 0xFFB454FFu);
    arrow3D(image, triangle.p0, add(triangle.p0, edges.b), scene.camera, 0x53DFEFFFu);
    marker3D(image, triangle.p0, scene.camera, kWhite);
    marker3D(image, triangle.p1, scene.camera, kWhite);
    marker3D(image, triangle.p2, scene.camera, kWhite);
    const Vec3 vertices[]{triangle.p0, triangle.p1, triangle.p2};
    marker3D(image, vertices[scene.selected], scene.camera, kMarker);
#endif
#if LAB_CHECKPOINT >= 3
    if (normalHasDirection(triangle)) {
        const Vec3 raw = triangleRawNormal(triangle);
        const Vec3 displayed = scale(normalize(raw), std::min(2.2, 0.2 * magnitude(raw)));
        arrow3D(image, triangle.p0, add(triangle.p0, displayed), scene.camera, kMarker);
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (normalHasDirection(triangle)) {
        const Vec3 centroid = triangleCentroid(triangle);
        arrow3D(image, centroid, add(centroid, scale(triangleUnitNormal(triangle), 1.4)), scene.camera, 0xE6A0FFFFu);
    }
#endif
}
} // namespace lab
