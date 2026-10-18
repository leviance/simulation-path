#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include <algorithm>
#include <cmath>

namespace lab {
#if LAB_CHECKPOINT >= 1
// Cùng hai số, nhưng điểm là vị trí còn vector là một độ dời.
struct Vec2 {
    double x{};
    double y{};
    friend bool operator==(Vec2, Vec2) = default;
};

inline Vec2 operator+(Vec2 left, Vec2 right) {
    return {left.x + right.x, left.y + right.y};
}

inline Vec2 operator-(Vec2 left, Vec2 right) {
    return {left.x - right.x, left.y - right.y};
}

inline Vec2 operator*(Vec2 vector, double scalar) {
    return {vector.x * scalar, vector.y * scalar};
}

inline Vec2 operator*(double scalar, Vec2 vector) {
    return vector * scalar;
}

inline bool finite(Vec2 point) {
    return std::isfinite(point.x) && std::isfinite(point.y);
}
#endif

#if LAB_CHECKPOINT >= 2
inline double lengthSquared(Vec2 vector) {
    return vector.x * vector.x + vector.y * vector.y;
}

inline double length(Vec2 vector) {
    return std::hypot(vector.x, vector.y);
}

// Chia cùng một tỉ lệ trước: tránh overflow/underflow mà không đổi hướng.
inline Vec2 normalize(Vec2 vector) {
    if (!finite(vector)) {
        return {};
    }
    const double largest = std::max(std::abs(vector.x), std::abs(vector.y));
    if (largest == 0.0) {
        return {};
    }
    const Vec2 scaled{vector.x / largest, vector.y / largest};
    const double magnitude = length(scaled);
    return {scaled.x / magnitude, scaled.y / magnitude};
}

struct ArrowHead {
    Vec2 leftWing{};
    Vec2 rightWing{};
    bool visible{};
};

// Đầu vào là screen coordinate; đầu mũi tên không đổi theo độ dài vector world.
inline ArrowHead arrowHead(Vec2 start, Vec2 end) {
    const Vec2 delta = end - start;
    const double screenLength = length(delta);
    if (!std::isfinite(screenLength) || screenLength < 1e-6) {
        return {};
    }
    const Vec2 direction = normalize(delta);
    const Vec2 perpendicular{-direction.y, direction.x};
    const double headLength = std::min(14.0, screenLength * 0.6);
    const double halfWidth = headLength * (6.0 / 14.0);
    const Vec2 base = end - direction * headLength;
    return {base + perpendicular * halfWidth, base - perpendicular * halfWidth, true};
}
#endif

#if LAB_CHECKPOINT >= 3
inline double distance(Vec2 start, Vec2 end) {
    return length(end - start);
}
#endif

#if LAB_CHECKPOINT >= 8
// Hàm toán cho phép ngoại suy; giao diện của project giới hạn t trong [0,1].
inline Vec2 lerp(Vec2 start, Vec2 end, double t) {
    return start + (end - start) * t;
}
#endif
} // namespace lab
