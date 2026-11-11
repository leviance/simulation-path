#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstdint>
#include <numbers>
#include <stdexcept>

namespace morph {

constexpr double tau = 2.0 * std::numbers::pi_v<double>;

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
inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}
inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}
inline double length(Vec3 a) {
    return std::sqrt(dot(a, a));
}
inline Vec3 unit(Vec3 a) {
    const double size = length(a);
    if (!std::isfinite(size) || size < 1e-12)
        throw std::invalid_argument("A direction has zero or non-finite length");
    return a * (1.0 / size);
}
inline bool finite(Vec3 a) {
    return std::isfinite(a.x) && std::isfinite(a.y) && std::isfinite(a.z);
}

// Each vec4 occupies exactly one std430 slot. An array slot, not position, is a sample ID.
struct alignas(16) Vec4 {
    float x{};
    float y{};
    float z{};
    float w{};
    bool operator==(const Vec4 &) const = default;
};
static_assert(sizeof(Vec4) == 16 && alignof(Vec4) == 16);
inline Vec4 pack(Vec3 p, float w = 0.0F) {
    return {static_cast<float>(p.x), static_cast<float>(p.y), static_cast<float>(p.z), w};
}
inline Vec3 xyz(const Vec4 &p) {
    return {p.x, p.y, p.z};
}

class Random {
    public:
    explicit Random(std::uint32_t seed)
        : state_(seed) {
    }
    std::uint32_t next() {
        state_ = state_ * 1664525U + 1013904223U;
        return state_;
    }
    double uniform() {
        return static_cast<double>(next()) / 4294967296.0;
    }
    std::uint32_t index(std::uint32_t count) {
        if (count == 0)
            throw std::invalid_argument("Cannot draw an index from an empty set");
        const std::uint32_t threshold = (0U - count) % count;
        std::uint32_t value = next();
        while (value < threshold)
            value = next();
        return value % count;
    }

    private:
    std::uint32_t state_{};
};

inline std::uint32_t hashId(std::uint32_t id) {
    id ^= id >> 16U;
    id *= 0x7feb352dU;
    id ^= id >> 15U;
    id *= 0x846ca68bU;
    return id ^ (id >> 16U);
}

} // namespace morph
