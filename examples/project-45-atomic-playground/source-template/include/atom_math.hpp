#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <stdexcept>

namespace atom {

inline constexpr double pi = 3.1415926535897932384626433832795;

struct Vec3 {
    float x{}, y{}, z{};
};

inline Vec3 operator+(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 operator-(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 operator*(Vec3 a, float factor) {
    return {a.x * factor, a.y * factor, a.z * factor};
}

inline Vec3 operator/(Vec3 a, float factor) {
    return {a.x / factor, a.y / factor, a.z / factor};
}

inline float dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline float length(Vec3 value) {
    return std::sqrt(dot(value, value));
}

inline bool finite(Vec3 value) {
    return std::isfinite(value.x) && std::isfinite(value.y) && std::isfinite(value.z);
}

inline Vec3 normalized(Vec3 value) {
    const float magnitude = length(value);
    if (!finite(value) || !std::isfinite(magnitude) || magnitude <= 0)
        throw std::invalid_argument("A direction needs a finite nonzero magnitude");
    return value / magnitude;
}

inline std::size_t checkedProduct(std::size_t first, std::size_t second) {
    if (second != 0 && first > std::numeric_limits<std::size_t>::max() / second)
        throw std::overflow_error("Allocation multiplication overflows size_t");
    return first * second;
}

// std430 and the CPU reference use the same two vec4 record. One record is a
// sampled location, never an additional electron or a trajectory state.
struct alignas(16) PointRecord {
    std::array<float, 4> positionDensity{};
    std::array<float, 4> signPadding{};
};

static_assert(sizeof(PointRecord) == 32);
static_assert(offsetof(PointRecord, signPadding) == 16);

inline Vec3 pointOf(const PointRecord& point) {
    return {point.positionDensity[0], point.positionDensity[1], point.positionDensity[2]};
}

} // namespace atom
