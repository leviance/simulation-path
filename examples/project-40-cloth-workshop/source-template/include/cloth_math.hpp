#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 14
#endif

#include <algorithm>
#include <cmath>
#include <cstdint>
#include <limits>

namespace cloth {

struct Vec3 {
    float x{};
    float y{};
    float z{};
};

struct alignas(16) Vec4 {
    float x{};
    float y{};
    float z{};
    float w{};
};

inline Vec3 operator+(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 operator-(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 operator*(Vec3 a, float scale) {
    return {a.x * scale, a.y * scale, a.z * scale};
}

inline Vec3 operator/(Vec3 a, float scale) {
    return a * (1.0F / scale);
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

inline Vec3 normalized(Vec3 value, Vec3 fallback = {0.0F, 1.0F, 0.0F}) {
    const float magnitude = length(value);
    if (!std::isfinite(magnitude) || magnitude < 1.0e-8F) {
        return fallback;
    }
    return value / magnitude;
}

inline Vec3 xyz(Vec4 value) {
    return {value.x, value.y, value.z};
}

inline Vec4 vector4(Vec3 value, float w = 0.0F) {
    return {value.x, value.y, value.z, w};
}

inline Vec3 limited(Vec3 value, float maximum) {
    const float magnitude = length(value);
    if (magnitude > maximum && magnitude > 0.0F) {
        return value * (maximum / magnitude);
    }
    return value;
}

inline Vec3 closestOnSegment(Vec3 point, Vec3 a, Vec3 b) {
    const Vec3 segment = b - a;
    const float denominator = dot(segment, segment);
    if (denominator < 1.0e-12F) {
        return a;
    }
    const float fraction = std::clamp(dot(point - a, segment) / denominator, 0.0F, 1.0F);
    return a + segment * fraction;
}

constexpr std::uint32_t noVertex = std::numeric_limits<std::uint32_t>::max();

} // namespace cloth
