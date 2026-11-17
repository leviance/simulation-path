#pragma once
#include "geometry.hpp"

namespace slices {
// Split convex polygons to keep the original object except its front upper corner.
inline std::vector<SurfaceVertex> clipPolygon(const std::vector<SurfaceVertex>& polygon, int axis, double value, bool greater) {
    std::vector<SurfaceVertex> result;
    for (std::size_t i = 0; i < polygon.size(); ++i) {
        const auto a = polygon[i];
        const auto b = polygon[(i + 1) % polygon.size()];
        double sign = -1;
        if (greater) {
            sign = 1;
        }
        const double da = (a.point[axis] - value) * sign;
        const double db = (b.point[axis] - value) * sign;
        if (da >= 0) {
            result.push_back(a);
        }
        if ((da >= 0) != (db >= 0)) {
            result.push_back(interpolate(a, b, da / (da - db)));
        }
    }
    return result;
}

inline Surface keepOutsideCorner(const SurfaceTriangle& triangle, Point cursor) {
    std::vector<SurfaceVertex> remaining(triangle.begin(), triangle.end());
    Surface result;
    for (int axis = 0; axis < 3; ++axis) {
        if (remaining.empty()) {
            break;
        }
        const bool greater = axis != 1;
        const auto outside = clipPolygon(remaining, axis, cursor[axis], !greater);
        for (std::size_t i = 1; i + 1 < outside.size(); ++i) {
            result.push_back({outside[0], outside[i], outside[i + 1]});
        }
        remaining = clipPolygon(remaining, axis, cursor[axis], greater);
    }
    return result;
}
} // namespace slices
