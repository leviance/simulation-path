#pragma once
#include "sampling.hpp"
#include <cstdint>

namespace slices {
struct Window {
    double level = 0.5;
    double width = 1;
};

#if LAB_CHECKPOINT >= 4
// Display mapping never modifies the scalar values stored in the volume.
inline double windowValue(double value, Window window) {
    if (!std::isfinite(value) || !std::isfinite(window.level) || !std::isfinite(window.width) || window.width <= 0) {
        throw std::invalid_argument("Invalid scalar or window/level");
    }
    const double minimum = window.level - window.width / 2;
    return std::clamp((value - minimum) / window.width, 0.0, 1.0);
}
#endif

struct Image {
    static constexpr int side = 128;
    std::array<std::uint8_t, side * side * 4> rgba{};
};

#if LAB_CHECKPOINT >= 1
inline Point slicePoint(const Grid& grid, int view, Point cursor, double u, double v) {
    const Axes axes = axesFor(view);
    Point point = cursor;
    point[axes.horizontal] = lower(grid, axes.horizontal) + u * grid.count[axes.horizontal] * grid.spacing[axes.horizontal];
    point[axes.vertical] = lower(grid, axes.vertical) + (1 - v) * grid.count[axes.vertical] * grid.spacing[axes.vertical];
    return point;
}

// Alternate signatures share a body; each generated snapshot contains only one.
// clang-format off
#if LAB_CHECKPOINT <= 1
inline Image makeImage(const Grid& grid, int view, Point cursor, [[maybe_unused]] Window window, [[maybe_unused]] bool linear) {
#endif
#if LAB_CHECKPOINT >= 2
inline Image makeImage(const Grid& grid, int view, Point cursor, [[maybe_unused]] Window window, [[maybe_unused]] bool linear, const Volume& volume) {
#endif
    Image image;
    for (int y = 0; y < Image::side; ++y) {
        for (int x = 0; x < Image::side; ++x) {
            const double u = (x + 0.5) / Image::side;
            const double v = (y + 0.5) / Image::side;
            const Point point = slicePoint(grid, view, cursor, u, v);
            double value = 0;
#if LAB_CHECKPOINT <= 1
            value = phantom(point);
#endif
#if LAB_CHECKPOINT >= 2
            value = sampleNearest(volume, point).value_or(0);
#endif
#if LAB_CHECKPOINT >= 5
            if (linear) {
                value = sampleLinear(volume, point).value_or(0);
            }
#endif
            double brightness = std::clamp(value, 0.0, 1.0);
#if LAB_CHECKPOINT >= 4
            brightness = windowValue(value, window);
#endif

            const auto gray = static_cast<std::uint8_t>(std::floor(brightness * 255 + 0.5));
            const std::size_t pixel = static_cast<std::size_t>(4 * (x + y * Image::side));
            image.rgba[pixel] = gray;
            image.rgba[pixel + 1] = gray;
            image.rgba[pixel + 2] = gray;
            image.rgba[pixel + 3] = 255;
        }
    }
    return image;
}
// clang-format on
#endif
} // namespace slices
