#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
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

#if LAB_CHECKPOINT >= 3
// Hai đầu mút ở world space; cắt đoạn trong camera space.
inline void line3D(Framebuffer& image, Vec3 start, Vec3 end, const Scene& scene, std::uint32_t color) {
    start = worldToCamera(start, scene.camera);
    end = worldToCamera(end, scene.camera);
    if (!clipDepth(start, end, scene.lens)) {
        return;
    }
    const Camera3D origin{};
    const Viewport viewport = viewportFor(scene);
    const auto a = projectPerspective(start, origin, scene.lens, viewport);
    const auto b = projectPerspective(end, origin, scene.lens, viewport);
    if (!a.screen || !b.screen) {
        return;
    }
    Vec2 from = *a.screen;
    Vec2 to = *b.screen;
    if (!clipScreen(from, to, viewport)) {
        return;
    }
    drawLine(image, static_cast<int>(std::lround(from.x)), static_cast<int>(std::lround(from.y)), static_cast<int>(std::lround(to.x)), static_cast<int>(std::lround(to.y)), color);
}

inline void drawDepthScene(Framebuffer& image, const Scene& scene) {
    // Các đường này là hình học 3D thật, không phải lưới 2D dán sau marker.
    for (int x = -4; x <= 4; ++x) {
        const double position = static_cast<double>(x);
        line3D(image, {position, -1.5, 1.0}, {position, -1.5, 16.0}, scene, kGrid);
    }
    for (int z = 1; z <= 16; ++z) {
        const double depth = static_cast<double>(z);
        line3D(image, {-4.0, -1.5, depth}, {4.0, -1.5, depth}, scene, kGrid);
    }
    // Bốn khung cùng kích thước world, xa dần về +Z.
    for (double z : {2.0, 4.0, 8.0, 12.0}) {
        line3D(image, {-3.0, -1.5, z}, {-3.0, 2.0, z}, scene, kGhost);
        line3D(image, {-3.0, 2.0, z}, {3.0, 2.0, z}, scene, kGhost);
        line3D(image, {3.0, 2.0, z}, {3.0, -1.5, z}, scene, kGhost);
    }
    if (scene.debug) {
        line3D(image, {-2.0, 0.0, 4.0}, {2.0, 0.0, 4.0}, scene, kAxisX);
        line3D(image, {0.0, -1.5, 4.0}, {0.0, 2.0, 4.0}, scene, kShape);
        line3D(image, {0.0, 0.0, 1.0}, {0.0, 0.0, 16.0}, scene, kAxisY);
    }
}
#endif
#if LAB_CHECKPOINT >= 1
// Clip từng sample vào viewport; điểm trên cạnh NDC không ghi sang panel.
inline void drawPointMarker(Framebuffer& image, Vec2 center, int radius, const Viewport& viewport, bool debug) {
    const int cx = static_cast<int>(std::lround(center.x));
    const int cy = static_cast<int>(std::lround(center.y));
    for (int y = -radius; y <= radius; ++y) {
        for (int x = -radius; x <= radius; ++x) {
            const int px = cx + x;
            const int py = cy + y;
            if (px < viewport.x || px >= viewport.x + viewport.width || py < viewport.y || py >= viewport.y + viewport.height) {
                continue;
            }
            const int distanceSquared = x * x + y * y;
            if (distanceSquared <= radius * radius) {
                std::uint32_t color = kShape;
                if (distanceSquared < radius * radius / 4) {
                    color = kWhite;
                }
                image.putPixel(px, py, color);
            }
            if (debug && (x == 0 || y == 0)) {
                image.putPixel(px, py, kMarker);
            }
        }
    }
}
#endif
inline void renderScene(Framebuffer& image, const Scene& scene) {
    image.clear(kBackground);
    const Viewport viewport = viewportFor(scene);
    [[maybe_unused]] const Vec2 center{viewport.x + viewport.width * 0.5, viewport.y + viewport.height * 0.5};
#if LAB_CHECKPOINT >= 3
    drawDepthScene(image, scene);
    const auto projected = projectPerspective(scene.point, scene.camera, scene.lens, viewport);
    if (projected.status == ProjectionStatus::Visible && projected.screen) {
        // Bán kính world 0.12, vị trí cũng được chiếu perspective; không giả depth bằng size.
        double focalPixels = viewport.height * 0.5;
#if LAB_CHECKPOINT >= 4
        focalPixels *= verticalFocalScale(scene.lens);
#endif
        const int radius = static_cast<int>(std::clamp(std::lround(0.12 * focalPixels / projected.cameraPoint.z), 3L, 30L));
        drawPointMarker(image, *projected.screen, radius, viewport, scene.debug);
    }
#elif LAB_CHECKPOINT >= 1
    // Bản xem trước song song chỉ để kiểm framebuffer/input ở hai bài đầu.
    for (int offset = -280; offset <= 280; offset += 70) {
        drawLine(image, 550 + offset, 120, 550 + offset, 680, kGrid);
        drawLine(image, 30, 400 + offset, 1070, 400 + offset, kGrid);
    }
    Vec3 point = scene.point;
#if LAB_CHECKPOINT >= 2
    point = worldToCamera(scene.point, scene.camera);
#endif
    const Vec2 preview = previewPoint(point);
    drawPointMarker(image, {center.x + preview.x, center.y - preview.y}, 10, viewport, true);
#else
    (void)center;
#endif
}
} // namespace lab
