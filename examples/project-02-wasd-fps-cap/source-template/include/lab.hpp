#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#if LAB_CHECKPOINT >= 4
#include <algorithm>
#endif
#if LAB_CHECKPOINT >= 1
#include <cmath>
#endif
#if LAB_CHECKPOINT >= 4
#include <span>
#endif
namespace lab {
#if LAB_CHECKPOINT >= 1

// Vec2 giữ các phép toán tối thiểu cần cho movement của project này.
struct Vec2 {
    double x{};
    double y{};
#if LAB_CHECKPOINT >= 2
    Vec2& operator+=(Vec2 other) {
        x += other.x;
        y += other.y;
        return *this;
    }
#endif
};
#if LAB_CHECKPOINT >= 2
inline Vec2 operator*(Vec2 vector, double scalar) {
    return {vector.x * scalar, vector.y * scalar};
}
#endif
inline double length(Vec2 vector) {
    return std::hypot(vector.x, vector.y);
}

inline Vec2 normalize(Vec2 vector) {
    const double magnitude = length(vector);
    if (magnitude == 0.0) {
        return {};
    }
    return {vector.x / magnitude, vector.y / magnitude};
}
#endif
#if LAB_CHECKPOINT >= 4

constexpr double kMaximumDeltaTime = 0.05;

// Chuẩn hóa dt tại một nơi để app và tests dùng cùng chính sách.
inline double sanitizeDeltaTime(double dt) {
    return std::clamp(dt, 0.0, kMaximumDeltaTime);
}

inline void update(Vec2& position, Vec2 velocity, double dt) {
    position += velocity * sanitizeDeltaTime(dt);
}

// Chạy cùng hàm update trên một timeline xác định, không cần mở SDL window.
inline double simulate(std::span<const double> timeSteps, double speed = 180.0) {
    Vec2 position{};
    const Vec2 velocity{speed, 0.0};
    for (double dt : timeSteps) {
        update(position, velocity, dt);
    }
    return position.x;
}
#endif
} // namespace lab
