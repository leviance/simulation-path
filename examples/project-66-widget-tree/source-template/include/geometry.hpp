#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include <algorithm>
#include <cmath>
#include <optional>

namespace lab {
// Cùng hệ tọa độ logic 960x540 cho cây UI, phép vẽ và sự kiện.
struct Point {
    double x = 0;
    double y = 0;
};

struct Rect {
    double x = 0;
    double y = 0;
    double width = 0;
    double height = 0;
};

inline constexpr Rect viewport{0, 0, 960, 540};

inline bool contains(Rect r, Point p) {
    return std::isfinite(p.x) && std::isfinite(p.y) && p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height;
}

inline bool validRect(Rect r) {
    return std::isfinite(r.x) && std::isfinite(r.y) && std::isfinite(r.width) && std::isfinite(r.height) && std::abs(r.x) <= 2000 && std::abs(r.y) <= 2000 && r.width > 0 && r.width <= 960 && r.height > 0 && r.height <= 540;
}

#if LAB_CHECKPOINT >= 3
inline Rect intersect(Rect a, Rect b) {
    const double x = std::max(a.x, b.x);
    const double y = std::max(a.y, b.y);
    return {x, y, std::max(0.0, std::min(a.x + a.width, b.x + b.width) - x), std::max(0.0, std::min(a.y + a.height, b.y + b.height) - y)};
}
#endif
} // namespace lab
