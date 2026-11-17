#pragma once
#include <algorithm>
#include <cmath>

namespace water51 {
// Double-precision vectors for the independent CPU reference and camera, not SSBO records.
struct Vec3 {
    double x = 0;
    double y = 0;
    double z = 0;

    double& operator[](int axis) {
        if (axis == 0)
            return x;
        if (axis == 1)
            return y;
        return z;
    }

    double operator[](int axis) const {
        if (axis == 0)
            return x;
        if (axis == 1)
            return y;
        return z;
    }
};

inline Vec3 add(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 subtract(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 scale(Vec3 a, double factor) {
    return {a.x * factor, a.y * factor, a.z * factor};
}

inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline double length(Vec3 a) {
    return std::sqrt(dot(a, a));
}

inline Vec3 normalized(Vec3 a) {
    const double magnitude = length(a);
    if (magnitude < 1e-15)
        return {};
    return scale(a, 1 / magnitude);
}

inline bool finite(Vec3 a) {
    return std::isfinite(a.x) && std::isfinite(a.y) && std::isfinite(a.z);
}
} // namespace water51
