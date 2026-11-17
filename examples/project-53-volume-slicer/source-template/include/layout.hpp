#pragma once
#include "model.hpp"
#include <optional>

namespace slices {
struct Rect {
    double x = 0;
    double y = 0;
    double width = 0;
    double height = 0;
};

inline bool contains(Rect rect, double x, double y) {
    return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

// [snippet fit]
inline Rect fitSlice(const Grid& grid, int view, Rect panel) {
    const Axes axes = axesFor(view);
    const double width = grid.count[axes.horizontal] * grid.spacing[axes.horizontal];
    const double height = grid.count[axes.vertical] * grid.spacing[axes.vertical];
    const double scale = std::min(panel.width / width, panel.height / height);
    return {panel.x + (panel.width - width * scale) / 2, panel.y + (panel.height - height * scale) / 2, width * scale, height * scale};
}

// [/snippet fit]

inline Rect panelRect(int view, double width, double height, bool threeViews) {
    if (threeViews) {
        return {width * 0.5055, height * (130.0 + 218 * view) / 900, width * 264 / 1440, height * 142 / 900};
    }
    const double available = width * 0.705;
    double column = available;
    if (threeViews) {
        column = available / 3;
    }
    return {view * column + 16, 126, column - 32, height * 0.41};
}

// Fit the projected bounds, not just the unprojected z extent.
inline std::array<double, 2> locatorPoint(const Grid& grid, Point point, Rect area) {
    const Point extent{grid.count[0] * grid.spacing[0], grid.count[1] * grid.spacing[1], grid.count[2] * grid.spacing[2]};
    const double horizontalSpan = extent[0] + 0.65 * extent[1];
    const double verticalSpan = 0.3 * extent[0] + 0.35 * extent[1] + extent[2];
    const double scale = 0.9 * std::min(area.width / horizontalSpan, area.height / verticalSpan);
    return {area.x + area.width / 2 + (point[0] - 0.65 * point[1]) * scale, area.y + area.height / 2 + (0.3 * point[0] + 0.35 * point[1] - point[2]) * scale};
}

inline Rect sliceSlider(int view, double width, double height, bool threeViews) {
    if (threeViews) {
        return {width * 0.5055, height * (286.0 + 218 * view) / 900, width * 264 / 1440, 22};
    }
    const auto panel = panelRect(view, width, height, threeViews);
    return {panel.x + 6, panel.y + panel.height + 38, panel.width - 12, 22};
}

#if LAB_CHECKPOINT >= 6
// [snippet pick]
inline std::optional<Point> pickSlice(const Grid& grid, int view, Point cursor, Rect rect, double x, double y) {
    if (rect.width <= 0 || rect.height <= 0 || !contains(rect, x, y)) {
        return std::nullopt;
    }
    const double u = (x - rect.x) / rect.width;
    const double v = (y - rect.y) / rect.height;
    const Axes axes = axesFor(view);
    cursor[axes.horizontal] = lower(grid, axes.horizontal) + u * grid.count[axes.horizontal] * grid.spacing[axes.horizontal];
    cursor[axes.vertical] = lower(grid, axes.vertical) + (1 - v) * grid.count[axes.vertical] * grid.spacing[axes.vertical];
    return clampPoint(grid, cursor);
}

// [/snippet pick]
#endif
} // namespace slices
