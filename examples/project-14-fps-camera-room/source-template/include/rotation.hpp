#pragma once
#include "projection.hpp"

namespace lab {
// Rotation dùng radian và trục world cố định, chưa dùng ma trận/quaternion.
inline Vec3 add(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 subtract(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 scale(Vec3 p, double factor) {
    return {p.x * factor, p.y * factor, p.z * factor};
}

inline double magnitude(Vec3 p) {
    return std::hypot(p.x, p.y, p.z);
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline Vec3 normalize(Vec3 p) {
    const double length = magnitude(p);
    if (!finite(p) || length <= 1e-12) {
        return {};
    }
    return scale(p, 1.0 / length);
}

struct EulerAngles {
    double pitch{};
    double yaw{};
    double roll{};
};
enum class RotationOrder {
    Xyz,
    Zyx,
};

inline bool finiteAngles(EulerAngles angles) {
    return std::isfinite(angles.pitch) && std::isfinite(angles.yaw) && std::isfinite(angles.roll);
}

inline double wrapAngle(double angle) {
    double wrapped = std::fmod(angle, 2.0 * kPi);
    if (wrapped > kPi) {
        wrapped -= 2.0 * kPi;
    }
    if (wrapped < -kPi) {
        wrapped += 2.0 * kPi;
    }
    return wrapped;
}

inline Vec3 rotateX(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {point.x, cosine * point.y - sine * point.z, sine * point.y + cosine * point.z};
}

inline Vec3 rotateY(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {cosine * point.x + sine * point.z, point.y, -sine * point.x + cosine * point.z};
}

inline Vec3 rotateZ(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {cosine * point.x - sine * point.y, sine * point.x + cosine * point.y, point.z};
}

inline Vec3 rotateEuler(Vec3 point, EulerAngles angles, RotationOrder order) {
    if (order == RotationOrder::Zyx) {
        Vec3 rotated = rotateZ(point, angles.roll);
        rotated = rotateY(rotated, angles.yaw);
        return rotateX(rotated, angles.pitch);
    }
    Vec3 rotated = rotateX(point, angles.pitch);
    rotated = rotateY(rotated, angles.yaw);
    return rotateZ(rotated, angles.roll);
}

// Đảo thứ tự thao tác rồi đổi dấu từng góc, không chỉ đổi dấu trong cùng order.
inline Vec3 inverseRotateEuler(Vec3 point, EulerAngles angles, RotationOrder order) {
    if (order == RotationOrder::Zyx) {
        Vec3 restored = rotateX(point, -angles.pitch);
        restored = rotateY(restored, -angles.yaw);
        return rotateZ(restored, -angles.roll);
    }
    Vec3 restored = rotateZ(point, -angles.roll);
    restored = rotateY(restored, -angles.yaw);
    return rotateX(restored, -angles.pitch);
}

} // namespace lab
