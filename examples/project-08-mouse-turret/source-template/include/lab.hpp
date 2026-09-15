#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 1
#include <cmath>

namespace lab {

// Các phép toán được giữ độc lập với SDL để có thể kiểm tra bằng CTest.
inline constexpr double kPi = 3.14159265358979323846;
inline constexpr double kTau = 2.0 * kPi;
inline constexpr double kDirectionEpsilon = 1e-12;

struct Vec2 {
    double x{};
    double y{};
};

inline Vec2 add(Vec2 left, Vec2 right) {
    return {left.x + right.x, left.y + right.y};
}

inline Vec2 subtract(Vec2 left, Vec2 right) {
    return {left.x - right.x, left.y - right.y};
}

inline Vec2 scale(Vec2 vector, double scalar) {
    return {vector.x * scalar, vector.y * scalar};
}

inline double length(Vec2 vector) {
    return std::hypot(vector.x, vector.y);
}

inline bool hasDirection(Vec2 vector) {
    const double magnitude = length(vector);
    return std::isfinite(magnitude) && magnitude > kDirectionEpsilon;
}

inline Vec2 normalize(Vec2 vector) {
    const double magnitude = length(vector);
    if (!std::isfinite(magnitude) || magnitude <= kDirectionEpsilon) {
        return {};
    }
    return scale(vector, 1.0 / magnitude);
}

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

inline Vec2 directionFromAngle(double angle) {
    return {std::cos(angle), std::sin(angle)};
}

#if LAB_CHECKPOINT >= 2
// Dot product thu hai vector thành một scalar.
inline double dot(Vec2 left, Vec2 right) {
    return left.x * right.x + left.y * right.y;
}
#endif

#if LAB_CHECKPOINT >= 3
inline double clampCosine(double value) {
    if (!std::isfinite(value)) {
        return 0.0;
    }
    if (value < -1.0) {
        return -1.0;
    }
    if (value > 1.0) {
        return 1.0;
    }
    return value;
}

inline double cosineBetween(Vec2 left, Vec2 right) {
    if (!hasDirection(left) || !hasDirection(right)) {
        return 0.0;
    }
    return clampCosine(dot(left, right) / (length(left) * length(right)));
}

inline double angleBetween(Vec2 left, Vec2 right) {
    if (!hasDirection(left) || !hasDirection(right)) {
        return 0.0;
    }
    return std::acos(cosineBetween(left, right));
}
#endif

#if LAB_CHECKPOINT >= 4
// Projection và rejection tách vector thành hai thành phần vuông góc.
inline double scalarProjection(Vec2 vector, Vec2 onto) {
    if (!hasDirection(onto)) {
        return 0.0;
    }
    return dot(vector, normalize(onto));
}

inline Vec2 vectorProjection(Vec2 vector, Vec2 onto) {
    if (!hasDirection(onto)) {
        return {};
    }
    const Vec2 unitOnto = normalize(onto);
    return scale(unitOnto, dot(vector, unitOnto));
}

inline Vec2 rejection(Vec2 vector, Vec2 onto) {
    return subtract(vector, vectorProjection(vector, onto));
}
#endif

#if LAB_CHECKPOINT >= 5
// crossZ giữ dấu trái/phải cần thiết cho góc quay.
inline double crossZ(Vec2 left, Vec2 right) {
    return left.x * right.y - left.y * right.x;
}

inline double signedAngleBetween(Vec2 from, Vec2 to) {
    if (!hasDirection(from) || !hasDirection(to)) {
        return 0.0;
    }
    const Vec2 fromUnit = normalize(from);
    const Vec2 toUnit = normalize(to);
    return std::atan2(crossZ(fromUnit, toUnit), dot(fromUnit, toUnit));
}

inline double rotateTowards(double currentAngle, Vec2 targetDirection, double maximumStep) {
    if (!std::isfinite(maximumStep) || maximumStep <= 0.0 || !hasDirection(targetDirection)) {
        return normalizeAngle(currentAngle);
    }
    const Vec2 currentDirection = directionFromAngle(currentAngle);
    const double remainingAngle = signedAngleBetween(currentDirection, targetDirection);
    double step = remainingAngle;
    if (step < -maximumStep) {
        step = -maximumStep;
    }
    if (step > maximumStep) {
        step = maximumStep;
    }
    return normalizeAngle(currentAngle + step);
}
#endif

#if LAB_CHECKPOINT >= 6
inline bool isWithinViewCone(Vec2 forward, Vec2 toTarget, double halfAngle) {
    if (!hasDirection(forward) || !hasDirection(toTarget) || !std::isfinite(halfAngle)) {
        return false;
    }
    double safeHalfAngle = halfAngle;
    if (safeHalfAngle < 0.0) {
        safeHalfAngle = 0.0;
    }
    if (safeHalfAngle > kPi) {
        safeHalfAngle = kPi;
    }
    return cosineBetween(forward, toTarget) >= std::cos(safeHalfAngle);
}
#endif

} // namespace lab
#endif
