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

inline std::optional<std::array<Vec2, 2>> projectRoomSegment(Vec3 worldA, Vec3 worldB, const Scene& scene) {
    Vec3 a = viewPoint(worldA, scene);
    Vec3 b = viewPoint(worldB, scene);
    if (!clipDepth(a, b, scene.lens)) {
        return std::nullopt;
    }
    const auto pa = projectPerspective(a, Camera3D{}, scene.lens, viewportFor());
    const auto pb = projectPerspective(b, Camera3D{}, scene.lens, viewportFor());
    if (!pa.screen || !pb.screen) {
        return std::nullopt;
    }
    Vec2 from = *pa.screen;
    Vec2 to = *pb.screen;
    if (!clipScreen(from, to, viewportFor())) {
        return std::nullopt;
    }
    return std::array<Vec2, 2>{from, to};
}

struct RenderStats {
    std::size_t visibleSegments = 0;
};

#if LAB_CHECKPOINT >= 1
inline RenderStats drawRoom(Framebuffer& image, const RoomGeometry& room, const Scene& scene) {
    RenderStats stats;
    for (const Segment3& segment : room) {
        const auto screen = projectRoomSegment(segment.from, segment.to, scene);
        if (!screen) {
            continue;
        }
        const Vec2 a = (*screen)[0];
        const Vec2 b = (*screen)[1];
        drawLine(image, static_cast<int>(std::lround(a.x)), static_cast<int>(std::lround(a.y)), static_cast<int>(std::lround(b.x)), static_cast<int>(std::lround(b.y)), segment.color);
        ++stats.visibleSegments;
    }
    return stats;
}
#endif
inline RenderStats renderScene(Framebuffer& image, const Scene& scene, const RoomGeometry& room) {
    image.clear(kBackground);
    RenderStats stats;
#if LAB_CHECKPOINT >= 1
    stats = drawRoom(image, room, scene);
#else
    static_cast<void>(room);
#endif
    // Crosshair là overlay. Cảnh phòng không phụ thuộc cờ debug.
    if (scene.debug) {
        drawLine(image, 542, 400, 558, 400, kWhite);
        drawLine(image, 550, 392, 550, 408, kWhite);
    }
    return stats;
}
} // namespace lab
