#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 1
#include <cmath>

namespace lab {

// Vec2 lưu điểm hoặc độ dời trong world space bằng hai thành phần số thực.
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

#if LAB_CHECKPOINT >= 2
// Bình phương độ dài dùng được khi so sánh mà không cần tính căn bậc hai.
inline double lengthSquared(Vec2 vector) {
    return vector.x * vector.x + vector.y * vector.y;
}

inline double length(Vec2 vector) {
    return std::sqrt(lengthSquared(vector));
}

inline Vec2 normalize(Vec2 vector) {
    const double magnitude = length(vector);
    if (!std::isfinite(magnitude) || magnitude <= 1e-12) {
        return {};
    }
    return vector * (1.0 / magnitude);
}
#endif

#if LAB_CHECKPOINT >= 3
inline double distance(Vec2 start, Vec2 end) {
    return length(end - start);
}
#endif

#if LAB_CHECKPOINT >= 6
// t trong [0,1] tạo điểm nằm trên đoạn từ start tới end.
inline Vec2 lerp(Vec2 start, Vec2 end, double t) {
    return start + (end - start) * t;
}
#endif

} // namespace lab
#endif
