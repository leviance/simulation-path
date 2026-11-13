#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <stdexcept>

namespace sculpt {

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
    if (!finite(value) || !std::isfinite(magnitude) || magnitude <= 1e-12F)
        throw std::invalid_argument("A direction needs a finite nonzero magnitude");
    return value / magnitude;
}

inline float interpolate(float a, float b, float t) {
    return a + (b - a) * t;
}

inline std::size_t checkedProduct(std::size_t a, std::size_t b) {
    if (b != 0 && a > std::numeric_limits<std::size_t>::max() / b)
        throw std::overflow_error("Grid or buffer size overflows size_t");
    return a * b;
}

// Same 32-byte std430 record is used by CPU fixtures, GPU emit and mesh readback.
struct SurfaceVertex {
    std::array<float, 4> position;
    std::array<float, 4> normal;
};

static_assert(sizeof(SurfaceVertex) == 32);

inline Vec3 positionOf(const SurfaceVertex& vertex) {
    return {vertex.position[0], vertex.position[1], vertex.position[2]};
}

inline Vec3 normalOf(const SurfaceVertex& vertex) {
    return {vertex.normal[0], vertex.normal[1], vertex.normal[2]};
}

} // namespace sculpt
