#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif
#include <algorithm>
#include <array>
#include <cmath>
#include <stdexcept>

namespace slice53 {
// Geometry uses millimetres. Scalar values have no medical interpretation.
struct Vec3 {
    double x = 0;
    double y = 0;
    double z = 0;

    double& operator[](int axis) {
        if (axis == 0) return x;
        if (axis == 1) return y;
        if (axis == 2) return z;
        throw std::out_of_range("Vec3 axis");
    }

    double operator[](int axis) const {
        if (axis == 0) return x;
        if (axis == 1) return y;
        if (axis == 2) return z;
        throw std::out_of_range("Vec3 axis");
    }
};

inline Vec3 operator+(Vec3 a, Vec3 b) { return {a.x + b.x, a.y + b.y, a.z + b.z}; }
inline Vec3 operator-(Vec3 a, Vec3 b) { return {a.x - b.x, a.y - b.y, a.z - b.z}; }
inline Vec3 operator*(Vec3 a, double scale) { return {a.x * scale, a.y * scale, a.z * scale}; }
inline Vec3 operator/(Vec3 a, double scale) { return a * (1.0 / scale); }
inline double dot(Vec3 a, Vec3 b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
inline Vec3 cross(Vec3 a, Vec3 b) { return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x}; }
inline double length(Vec3 a) { return std::sqrt(dot(a, a)); }
inline bool finite(Vec3 a) { return std::isfinite(a.x) && std::isfinite(a.y) && std::isfinite(a.z); }

inline Vec3 unit(Vec3 a) {
    const double magnitude = length(a);
    if (!std::isfinite(magnitude) || magnitude < 1e-12) return {0, 1, 0};
    return a / magnitude;
}

inline double lerp(double a, double b, double t) { return a + t * (b - a); }
inline Vec3 lerp(Vec3 a, Vec3 b, double t) { return a + (b - a) * t; }
} // namespace slice53
