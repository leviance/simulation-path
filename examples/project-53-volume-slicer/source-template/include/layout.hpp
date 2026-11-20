#pragma once
#include "slice.hpp"

namespace slice53 {
struct Rect { double x; double y; double width; double height; };
inline constexpr int logicalWidth = 1320;
inline constexpr int logicalHeight = 940;
inline constexpr Rect sceneArea{18, 92, 820, 620};

inline bool contains(Rect rect, double x, double y) {
    return x >= rect.x && y >= rect.y && x < rect.x + rect.width && y < rect.y + rect.height;
}

inline Rect slicePanel(int view) { return {856, 92.0 + view * 245, 446, 235}; }

// [snippet fit-slice]
inline Rect sliceRect(const Grid& grid, int view, Rect area) {
    const Axes axes = axesFor(view);
    const Vec3 extent = grid.extent();
    const double scale = std::min(area.width / extent[axes.horizontal], area.height / extent[axes.vertical]);
    const double width = extent[axes.horizontal] * scale;
    const double height = extent[axes.vertical] * scale;
    return {area.x + (area.width - width) * 0.5, area.y + (area.height - height) * 0.5, width, height};
}
// [/snippet fit-slice]

inline Rect smallImage(const Grid& grid, int view) {
    const Rect panel = slicePanel(view);
    return sliceRect(grid, view, {panel.x + 10, panel.y + 31, 258, 190});
}

inline Rect sliderRect(int view) { return {138, 825.0 + view * 31, 535, 14}; }

#if LAB_CHECKPOINT >= 7
// [snippet pick-slice]
inline std::optional<Vec3> pickSlice(const Grid& grid, int view, Rect image, double x, double y, Vec3 probe) {
    if (!contains(image, x, y)) return std::nullopt;
    const double u = (x - image.x) / image.width;
    const double v = 1.0 - (y - image.y) / image.height;
    return grid.clamp(slicePoint(grid, view, u, v, probe));
}
// [/snippet pick-slice]
#endif
} // namespace slice53
