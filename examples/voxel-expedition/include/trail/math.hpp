#pragma once
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <numbers>

namespace trail {
inline constexpr double pi = std::numbers::pi;
struct Vec3 {
    double x = 0;
    double y = 0;
    double z = 0;
};

inline Vec3 operator+(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}
inline Vec3 operator-(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}
inline Vec3 operator*(Vec3 a, double scale) {
    return {a.x * scale, a.y * scale, a.z * scale};
}
inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 normalized(Vec3 a) {
    const double length = std::sqrt(dot(a, a));
    if (length < 1e-12) {
        return {};
    }
    return a * (1.0 / length);
}

inline double smooth(double lower, double upper, double value) {
    const double u = std::clamp((value - lower) / (upper - lower), 0.0, 1.0);
    return u * u * (3 - 2 * u);
}

// Số nguyên không dấu tràn theo modulo 2^32, kể cả ở tọa độ world âm.
inline std::uint32_t hash(int x, int z, std::uint32_t seed) {
    std::uint32_t bits = static_cast<std::uint32_t>(x) * 0x8da6b343u;
    bits ^= static_cast<std::uint32_t>(z) * 0xd8163841u + seed * 0xcb1ab31fu;
    bits ^= bits >> 16;
    bits *= 0x7feb352du;
    return bits ^ (bits >> 15);
}

struct Color {
    std::uint8_t r, g, b;
    std::uint8_t a = 255;
};

inline std::uint8_t channel(double value) {
    return static_cast<std::uint8_t>(std::clamp(value, 0.0, 255.0));
}

inline Color blend(Color a, Color b, double t) {
    t = std::clamp(t, 0.0, 1.0);
    return {channel(std::lerp(a.r, b.r, t)), channel(std::lerp(a.g, b.g, t)), channel(std::lerp(a.b, b.b, t))};
}
} // namespace trail
