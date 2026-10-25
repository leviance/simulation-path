#pragma once
// Tọa độ world và viewport dùng cùng một quy ước; query điểm được phép có diện tích 0.
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 11
#endif
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <stdexcept>

namespace maplab {
struct Point {
    double x{};
    double y{};
};

struct Box {
    double x{};
    double y{};
    double width{};
    double height{};
};

inline constexpr Box worldRoot{-16384, -16384, 32768, 32768};

inline double right(const Box& box) {
    return box.x + box.width;
}

inline double bottom(const Box& box) {
    return box.y + box.height;
}

inline bool validBox(const Box& box, bool allowEmpty = false) {
    if (!std::isfinite(box.x) || !std::isfinite(box.y) || !std::isfinite(box.width) || !std::isfinite(box.height) || !std::isfinite(right(box)) || !std::isfinite(bottom(box))) {
        return false;
    }
    if (allowEmpty) {
        return box.width >= 0 && box.height >= 0;
    }
    return box.width > 0 && box.height > 0;
}

// [snippet:intersects]
inline bool intersects(const Box& a, const Box& b) {
    return a.x <= right(b) && right(a) >= b.x && a.y <= bottom(b) && bottom(a) >= b.y;
}

inline bool contains(const Box& outer, const Box& inner) {
    return inner.x >= outer.x && inner.y >= outer.y && right(inner) <= right(outer) && bottom(inner) <= bottom(outer);
}

// [/snippet:intersects]

inline Box normalize(Point a, Point b) {
    return {std::min(a.x, b.x), std::min(a.y, b.y), std::abs(b.x - a.x), std::abs(b.y - a.y)};
}

inline Box translate(Box box, Point offset) {
    box.x += offset.x;
    box.y += offset.y;
    return box;
}

struct Camera {
    double x = 0;
    double y = -4000;
    double zoom = 0.5;
};

inline Point worldToScreen(Point point, const Camera& camera, Point size) {
    return {(point.x - camera.x) * camera.zoom + size.x / 2, (point.y - camera.y) * camera.zoom + size.y / 2};
}

inline Point screenToWorld(Point point, const Camera& camera, Point size) {
    return {camera.x + (point.x - size.x / 2) / camera.zoom, camera.y + (point.y - size.y / 2) / camera.zoom};
}

inline Box viewport(const Camera& camera, Point size) {
    const auto origin = screenToWorld({0, 0}, camera, size);
    return {origin.x, origin.y, size.x / camera.zoom, size.y / camera.zoom};
}

#if LAB_CHECKPOINT >= 2
// [snippet:zoomAt]
inline void zoomAt(Camera& camera, Point anchor, Point size, double zoom) {
    if (!std::isfinite(zoom)) {
        throw std::invalid_argument("Invalid zoom");
    }
    const auto before = screenToWorld(anchor, camera, size);
    camera.zoom = std::clamp(zoom, 0.05, 4.0);
    const auto after = screenToWorld(anchor, camera, size);
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
}

// [/snippet:zoomAt]
#endif
} // namespace maplab
