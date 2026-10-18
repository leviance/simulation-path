#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 1
#include "framebuffer.hpp"
#include <cmath>
#if LAB_CHECKPOINT >= 4
#include <algorithm>
#include <vector>
#endif

namespace lab {

// Point dùng tọa độ ảnh logic, không phải pixel vật lý hoặc tọa độ window.
struct Point {
    double x{};
    double y{};
    friend bool operator==(Point, Point) = default;
};

inline bool insideCanvas(Point point) {
    return std::isfinite(point.x) && std::isfinite(point.y) && point.x >= 0.0 && point.y >= 0.0 && point.x < Framebuffer::width && point.y < Framebuffer::height;
}

#if LAB_CHECKPOINT >= 3
inline double distance(Point start, Point end) {
    return std::hypot(end.x - start.x, end.y - start.y);
}
#endif

#if LAB_CHECKPOINT >= 4
inline Point lerp(Point start, Point end, double t) {
    return {
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
    };
}

// Giới hạn rõ ràng, không âm thầm làm thưa điểm khi đoạn quá dài.
inline std::vector<Point> sampleStroke(Point start, Point end, double spacing) {
    if (!std::isfinite(start.x) || !std::isfinite(start.y) || !std::isfinite(end.x) || !std::isfinite(end.y)) {
        return {};
    }
    const double segmentLength = distance(start, end);
    constexpr double kMaximumSegmentLength = 2048.0;
    if (!std::isfinite(segmentLength) || segmentLength > kMaximumSegmentLength) {
        return {};
    }
    if (segmentLength == 0.0) {
        return {start};
    }

    double safeSpacing = 0.5;
    if (std::isfinite(spacing)) {
        safeSpacing = std::max(spacing, 0.5);
    }
    const int steps = std::max(1, static_cast<int>(std::ceil(segmentLength / safeSpacing)));
    std::vector<Point> points;
    points.reserve(static_cast<std::size_t>(steps) + 1);
    points.push_back(start);
    for (int index = 1; index < steps; ++index) {
        const double t = static_cast<double>(index) / static_cast<double>(steps);
        points.push_back(lerp(start, end, t));
    }
    points.push_back(end);
    return points;
}
#endif

} // namespace lab
#endif
