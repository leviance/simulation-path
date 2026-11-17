#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <numbers>
#include <stdexcept>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

namespace slices {
using Point = std::array<double, 3>;

// [snippet grid]
// Count tells us how many samples exist; spacing tells us how far apart they are.
struct Grid {
    std::array<int, 3> count{128, 128, 128};
    Point spacing{3.2 / 128, 3.84 / 128, 4.8 / 128};
};

inline Grid makeGrid(int side) {
    if (side != 64 && side != 128) {
        throw std::invalid_argument("Viewer resolution must be 64 or 128");
    }
    return {{side, side, side}, {3.2 / side, 3.84 / side, 4.8 / side}};
}

// [/snippet grid]

// [snippet coordinates]
// The origin of world space is the centre of the box, not voxel (0,0,0).
inline double lower(const Grid& grid, int axis) {
    return -grid.count[axis] * grid.spacing[axis] / 2;
}

inline double worldCoordinate(const Grid& grid, int axis, double index) {
    return lower(grid, axis) + (index + 0.5) * grid.spacing[axis];
}

inline double gridCoordinate(const Grid& grid, int axis, double world) {
    return (world - lower(grid, axis)) / grid.spacing[axis] - 0.5;
}

// [/snippet coordinates]

inline Point initialPoint([[maybe_unused]] const Grid& grid) {
    // Zero is between two central samples for an even-sized axis.
    return {0, 0, 0};
}

inline Point clampPoint(const Grid& grid, Point point) {
    for (int axis = 0; axis < 3; ++axis) {
        point[axis] = std::clamp(point[axis], worldCoordinate(grid, axis, 0), worldCoordinate(grid, axis, grid.count[axis] - 1));
    }
    return point;
}

struct Axes {
    int horizontal = 0;
    int vertical = 1;
    int cut = 2;
};

inline Axes axesFor(int view) {
#if LAB_CHECKPOINT >= 3
    // [snippet axes]
    if (view == 1) {
        return {0, 2, 1};
    }
    if (view == 2) {
        return {1, 2, 0};
    }
    // [/snippet axes]
#else
    (void)view;
#endif
    return {};
}

#if LAB_CHECKPOINT >= 1
// [snippet phantom]
inline double gaussian(Point point, Point centre, Point radius) {
    double q = 0;
    for (int axis = 0; axis < 3; ++axis) {
        const double d = (point[axis] - centre[axis]) / radius[axis];
        q += d * d;
    }
    return std::exp(-q);
}

inline double phantom(Point point) {
    // A rounded material block containing a helical inclusion and an axial void.
    const Point q{std::abs(point[0]) - 0.98, std::abs(point[1]) - 1.12, std::abs(point[2]) - 1.5};
    const double outside = std::hypot(std::max(0.0, q[0]), std::max(0.0, q[1]), std::max(0.0, q[2]));
    const double distance = outside + std::min(0.0, std::max({q[0], q[1], q[2]})) - 0.2;
    if (distance >= 0.07) {
        return 0;
    }
    const double t = std::clamp((0.07 - distance) / 0.13, 0.0, 1.0);
    const double support = t * t * (3 - 2 * t);
    const double shell = 0.22 * std::exp(-distance * distance / 0.008);
    const double theta = (point[2] + 1.5) * 2 * std::numbers::pi / 1.1;
    const double wireX = point[0] - 0.58 * std::cos(theta);
    const double wireY = point[1] - 0.58 * std::sin(theta);
    const double wire = 0.52 * std::exp(-(wireX * wireX + wireY * wireY) / 0.018);
    const double holeX = point[0] + 0.25;
    const double holeY = point[1] + 0.12;
    const double hole = 0.4 * std::exp(-(holeX * holeX + holeY * holeY) / 0.055);
    const double marker = 0.3 * gaussian(point, {0.55, 0.58, -0.7}, {0.22, 0.25, 0.3});
    return std::clamp((0.4 + shell + wire + marker - hole) * support, 0.0, 1.0);
}
// [/snippet phantom]

enum class Preset { Phantom,
                    Sphere,
                    Gaussian,
                    Layers,
                    Ramp };
inline constexpr std::array<const char*, 5> presetNames{"Material", "Sphere", "Gaussian", "Layers", "Axis ramp"};

// [snippet fields]
inline double fieldValue(Point point, Preset preset) {
    if (preset == Preset::Sphere) {
        const double radiusSquared = point[0] * point[0] + point[1] * point[1] + point[2] * point[2];
        if (radiusSquared <= 1) {
            return 1;
        }
        return 0;
    }
    if (preset == Preset::Gaussian) {
        return gaussian(point, {0, 0, 0}, {0.85, 0.85, 0.85});
    }
    if (preset == Preset::Layers) {
        if (point[2] < -0.8) {
            return 0.15;
        }
        if (point[2] < 0.8) {
            return 0.5;
        }
        return 0.85;
    }
    return phantom(point);
}

// [/snippet fields]
#endif
} // namespace slices
