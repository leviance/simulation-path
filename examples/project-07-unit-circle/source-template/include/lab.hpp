#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <limits>
#include <vector>

namespace lab {
struct Vec2 {
    double x{};
    double y{};
};
inline constexpr double kPi = 3.14159265358979323846;
inline constexpr double kTau = 2.0 * kPi;

#if LAB_CHECKPOINT >= 1
inline double degreesToRadians(double degrees) {
    return degrees * (kPi / 180.0);
}

inline double radiansToDegrees(double radians) {
    return radians * (180.0 / kPi);
}

// Chỉ góc hữu hạn có nghĩa; giá trị không hợp lệ dùng góc 0 làm fallback.
inline double normalizeAngle(double angle) {
    if (!std::isfinite(angle)) {
        return 0.0;
    }
    double normalized = std::fmod(angle, kTau);
    if (normalized < 0.0) {
        normalized += kTau;
    }
    // Cộng một số âm rất nhỏ vào 2π có thể bị làm tròn thành đúng 2π.
    if (normalized >= kTau || normalized == 0.0) {
        return 0.0;
    }
    return normalized;
}
#endif

#if LAB_CHECKPOINT >= 2
inline Vec2 unitDirection(double angle) {
    return {std::cos(angle), std::sin(angle)};
}

inline Vec2 pointOnCircle(Vec2 center, double radius, double angle) {
    const Vec2 direction = unitDirection(angle);
    return {center.x + radius * direction.x, center.y + radius * direction.y};
}
#endif

#if LAB_CHECKPOINT >= 3
inline double advanceAngle(double angle, double angularSpeed, double deltaTime) {
    if (!std::isfinite(angularSpeed) || !std::isfinite(deltaTime) || deltaTime < 0.0) {
        return normalizeAngle(angle);
    }
    return normalizeAngle(angle + angularSpeed * deltaTime);
}

inline double periodFromAngularSpeed(double angularSpeed) {
    if (!std::isfinite(angularSpeed) || angularSpeed == 0.0) {
        return std::numeric_limits<double>::infinity();
    }
    return kTau / std::abs(angularSpeed);
}
#endif

#if LAB_CHECKPOINT >= 4
inline Vec2 projectOntoXAxis(Vec2 point) {
    return {point.x, 0.0};
}

inline Vec2 projectOntoYAxis(Vec2 point) {
    return {0.0, point.y};
}
#endif

#if LAB_CHECKPOINT >= 5
inline constexpr double kVisibleHistorySeconds = 6.0;
inline constexpr double kSampleInterval = 1.0 / 60.0;
inline constexpr std::size_t kMaximumSamples = 361;

struct WaveSample {
    double time{};
    double sine{};
    double cosine{};
};

// X biểu diễn thời gian mô phỏng, không biểu diễn số thứ tự mẫu.
inline double mapSampleTimeToX(double time, double newestTime, double left, double right) {
    const double progress = (time - (newestTime - kVisibleHistorySeconds)) / kVisibleHistorySeconds;
    return left + std::clamp(progress, 0.0, 1.0) * (right - left);
}

inline void appendWaveSample(std::vector<WaveSample>& samples, double time, double angle) {
    const Vec2 direction = unitDirection(angle);
    samples.push_back({time, direction.y, direction.x});
    if (samples.size() > kMaximumSamples) {
        samples.erase(samples.begin());
    }
}
#endif

#if LAB_CHECKPOINT >= 6
inline double angleFromDirection(Vec2 direction) {
    if (!std::isfinite(direction.x) || !std::isfinite(direction.y) || (direction.x == 0.0 && direction.y == 0.0)) {
        return 0.0;
    }
    return normalizeAngle(std::atan2(direction.y, direction.x));
}
#endif
} // namespace lab
