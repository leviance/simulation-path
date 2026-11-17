#pragma once
#include "model.hpp"
#include <vector>

namespace slices {
// Small vector helpers used by the presentation scaffold, not by volume indexing.
inline Point add(Point a, Point b) {
    return {a[0] + b[0], a[1] + b[1], a[2] + b[2]};
}

inline Point subtract(Point a, Point b) {
    return {a[0] - b[0], a[1] - b[1], a[2] - b[2]};
}

inline Point multiply(Point a, double scale) {
    return {a[0] * scale, a[1] * scale, a[2] * scale};
}

inline double dot(Point a, Point b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

inline Point cross(Point a, Point b) {
    return {a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]};
}

inline Point normalize(Point value) {
    const double length = std::hypot(value[0], value[1], value[2]);
    if (length <= 1e-20) {
        return {};
    }
    return multiply(value, 1 / length);
}

struct SurfaceVertex {
    Point point;
    Point normal;
};

using SurfaceTriangle = std::array<SurfaceVertex, 3>;
using Surface = std::vector<SurfaceTriangle>;

inline SurfaceVertex interpolate(SurfaceVertex a, SurfaceVertex b, double t) {
    return {add(a.point, multiply(subtract(b.point, a.point), t)), add(a.normal, multiply(subtract(b.normal, a.normal), t))};
}
} // namespace slices
