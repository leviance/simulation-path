#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <numbers>
#include <stdexcept>

namespace bulb {

constexpr double pi = std::numbers::pi_v<double>;

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

inline Vec3 operator*(Vec3 a, double s) {
    return {a.x * s, a.y * s, a.z * s};
}

inline Vec3 operator/(Vec3 a, double s) {
    return a * (1.0 / s);
}

inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline double length(Vec3 v) {
    return std::sqrt(dot(v, v));
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline bool finite(Vec3 p) {
    return std::isfinite(p.x) && std::isfinite(p.y) && std::isfinite(p.z);
}

inline Vec3 unit(Vec3 p) {
    const double magnitude = length(p);
    if (!finite(p) || magnitude < 1e-12)
        throw std::invalid_argument("Direction must be finite and nonzero");
    return p / magnitude;
}

struct alignas(16) Float4 {
    float x{}, y{}, z{}, w{};
};

struct alignas(16) UInt4 {
    std::uint32_t x{}, y{}, z{}, w{};
};

struct Pixel {
    Float4 color;
    UInt4 work;
    Float4 surface;
};

static_assert(sizeof(Pixel) == 48);

} // namespace bulb
