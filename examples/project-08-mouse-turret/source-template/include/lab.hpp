#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include <algorithm>
#include <cmath>

namespace lab {
struct Vec2 {
    double x{};
    double y{};
};
inline constexpr double kPi = 3.14159265358979323846;
inline constexpr double kTau = 2.0 * kPi;

#if LAB_CHECKPOINT >= 0
inline Vec2 add(Vec2 a, Vec2 b) {
    return {a.x + b.x, a.y + b.y};
}

inline Vec2 subtract(Vec2 a, Vec2 b) {
    return {a.x - b.x, a.y - b.y};
}

inline Vec2 scale(Vec2 vector, double scalar) {
    return {vector.x * scalar, vector.y * scalar};
}

inline double length(Vec2 vector) {
    return std::hypot(vector.x, vector.y);
}

inline bool hasDirection(Vec2 vector) {
    return std::isfinite(vector.x) && std::isfinite(vector.y) && (vector.x != 0.0 || vector.y != 0.0);
}

// Từ Project 06: scale trước để không bình phương số quá lớn/nhỏ.
inline Vec2 normalize(Vec2 vector) {
    if (!hasDirection(vector)) {
        return {};
    }
    const double largest = std::max(std::abs(vector.x), std::abs(vector.y));
    const Vec2 scaled{vector.x / largest, vector.y / largest};
    const double magnitude = length(scaled);
    return {scaled.x / magnitude, scaled.y / magnitude};
}

inline double normalizeAngle(double angle) {
    if (!std::isfinite(angle)) {
        return 0.0;
    }
    double result = std::fmod(angle, kTau);
    if (result < 0.0) {
        result += kTau;
    }
    if (result >= kTau || result == 0.0) {
        return 0.0;
    }
    return result;
}

inline Vec2 directionFromAngle(double angle) {
    return {std::cos(angle), std::sin(angle)};
}
#endif

#if LAB_CHECKPOINT >= 2
inline double dot(Vec2 a, Vec2 b) {
    return a.x * b.x + a.y * b.y;
}

// Normalize từng vector, không chia cho tích hai độ dài có thể overflow.
inline double cosineBetween(Vec2 a, Vec2 b) {
    if (!hasDirection(a) || !hasDirection(b)) {
        return 0.0;
    }
    return std::clamp(dot(normalize(a), normalize(b)), -1.0, 1.0);
}
#endif

#if LAB_CHECKPOINT >= 3
inline double clampCosine(double value) {
    if (!std::isfinite(value)) {
        return 0.0;
    }
    return std::clamp(value, -1.0, 1.0);
}

inline double angleBetween(Vec2 a, Vec2 b) {
    if (!hasDirection(a) || !hasDirection(b)) {
        return 0.0;
    }
    return std::acos(clampCosine(cosineBetween(a, b)));
}
#endif

#if LAB_CHECKPOINT >= 4
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
inline double crossZ(Vec2 a, Vec2 b) {
    return a.x * b.y - a.y * b.x;
}

inline double signedAngleBetween(Vec2 from, Vec2 to) {
    if (!hasDirection(from) || !hasDirection(to)) {
        return 0.0;
    }
    const Vec2 a = normalize(from);
    const Vec2 b = normalize(to);
    const double sine = crossZ(a, b);
    const double cosine = dot(a, b);
    // Đối nhau chính xác: hai đường đều ngắn; chọn chiều dương, kể cả sine=-0.
    if (sine == 0.0 && cosine < 0.0) {
        return kPi;
    }
    return std::atan2(sine, cosine);
}

inline double rotateTowards(double currentAngle, Vec2 targetDirection, double maximumStep) {
    const double current = normalizeAngle(currentAngle);
    if (!std::isfinite(maximumStep) || maximumStep <= 0.0 || !hasDirection(targetDirection)) {
        return current;
    }
    const double remaining = signedAngleBetween(directionFromAngle(current), targetDirection);
    const double step = std::clamp(remaining, -maximumStep, maximumStep);
    return normalizeAngle(current + step);
}
#endif

#if LAB_CHECKPOINT >= 6
inline bool isWithinViewCone(Vec2 forward, Vec2 targetDirection, double halfAngle) {
    if (!hasDirection(forward) || !hasDirection(targetDirection) || !std::isfinite(halfAngle)) {
        return false;
    }
    const double safeHalfAngle = std::clamp(halfAngle, 0.0, kPi);
    // Dung sai cosine để một điểm đúng biên không chớp màu bởi sai số số thực.
    return cosineBetween(forward, targetDirection) >= std::cos(safeHalfAngle) - 1e-12;
}
#endif
} // namespace lab
