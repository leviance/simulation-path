#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#if LAB_CHECKPOINT >= 4
#include <algorithm>
#include <vector>
#endif
#if LAB_CHECKPOINT >= 3
#include <cmath>
#endif
namespace lab {
#if LAB_CHECKPOINT >= 1

// Point mô tả một mouse sample trong không gian pixel của canvas.
struct Point {
    double x{};
    double y{};
    friend bool operator==(Point, Point) = default;
};
#endif
#if LAB_CHECKPOINT >= 3
inline double distance(Point start, Point end) {
    return std::hypot(end.x - start.x, end.y - start.y);
}
#endif
#if LAB_CHECKPOINT >= 4

// Nội suy một đoạn thành các sample đủ gần để brush không để lại khoảng hở.
inline Point lerp(Point start, Point end, double t) {
    return {
        start.x + (end.x - start.x) * t,
        start.y + (end.y - start.y) * t,
    };
}

inline std::vector<Point> sampleStroke(Point start, Point end, double spacing) {
    const double segmentLength = distance(start, end);
    if (segmentLength == 0.0) {
        return {start};
    }

    // Half a physical pixel is dense enough for this canvas and prevents a
    // bad caller from creating millions of samples with spacing near zero.
    constexpr double kMinimumSpacing = 0.5;
    double safeSpacing = kMinimumSpacing;
    if (std::isfinite(spacing)) {
        safeSpacing = std::max(spacing, kMinimumSpacing);
    }
    const int steps = std::max(1, int(std::ceil(segmentLength / safeSpacing)));
    std::vector<Point> points;
    points.reserve(std::size_t(steps) + 1);
    for (int index = 0; index <= steps; ++index) {
        const double t = double(index) / double(steps);
        points.push_back(lerp(start, end, t));
    }
    return points;
}
#endif
} // namespace lab
