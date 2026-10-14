#pragma once
#include "model.hpp"
#include <optional>

namespace slices {
// Rectangles are logical/CSS pixels. Physical spacing controls the image aspect.
struct Rect {
    double x = 0;
    double y = 0;
    double width = 0;
    double height = 0;
};

inline Rect fitSlice(const Grid& grid, int view, Rect panel) {
    const Axes axes = axesFor(view);
    const double width = grid.count[axes.horizontal] * grid.spacing[axes.horizontal];
    const double height = grid.count[axes.vertical] * grid.spacing[axes.vertical];
    const double scale = std::min(panel.width / width, panel.height / height);
    return {panel.x + (panel.width - width * scale) / 2, panel.y + (panel.height - height * scale) / 2, width * scale, height * scale};
}

inline Rect panelRect(int view, double width, double height, bool threeViews) {
    if (threeViews)
        return {view * width / 3 + 12, 40, width / 3 - 24, height - 64};
    return {24, 40, width - 48, height - 64};
}

#if LAB_CHECKPOINT >= 6
inline std::optional<Point> pickSlice(const Grid& grid, int view, Point cursor, Rect rect, double x, double y) {
    if (rect.width <= 0 || rect.height <= 0 || x < rect.x || x > rect.x + rect.width || y < rect.y || y > rect.y + rect.height)
        return std::nullopt;
    const double u = (x - rect.x) / rect.width;
    const double v = (y - rect.y) / rect.height;
    Point point = cursor;
    const Axes axes = axesFor(view);
    point[axes.horizontal] = std::clamp(lower(grid, axes.horizontal) + u * grid.count[axes.horizontal] * grid.spacing[axes.horizontal], worldCoordinate(grid, axes.horizontal, 0), worldCoordinate(grid, axes.horizontal, grid.count[axes.horizontal] - 1));
    point[axes.vertical] = std::clamp(lower(grid, axes.vertical) + (1 - v) * grid.count[axes.vertical] * grid.spacing[axes.vertical], worldCoordinate(grid, axes.vertical, 0), worldCoordinate(grid, axes.vertical, grid.count[axes.vertical] - 1));
    return point;
}
#endif
} // namespace slices
