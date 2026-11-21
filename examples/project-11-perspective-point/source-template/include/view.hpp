#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
inline bool clipScreen(Vec2& start, Vec2& end, const Viewport& viewport) {
    // Không để dữ liệu lỗi đi tới lround hoặc vòng lặp raster.
    if (!std::isfinite(start.x) || !std::isfinite(start.y) || !std::isfinite(end.x) || !std::isfinite(end.y) || !std::isfinite(viewport.x) || !std::isfinite(viewport.y) || !std::isfinite(viewport.width) || !std::isfinite(viewport.height) || viewport.width <= 0.0 || viewport.height <= 0.0 || !std::isfinite(viewport.x + viewport.width) || !std::isfinite(viewport.y + viewport.height)) {
        return false;
    }
    const Vec2 delta{end.x - start.x, end.y - start.y};
    if (!std::isfinite(delta.x) || !std::isfinite(delta.y)) {
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
    if (!boundary(-delta.x, start.x - viewport.x) || !boundary(delta.x, viewport.x + viewport.width - start.x) || !boundary(-delta.y, start.y - viewport.y) || !boundary(delta.y, viewport.y + viewport.height - start.y)) {
        return false;
    }
    end = {start.x + last * delta.x, start.y + last * delta.y};
    start = {start.x + first * delta.x, start.y + first * delta.y};
    return true;
}

#if LAB_CHECKPOINT >= 5
constexpr double kRunwayFloor = -1.5;

inline void drawScreenSegment(Framebuffer& image, Vec2 from, Vec2 to, const Viewport& viewport, std::uint32_t color) {
    if (!clipScreen(from, to, viewport)) {
        return;
    }
    // Biên phải và biên dưới là tọa độ hình học, không phải chỉ số pixel cuối.
    const double left = std::max(0.0, std::ceil(viewport.x));
    const double top = std::max(0.0, std::ceil(viewport.y));
    const double right = std::min(static_cast<double>(Framebuffer::width - 1), std::ceil(viewport.x + viewport.width) - 1.0);
    const double bottom = std::min(static_cast<double>(Framebuffer::height - 1), std::ceil(viewport.y + viewport.height) - 1.0);
    if (right < left || bottom < top) {
        return;
    }
    const int x0 = static_cast<int>(std::lround(std::clamp(from.x, left, right)));
    const int y0 = static_cast<int>(std::lround(std::clamp(from.y, top, bottom)));
    const int x1 = static_cast<int>(std::lround(std::clamp(to.x, left, right)));
    const int y1 = static_cast<int>(std::lround(std::clamp(to.y, top, bottom)));
    drawLine(image, x0, y0, x1, y1, color);
}

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
    drawScreenSegment(image, *a.screen, *b.screen, viewport, color);
}

inline void drawDepthScene(Framebuffer& image, const Scene& scene) {
    constexpr std::uint32_t rail = 0x426474FFu;
    constexpr std::uint32_t reflector = 0x75C9D1FFu;

    // Mỗi ô sàn rộng một đơn vị. Cả vạch giữa lẫn hai mép đường đều nằm trên sàn.
    for (int x = -4; x <= 4; ++x) {
        const double position = static_cast<double>(x);
        line3D(image, {position, kRunwayFloor, 1.0}, {position, kRunwayFloor, 16.0}, scene, kGrid);
    }
    for (int z = 1; z <= 16; ++z) {
        const double depth = static_cast<double>(z);
        line3D(image, {-4.0, kRunwayFloor, depth}, {4.0, kRunwayFloor, depth}, scene, kGrid);
        if (z < 16) {
            line3D(image, {0.0, kRunwayFloor, depth}, {0.0, kRunwayFloor, depth + 0.45}, scene, kGhost);
        }
    }
    for (double side : {-1.0, 1.0}) {
        const double edge = side * 1.90;
        line3D(image, {edge, kRunwayFloor, 1.0}, {edge, kRunwayFloor, 16.0}, scene, rail);
    }

    // Dựng cùng một cổng bốn lần: chỉ thay Z, không tự thu nhỏ cổng ở xa.
    for (double z : {2.0, 4.0, 8.0, 12.0}) {
        line3D(image, {-1.55, 1.10, z}, {1.55, 1.10, z}, scene, kGhost);
        for (double side : {-1.0, 1.0}) {
            const double post = side * 1.90;
            const double shoulder = side * 1.55;
            line3D(image, {post, kRunwayFloor, z}, {post, 0.75, z}, scene, kGhost);
            line3D(image, {post, 0.75, z}, {shoulder, 1.10, z}, scene, reflector);
            line3D(image, {post, kRunwayFloor, z}, {side * 1.63, kRunwayFloor, z}, scene, reflector);
        }
    }

    // Đặt bộ trục ở chân cổng thứ hai: nhìn được cả trục Z vì nó lệch trục nhìn.
    if (scene.debug) {
        const Vec3 foot{-1.90, kRunwayFloor, 4.0};
        line3D(image, foot, {-1.35, kRunwayFloor, 4.0}, scene, kAxisX);
        line3D(image, foot, {-1.90, kRunwayFloor + 0.55, 4.0}, scene, kAxisY);
        line3D(image, foot, {-1.90, kRunwayFloor, 4.55}, scene, kAxisZ);
    }
}

