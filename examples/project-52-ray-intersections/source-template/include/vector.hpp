#pragma once
#include <cmath>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

namespace picking {
// World coordinates use x right, y up and z away from the initial camera.
struct Vec3 {
    double x = 0;
    double y = 0;
    double z = 0;
};

inline Vec3 add(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 subtract(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 multiply(Vec3 v, double scale) {
    return {v.x * scale, v.y * scale, v.z * scale};
}

inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline double length(Vec3 v) {
    return std::hypot(v.x, v.y, v.z);
}

inline bool finite(Vec3 v) {
    return std::isfinite(v.x) && std::isfinite(v.y) && std::isfinite(v.z);
}

inline Vec3 normalize(Vec3 v) {
    const double magnitude = length(v);
    if (!std::isfinite(magnitude) || magnitude <= 0) {
        return {};
    }
    return multiply(v, 1 / magnitude);
}
} // namespace picking
