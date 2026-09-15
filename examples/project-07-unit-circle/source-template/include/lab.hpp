#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 1
#include <cmath>
#include <limits>
#if LAB_CHECKPOINT >= 5
#include <cstddef>
#include <vector>
#endif

namespace lab {

inline constexpr double kPi = 3.14159265358979323846;
inline constexpr double kTau = 2.0 * kPi;

struct Vec2 {
    double x{};
    double y{};
};

inline double degreesToRadians(double degrees) {
    return degrees * kPi / 180.0;
}

inline double radiansToDegrees(double radians) {
    return radians * 180.0 / kPi;
}

// Chuẩn hóa mọi góc hữu hạn về một vòng [0, 2π).
inline double normalizeAngle(double angle) {
    if (!std::isfinite(angle)) {
        return 0.0;
    }
    double normalized = std::fmod(angle, kTau);
    if (normalized < 0.0) {
        normalized += kTau;
    }
    if (normalized >= kTau) {
        return 0.0;
    }
    return normalized;
}

#if LAB_CHECKPOINT >= 2
// Trên unit circle, cos là thành phần X và sin là thành phần Y.
inline Vec2 unitDirection(double angle) {
    return {std::cos(angle), std::sin(angle)};
}

inline Vec2 pointOnCircle(Vec2 center, double radius, double angle) {
    const Vec2 direction = unitDirection(angle);
    return {
        center.x + direction.x * radius,
        center.y + direction.y * radius,
    };
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

#if LAB_CHECKPOINT >= 3
inline double advanceAngle(double angle, double angularSpeed, double deltaTime) {
    if (!std::isfinite(angularSpeed) || !std::isfinite(deltaTime)) {
        return normalizeAngle(angle);
    }
    return normalizeAngle(angle + angularSpeed * deltaTime);
}

inline double periodFromAngularSpeed(double angularSpeed) {
    if (!std::isfinite(angularSpeed) || std::abs(angularSpeed) <= 1e-12) {
        return std::numeric_limits<double>::infinity();
    }
    return kTau / std::abs(angularSpeed);
}
#endif

#if LAB_CHECKPOINT >= 5
struct WaveSample {
    double time{};
    double sine{};
    double cosine{};
};

inline WaveSample sampleWave(double time, double angle) {
    const Vec2 direction = unitDirection(angle);
    return {time, direction.y, direction.x};
}

inline void appendWaveSample(std::vector<WaveSample>& samples, WaveSample sample, std::size_t maximumSamples) {
    if (maximumSamples == 0) {
        samples.clear();
        return;
    }
    samples.push_back(sample);
    if (samples.size() > maximumSamples) {
        samples.erase(samples.begin());
    }
}

inline double mapSampleTimeToX(double sampleTime, double newestTime, double visibleDuration, double left, double right) {
    if (!std::isfinite(sampleTime) || !std::isfinite(newestTime) ||
        !std::isfinite(visibleDuration) || visibleDuration <= 0.0) {
        return left;
    }
    const double oldestTime = newestTime - visibleDuration;
    if (sampleTime <= oldestTime) {
        return left;
    }
    if (sampleTime >= newestTime) {
        return right;
    }
    const double progress = (sampleTime - oldestTime) / visibleDuration;
    return left + (right - left) * progress;
}
#endif

#if LAB_CHECKPOINT >= 6
inline double angleFromDirection(Vec2 direction) {
    if (!std::isfinite(direction.x) || !std::isfinite(direction.y)) {
        return 0.0;
    }
    if (std::abs(direction.x) <= 1e-12 && std::abs(direction.y) <= 1e-12) {
        return 0.0;
    }
    return normalizeAngle(std::atan2(direction.y, direction.x));
}
#endif

} // namespace lab
#endif
