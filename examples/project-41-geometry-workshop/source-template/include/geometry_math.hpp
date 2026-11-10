#pragma once

#include <cmath>
#include <numbers>
#include <stdexcept>

namespace geometry {

inline constexpr double fullTurn = 2.0 * std::numbers::pi_v<double>;

// Evaluate surfaces in double precision; convert only when storing a GPU vertex.
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

inline Vec3 operator*(Vec3 v, double scale) {
    return {v.x * scale, v.y * scale, v.z * scale};
}

inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x,
    };
}

inline double length(Vec3 v) {
    return std::sqrt(dot(v, v));
}

inline Vec3 unit(Vec3 v) {
    const double magnitude = length(v);
    if (!std::isfinite(magnitude) || magnitude <= 1e-12) {
        throw std::domain_error("Surface tangent or normal has no usable direction");
    }
    return v * (1.0 / magnitude);
}

} // namespace geometry
