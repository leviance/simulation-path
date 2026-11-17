#pragma once
#include "sampling.hpp"
#include <cstdint>
#include <vector>

namespace slices {
struct Window {
    double level = 0.5;
    double width = 1;
};

#if LAB_CHECKPOINT >= 4
// [snippet window]
inline double windowValue(double value, Window window) {
    if (!std::isfinite(value) || !std::isfinite(window.level) || !std::isfinite(window.width) || window.width <= 0) {
        throw std::invalid_argument("Invalid scalar or window/level");
    }
    const double minimum = window.level - window.width / 2;
    return std::clamp((value - minimum) / window.width, 0.0, 1.0);
}

// [/snippet window]
#endif

struct Image {
    static constexpr int side = 256;
    // Heap storage avoids putting three large images on the Windows stack.
    std::vector<std::uint8_t> rgba = std::vector<std::uint8_t>(side * side * 4);
};

#if LAB_CHECKPOINT >= 1
// [snippet plane]
inline Point slicePoint(const Grid& grid, int view, Point cursor, double u, double v) {
    const Axes axes = axesFor(view);
    Point point = cursor;
    point[axes.horizontal] = lower(grid, axes.horizontal) + u * grid.count[axes.horizontal] * grid.spacing[axes.horizontal];
    point[axes.vertical] = lower(grid, axes.vertical) + (1 - v) * grid.count[axes.vertical] * grid.spacing[axes.vertical];
    return point;
}

// [/snippet plane]

using ScalarImage = std::vector<double>;
// Alternate declarations keep each snapshot's API honest: no Volume before Bài 02.
// clang-format off
#if LAB_CHECKPOINT <= 1
inline ScalarImage sampleImage(const Grid& grid, int view, Point cursor, [[maybe_unused]] bool linear)
#endif
#if LAB_CHECKPOINT >= 2
inline ScalarImage sampleImage(const Grid& grid, int view, Point cursor, [[maybe_unused]] bool linear, const Volume& volume)
#endif
{
    // clang-format on
    // [snippet sample-image]
    ScalarImage scalars(Image::side * Image::side);
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
            scalars[static_cast<std::size_t>(x + y * Image::side)] = value;
        }
    }
    return scalars;
    // [/snippet sample-image]
}

// A small piecewise-linear colour map; raw scalar stays separate from display.
inline std::array<std::uint8_t, 3> colorValue(double brightness, bool color) {
    if (!std::isfinite(brightness)) {
        throw std::invalid_argument("Brightness must be finite");
    }
    const double t = std::clamp(brightness, 0.0, 1.0);
    if (!color) {
        const auto gray = static_cast<std::uint8_t>(std::floor(t * 255 + 0.5));
        return {gray, gray, gray};
    }
    const std::array<Point, 5> stops{{{6, 10, 23}, {43, 34, 95}, {20, 136, 145}, {104, 205, 145}, {255, 235, 145}}};
    const double position = t * 4;
    const int index = std::min(3, static_cast<int>(std::floor(position)));
    std::array<std::uint8_t, 3> result{};
    for (int channel = 0; channel < 3; ++channel) {
        result[channel] = static_cast<std::uint8_t>(std::floor(std::lerp(stops[index][channel], stops[index + 1][channel], position - index) + 0.5));
    }
    return result;
}

inline Image colorImage(const ScalarImage& scalars, [[maybe_unused]] Window window, bool color) {
    if (scalars.size() != static_cast<std::size_t>(Image::side) * Image::side) {
        throw std::invalid_argument("Scalar image must match the destination dimensions");
    }
    Image image;
    // [snippet color-image]
    for (std::size_t i = 0; i < scalars.size(); ++i) {
        double brightness = std::clamp(scalars[i], 0.0, 1.0);
#if LAB_CHECKPOINT >= 4
        brightness = windowValue(scalars[i], window);
#endif
        const auto rgb = colorValue(brightness, color);
        image.rgba[4 * i] = rgb[0];
        image.rgba[4 * i + 1] = rgb[1];
        image.rgba[4 * i + 2] = rgb[2];
        image.rgba[4 * i + 3] = 255;
    }
    // [/snippet color-image]
    return image;
}
#endif
} // namespace slices
