#pragma once
#include "projection.hpp"
#include <array>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

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
#if LAB_CHECKPOINT >= 1
struct Triangle3 {
    Vec3 a{};
    Vec3 b{};
    Vec3 c{};
};

inline Triangle3 defaultWorldTriangle() {
    return {{-1.4, -0.9, 5.7}, {1.3, -0.7, 6.4}, {0.1, 1.6, 5.9}};
}

inline Triangle3 translateTriangle(const Triangle3& triangle, Vec3 translation) {
    return {add(triangle.a, translation), add(triangle.b, translation), add(triangle.c, translation)};
}

struct TriangleProjection {
    std::array<ProjectionResult, 3> vertices{};
    bool allVisible = false;
};

inline TriangleProjection projectTriangle(const Triangle3& triangle, const Camera3D& camera, const PerspectiveLens& lens, const Viewport& viewport) {
    TriangleProjection result;
    result.vertices = {projectPerspective(triangle.a, camera, lens, viewport), projectPerspective(triangle.b, camera, lens, viewport), projectPerspective(triangle.c, camera, lens, viewport)};
    result.allVisible = true;
    for (const auto& vertex : result.vertices) {
        if (vertex.status != ProjectionStatus::Visible) {
            result.allVisible = false;
        }
    }
    return result;
}
#endif
#if LAB_CHECKPOINT >= 2
inline Vec3 triangleCentroid(const Triangle3& triangle) {
    return scale(add(add(triangle.a, triangle.b), triangle.c), 1.0 / 3.0);
}

inline Triangle3 toLocalTriangle(const Triangle3& triangle) {
    const Vec3 pivot = triangleCentroid(triangle);
    return {subtract(triangle.a, pivot), subtract(triangle.b, pivot), subtract(triangle.c, pivot)};
}
#endif
#if LAB_CHECKPOINT >= 3
// X giữ nguyên; cặp (Y,Z) quay như một vector 2D.
inline Vec3 rotateX(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {point.x, cosine * point.y - sine * point.z, sine * point.y + cosine * point.z};
}

inline Triangle3 rotateTriangleX(const Triangle3& triangle, double angle) {
    return {rotateX(triangle.a, angle), rotateX(triangle.b, angle), rotateX(triangle.c, angle)};
}
#endif
#if LAB_CHECKPOINT >= 4
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

inline Triangle3 rotateTriangle(const Triangle3& triangle, EulerAngles angles, RotationOrder order) {
    return {rotateEuler(triangle.a, angles, order), rotateEuler(triangle.b, angles, order), rotateEuler(triangle.c, angles, order)};
}
#endif
#if LAB_CHECKPOINT >= 5
// Normal được suy từ hình học đã quay, không từ vị trí ảnh trên màn hình.
inline Vec3 triangleRawNormal(const Triangle3& triangle) {
    return cross(subtract(triangle.b, triangle.a), subtract(triangle.c, triangle.a));
}

inline Vec3 triangleUnitNormal(const Triangle3& triangle) {
    return normalize(triangleRawNormal(triangle));
}

inline bool normalHasDirection(const Triangle3& triangle) {
    return magnitude(triangleRawNormal(triangle)) > 1e-10;
}
#endif
#if LAB_CHECKPOINT >= 6
// Đây là xoay object, không phải FPS camera: không khóa pitch tại ±89°.
inline EulerAngles applyMouseDrag(EulerAngles angles, double deltaX, double deltaY, double sensitivity) {
    if (!finiteAngles(angles) || !std::isfinite(deltaX) || !std::isfinite(deltaY) || !std::isfinite(sensitivity) || sensitivity < 0.002 || sensitivity > 0.02) {
        return angles;
    }
    angles.yaw = wrapAngle(angles.yaw + deltaX * sensitivity);
    angles.pitch = wrapAngle(angles.pitch - deltaY * sensitivity);
    return angles;
}
#endif
#if LAB_CHECKPOINT >= 7
inline EulerAngles advanceEulerAngles(EulerAngles angles, EulerAngles velocity, double deltaTime) {
    if (!finiteAngles(angles) || !finiteAngles(velocity) || !std::isfinite(deltaTime) || deltaTime <= 0.0) {
        return angles;
    }
    const double step = std::min(deltaTime, 0.1);
    angles.pitch = wrapAngle(angles.pitch + velocity.pitch * step);
    angles.yaw = wrapAngle(angles.yaw + velocity.yaw * step);
    angles.roll = wrapAngle(angles.roll + velocity.roll * step);
    return angles;
}
#endif
#if LAB_CHECKPOINT >= 8
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

inline std::array<double, 3> triangleEdgeLengths(const Triangle3& triangle) {
    return {magnitude(subtract(triangle.b, triangle.a)), magnitude(subtract(triangle.c, triangle.b)), magnitude(subtract(triangle.a, triangle.c))};
}

inline double maximumEdgeLengthError(const Triangle3& original, const Triangle3& rotated) {
    const auto before = triangleEdgeLengths(original);
    const auto after = triangleEdgeLengths(rotated);
    double error = 0.0;
    for (std::size_t i = 0; i < before.size(); ++i) {
        error = std::max(error, std::abs(before[i] - after[i]));
    }
    return error;
}

inline double rotationRoundTripError(Vec3 point, EulerAngles angles, RotationOrder order) {
    return magnitude(subtract(inverseRotateEuler(rotateEuler(point, angles, order), angles, order), point));
}

inline double normalRotationError(const Triangle3& local, const Triangle3& rotated, EulerAngles angles, RotationOrder order) {
    const Vec3 expected = rotateEuler(triangleUnitNormal(local), angles, order);
    return magnitude(subtract(triangleUnitNormal(rotated), expected));
}
#endif
} // namespace lab
