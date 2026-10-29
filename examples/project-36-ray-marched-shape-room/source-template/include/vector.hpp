#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 11
#endif

#include <algorithm>
#include <cmath>
#include <limits>

namespace lab {

// Phần vector tự chứa: các phép tính này không cần SDL hay OpenGL.
struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline Vec3 operator+(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 operator-(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 operator*(Vec3 value, double factor) {
    return {value.x * factor, value.y * factor, value.z * factor};
}

inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline bool finite(Vec3 value) {
    return std::isfinite(value.x) && std::isfinite(value.y) && std::isfinite(value.z);
}

inline double length(Vec3 value) {
    return std::hypot(value.x, value.y, value.z);
}

inline Vec3 normalize(Vec3 value) {
    const double magnitude = length(value);
    if (!std::isfinite(magnitude) || magnitude < 1e-12) {
        return {};
    }
    return value * (1.0 / magnitude);
}

struct Ray {
    Vec3 origin{};
    Vec3 direction{0.0, 0.0, -1.0};
};

inline bool validRay(const Ray& ray) {
    if (!finite(ray.origin) || !finite(ray.direction)) {
        return false;
    }
    // t chỉ có đơn vị mét khi direction là vector đơn vị.
    return std::abs(length(ray.direction) - 1.0) <= 1e-6;
}

} // namespace lab
