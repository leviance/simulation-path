#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#include <algorithm>
#include <cmath>
#include <optional>

namespace lab {

// Tất cả phép vẽ và hit-test dùng cùng mặt phẳng logic 960 x 540.
constexpr double canvasWidth = 960.0;
constexpr double canvasHeight = 540.0;

struct Point {
    double x = 0.0;
    double y = 0.0;
};

struct Rect {
    double x = 0.0;
    double y = 0.0;
    double width = 0.0;
    double height = 0.0;
};

#if LAB_CHECKPOINT >= 2
inline bool contains(Rect rect, Point point) {
    // Cạnh phải/dưới không thuộc hình: hai control kề nhau không nhận cùng một điểm.
    return std::isfinite(point.x) && std::isfinite(point.y) && point.x >= rect.x && point.x < rect.x + rect.width && point.y >= rect.y && point.y < rect.y + rect.height;
}
#endif

#if LAB_CHECKPOINT >= 6
inline std::optional<Point> windowToLogical(Point point, double width, double height) {
    if (!std::isfinite(width) || !std::isfinite(height) || width <= 0.0 || height <= 0.0) {
        return std::nullopt;
    }

    const double scale = std::min(width / canvasWidth, height / canvasHeight);
    const double offsetX = (width - canvasWidth * scale) / 2.0;
    const double offsetY = (height - canvasHeight * scale) / 2.0;
    const Point logical{(point.x - offsetX) / scale, (point.y - offsetY) / scale};
    if (!std::isfinite(logical.x) || !std::isfinite(logical.y)) {
        return std::nullopt;
    }
    return logical;
}
#endif

} // namespace lab