inline void drawPlumbLine(Framebuffer& image, const Scene& scene) {
    // Chân đường dóng giữ nguyên X và Z của đèn; chỉ thay Y bằng cao độ mặt sàn.
    const Vec3 foot{scene.point.x, kRunwayFloor, scene.point.z};
    constexpr std::uint32_t guide = 0x967B55FFu;
    line3D(image, scene.point, foot, scene, guide);
    line3D(image, {foot.x - 0.10, foot.y, foot.z}, {foot.x + 0.10, foot.y, foot.z}, scene, guide);
    line3D(image, {foot.x, foot.y, foot.z - 0.10}, {foot.x, foot.y, foot.z + 0.10}, scene, guide);
}
#endif
#if LAB_CHECKPOINT >= 8
inline void drawDepthRuler(Framebuffer& image, const Scene& scene, const Viewport& viewport) {
    const auto measurement = measureDoubleDepth(scene.point, scene.camera, scene.lens, viewport);
    if (!measurement) {
        return;
    }
    const Vec2 center{viewport.x + viewport.width * 0.5, viewport.y + viewport.height * 0.5};
    drawScreenSegment(image, center, measurement->first, viewport, 0x7099ADFFu);

    // Khoanh vị trí B trên ảnh, chừa trống phần giữa để không nhầm nó với đèn.
    const int cx = static_cast<int>(std::lround(measurement->second.x));
    const int cy = static_cast<int>(std::lround(measurement->second.y));
    for (int dy = -7; dy <= 7; ++dy) {
        for (int dx = -7; dx <= 7; ++dx) {
            const int squared = dx * dx + dy * dy;
            const int px = cx + dx;
            const int py = cy + dy;
            if (squared >= 36 && squared <= 49 && px >= viewport.x && px < viewport.x + viewport.width && py >= viewport.y && py < viewport.y + viewport.height) {
                image.putPixel(px, py, 0x99E2E6FFu);
            }
        }
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
#if LAB_CHECKPOINT >= 5
    drawDepthScene(image, scene);
#endif
    const auto projected = projectPerspective(scene.point, scene.camera, scene.lens, viewport);
    if (projected.status == ProjectionStatus::Visible && projected.screen) {
#if LAB_CHECKPOINT >= 5
        if (scene.debug) {
            drawPlumbLine(image, scene);
        }
#endif
        // Bán kính world 0.12, vị trí cũng được chiếu perspective; không giả depth bằng size.
        double focalPixels = viewport.height * 0.5;
#if LAB_CHECKPOINT >= 4
        focalPixels *= verticalFocalScale(scene.lens);
#endif
        const int radius = static_cast<int>(std::clamp(std::lround(0.12 * focalPixels / projected.cameraPoint.z), 3L, 30L));
        drawPointMarker(image, *projected.screen, radius, viewport, scene.debug);
    }
#if LAB_CHECKPOINT >= 8
    if (scene.debug && scene.measureDepth) {
        drawDepthRuler(image, scene, viewport);
    }
#endif
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
