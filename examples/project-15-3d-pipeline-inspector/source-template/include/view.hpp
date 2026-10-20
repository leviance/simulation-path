#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
// Cắt đoạn trong camera space trước divide; dùng lại ý tưởng P13/P14.
inline bool clipViewDepth(Vec3& a, Vec3& b, const PerspectiveLens& lens) {
    if (!finite(a) || !finite(b) || !validLens(lens)) {
        return false;
    }
    double first = 0.0;
    double last = 1.0;
    const Vec3 delta = subtract(b, a);
    if (!finite(delta)) {
        return false;
    }
    if (delta.z == 0.0) {
        return a.z >= lens.nearPlane && a.z <= lens.farPlane;
    }
    const double atNear = (lens.nearPlane - a.z) / delta.z;
    const double atFar = (lens.farPlane - a.z) / delta.z;
    first = std::max(first, std::min(atNear, atFar));
    last = std::min(last, std::max(atNear, atFar));
    if (first > last) {
        return false;
    }
    b = add(a, scaleVector(delta, last));
    a = add(a, scaleVector(delta, first));
    return true;
}

inline bool clipScreen(Vec2& a, Vec2& b, Viewport viewport) {
    if (!finite(a) || !finite(b) || !validViewport(viewport)) {
        return false;
    }
    const Vec2 delta{b.x - a.x, b.y - a.y};
    if (!finite(delta)) {
        return false;
    }
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
    if (!boundary(-delta.x, a.x) || !boundary(delta.x, viewport.width - 1.0 - a.x) ||
        !boundary(-delta.y, a.y) || !boundary(delta.y, viewport.height - 1.0 - a.y)) {
        return false;
    }
    b = {a.x + last * delta.x, a.y + last * delta.y};
    a = {a.x + first * delta.x, a.y + first * delta.y};
    return true;
}

// Trước checkpoint 6, đây là ảnh tham chiếu theo công thức đã học ở P11.
// Từ checkpoint 6, mọi cạnh đều dùng Projection Mat4 và perspectiveDivide mới.
inline std::optional<Vec2> projectViewPoint(Vec3 view, const Scene& scene) {
    const Viewport viewport = viewportFor(scene);
    if (!finite(view) || !validLens(scene.lens) || !validViewport(viewport) || view.z <= kDivideEpsilon) {
        return std::nullopt;
    }
#if LAB_CHECKPOINT >= 6
    const Vec4 clip = transform(projectionMatrix(scene.lens, viewport.width / viewport.height), toPoint(view));
    const auto ndc = perspectiveDivide(clip);
    if (!ndc) {
        return std::nullopt;
    }
    return ndcToScreen(*ndc, viewport);
#else
    const double focal = viewport.height / (2.0 * std::tan(scene.lens.verticalFovRadians / 2.0));
    const Vec2 screen{viewport.width / 2.0 + view.x * focal / view.z, viewport.height / 2.0 - view.y * focal / view.z};
    if (!finite(screen)) {
        return std::nullopt;
    }
    return screen;
#endif
}

inline bool drawWorldLine(Framebuffer& image, Vec3 a, Vec3 b, const Scene& scene, std::uint32_t color) {
    a = activeViewPoint(a, scene);
    b = activeViewPoint(b, scene);
    if (!clipViewDepth(a, b, scene.lens)) {
        return false;
    }
    const auto start = projectViewPoint(a, scene);
    const auto end = projectViewPoint(b, scene);
    if (!start || !end) {
        return false;
    }
    Vec2 from = *start;
    Vec2 to = *end;
    if (!clipScreen(from, to, viewportFor(scene))) {
        return false;
    }
    drawLine(image, static_cast<int>(std::lround(from.x)), static_cast<int>(std::lround(from.y)), static_cast<int>(std::lround(to.x)), static_cast<int>(std::lround(to.y)), color);
    return true;
}

inline std::optional<Vec2> visibleVertex(Vec3 local, const Scene& scene) {
    const Vec3 view = activeViewPoint(activeModelPoint(local, scene), scene);
    const Viewport viewport = viewportFor(scene);
    if (view.z < scene.lens.nearPlane || view.z > scene.lens.farPlane) {
        return std::nullopt;
    }
    const auto screen = projectViewPoint(view, scene);
    if (!screen || screen->x < 0.0 || screen->x >= viewport.width || screen->y < 0.0 || screen->y >= viewport.height) {
        return std::nullopt;
    }
    return screen;
}

inline std::optional<std::size_t> pickVertex(Vec2 point, const Scene& scene) {
    const Viewport viewport = viewportFor(scene);
    if (!finite(point) || point.x < 0.0 || point.y < 0.0 || point.x >= viewport.width || point.y >= viewport.height) {
        return std::nullopt;
    }
    std::optional<std::size_t> selected;
    double best = 14.0;
    for (std::size_t index = 0; index < scene.vertices.size(); ++index) {
        const auto screen = visibleVertex(scene.vertices[index], scene);
        if (!screen) {
            continue;
        }
        const double distance = std::hypot(screen->x - point.x, screen->y - point.y);
        if (distance < best) {
            best = distance;
            selected = index;
        }
    }
    return selected;
}

inline void drawContext(Framebuffer& image, const Scene& scene) {
    for (int x = -8; x <= 8; x += 2) {
        drawWorldLine(image, {static_cast<double>(x), 0.0, 2.0}, {static_cast<double>(x), 0.0, 26.0}, scene, kGrid);
    }
    for (int z = 2; z <= 26; z += 2) {
        drawWorldLine(image, {-8.0, 0.0, static_cast<double>(z)}, {8.0, 0.0, static_cast<double>(z)}, scene, kGrid);
    }
    drawWorldLine(image, {0.0, 0.0, 6.0}, {3.0, 0.0, 6.0}, scene, kAxisX);
    drawWorldLine(image, {0.0, 0.0, 6.0}, {0.0, 3.0, 6.0}, scene, kAxisY);
    drawWorldLine(image, {0.0, 0.0, 6.0}, {0.0, 0.0, 9.0}, scene, kShape);
}

inline void drawScene(Framebuffer& image, const Scene& scene) {
    image.clear(kBackground);
    drawContext(image, scene);
#if LAB_CHECKPOINT >= 1
    for (const auto& edge : kEdges) {
        const Vec3 a = activeModelPoint(scene.vertices[edge[0]], scene);
        const Vec3 b = activeModelPoint(scene.vertices[edge[1]], scene);
        drawWorldLine(image, a, b, scene, kGhost);
    }
    for (std::size_t index = 0; index < scene.vertices.size(); ++index) {
        const auto point = visibleVertex(scene.vertices[index], scene);
        if (!point) {
            continue;
        }
        std::uint32_t color = kShape;
        int radius = 3;
        if (index == scene.selectedVertex) {
            color = kMarker;
            radius = 7;
        }
        disc(image, static_cast<int>(std::lround(point->x)), static_cast<int>(std::lround(point->y)), radius, color);
    }
#endif
    // Cảnh không nằm trong nhánh debug. Chỉ có đường phân cách bảng số là overlay.
    if (scene.debug) {
        drawLine(image, 0, 560, 1099, 560, kGhost);
    }
}
} // namespace lab
