#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

namespace slices {
// Axis order is x,y,z. Samples live at voxel centres, not at voxel corners.
using Point = std::array<double, 3>;

struct Grid {
    std::array<int, 3> count{64, 48, 40};
    Point spacing{0.05, 0.08, 0.12};
};

inline double lower(const Grid& grid, int axis) {
    return -grid.count[axis] * grid.spacing[axis] / 2;
}

inline double worldCoordinate(const Grid& grid, int axis, double index) {
    return lower(grid, axis) + (index + 0.5) * grid.spacing[axis];
}

inline double gridCoordinate(const Grid& grid, int axis, double world) {
    return (world - lower(grid, axis)) / grid.spacing[axis] - 0.5;
}

inline Point initialPoint(const Grid& grid) {
    return {worldCoordinate(grid, 0, grid.count[0] / 2), worldCoordinate(grid, 1, grid.count[1] / 2), worldCoordinate(grid, 2, grid.count[2] / 2)};
}

struct Axes {
    int horizontal = 0;
    int vertical = 1;
    int cut = 2;
};

inline Axes axesFor(int view) {
#if LAB_CHECKPOINT >= 3
    if (view == 1) {
        return {0, 2, 1};
    }
    if (view == 2) {
        return {1, 2, 0};
    }
#else
    (void)view;
#endif
    return {};
}

#if LAB_CHECKPOINT >= 1
inline double gaussian(Point point, Point centre, Point radius) {
    double q = 0;
    for (int axis = 0; axis < 3; ++axis) {
        const double d = (point[axis] - centre[axis]) / radius[axis];
        q += d * d;
    }
    return std::exp(-q);
}

inline double phantom(Point point) {
    const double body = 0.6 * gaussian(point, {0, 0, 0}, {0.85, 1.1, 1.3});
    const double insert = 0.75 * gaussian(point, {-0.55, -0.45, 0.35}, {0.22, 0.3, 0.5});
    const double marker = 0.8 * gaussian(point, {0.9, 0.85, -0.6}, {0.18, 0.25, 0.22});
    return std::clamp(0.04 + body + insert + marker, 0.0, 1.0);
}
#endif
} // namespace slices
