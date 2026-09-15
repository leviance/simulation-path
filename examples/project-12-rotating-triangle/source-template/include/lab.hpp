#pragma once

#include <algorithm>
#include <array>
#include <cmath>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

namespace lab {
// Project 12 giữ projection nền từ Project 11 để tập trung vào rotation của model.
constexpr double kPi = 3.14159265358979323846;

struct Vec2 {
    double x{};
    double y{};
};

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline Vec3 add(Vec3 left, Vec3 right) {
    return {left.x + right.x, left.y + right.y, left.z + right.z};
}

inline Vec3 subtract(Vec3 left, Vec3 right) {
    return {left.x - right.x, left.y - right.y, left.z - right.z};
}

inline double magnitude(Vec3 vector) {
    return std::hypot(vector.x, vector.y, vector.z);
}

struct Camera3D {
    Vec3 position{};
};

struct PerspectiveLens {
    double verticalFovRadians{60.0 * kPi / 180.0};
};

enum class ProjectionStatus {
    Visible,
    BehindCamera,
    BeforeNearPlane,
    OutsideFrustum,
};

struct ProjectionResult {
    ProjectionStatus status{ProjectionStatus::BehindCamera};
    Vec3 cameraPoint{};
    Vec2 ndc{};
    Vec2 screen{};
};

inline Vec3 worldToCamera(Vec3 worldPoint, const Camera3D& camera) {
    return subtract(worldPoint, camera.position);
}

inline Vec2 cameraToNdc(Vec3 cameraPoint, const PerspectiveLens& lens, double aspectRatio) {
    const double focalScale = 1.0 / std::tan(lens.verticalFovRadians * 0.5);
    return {
        cameraPoint.x * focalScale / (cameraPoint.z * aspectRatio),
        cameraPoint.y * focalScale / cameraPoint.z,
    };
}

inline Vec2 ndcToScreen(Vec2 ndc, int width, int height) {
    return {
        (ndc.x + 1.0) * 0.5 * width,
        (1.0 - ndc.y) * 0.5 * height,
    };
}

inline ProjectionResult projectPerspective(
    Vec3 worldPoint,
    const Camera3D& camera,
    const PerspectiveLens& lens,
    double nearPlane,
    int width,
    int height
) {
    ProjectionResult result{};
    result.cameraPoint = worldToCamera(worldPoint, camera);
    if (result.cameraPoint.z <= 0.0) {
        result.status = ProjectionStatus::BehindCamera;
        return result;
    }
    if (result.cameraPoint.z < nearPlane) {
        result.status = ProjectionStatus::BeforeNearPlane;
        return result;
    }

    result.ndc = cameraToNdc(result.cameraPoint, lens, double(width) / double(height));
    result.screen = ndcToScreen(result.ndc, width, height);
    if (std::abs(result.ndc.x) > 1.0 || std::abs(result.ndc.y) > 1.0) {
        result.status = ProjectionStatus::OutsideFrustum;
        return result;
    }
    result.status = ProjectionStatus::Visible;
    return result;
}

#if LAB_CHECKPOINT >= 1
// Ba vertex được project riêng; chỉ một TriangleProjection hoàn chỉnh mới được nối cạnh.
struct Triangle3 {
    Vec3 a{};
    Vec3 b{};
    Vec3 c{};
};

struct TriangleProjection {
    bool visible{};
    ProjectionResult a{};
    ProjectionResult b{};
    ProjectionResult c{};
};

inline Triangle3 defaultWorldTriangle() {
    return {
        {-1.4, -0.9, 5.7},
        {1.3, -0.7, 6.4},
        {0.1, 1.6, 5.9},
    };
}

inline TriangleProjection projectTriangle(
    const Triangle3& triangle,
    const Camera3D& camera,
    const PerspectiveLens& lens,
    double nearPlane,
    int width,
    int height
) {
    TriangleProjection result{};
    result.a = projectPerspective(triangle.a, camera, lens, nearPlane, width, height);
    result.b = projectPerspective(triangle.b, camera, lens, nearPlane, width, height);
    result.c = projectPerspective(triangle.c, camera, lens, nearPlane, width, height);
    result.visible = result.a.status == ProjectionStatus::Visible &&
        result.b.status == ProjectionStatus::Visible &&
        result.c.status == ProjectionStatus::Visible;
    return result;
}
#endif

#if LAB_CHECKPOINT >= 2
// Local triangle đặt centroid tại gốc; modelPosition chịu trách nhiệm đưa nó về world space.
inline Vec3 triangleCentroid(const Triangle3& triangle) {
    return {
        (triangle.a.x + triangle.b.x + triangle.c.x) / 3.0,
        (triangle.a.y + triangle.b.y + triangle.c.y) / 3.0,
        (triangle.a.z + triangle.b.z + triangle.c.z) / 3.0,
    };
}

inline Triangle3 toLocalTriangle(const Triangle3& triangle) {
    const Vec3 pivot = triangleCentroid(triangle);
    return {
        subtract(triangle.a, pivot),
        subtract(triangle.b, pivot),
        subtract(triangle.c, pivot),
    };
}

inline Triangle3 translateTriangle(const Triangle3& triangle, Vec3 translation) {
    return {
        add(triangle.a, translation),
        add(triangle.b, translation),
        add(triangle.c, translation),
    };
}
#endif

#if LAB_CHECKPOINT >= 3
// Rotation X là rotation 2D của cặp Y/Z; thành phần X được giữ nguyên.
inline Vec3 rotateX(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        point.x,
        cosine * point.y - sine * point.z,
        sine * point.y + cosine * point.z,
    };
}

inline Triangle3 rotateTriangleX(const Triangle3& triangle, double angle) {
    return {
        rotateX(triangle.a, angle),
        rotateX(triangle.b, angle),
        rotateX(triangle.c, angle),
    };
}
#endif

#if LAB_CHECKPOINT >= 4
// EulerAngles dùng radian; RotationOrder ghi rõ phép nào được áp dụng trước.
struct EulerAngles {
    double pitch{};
    double yaw{};
    double roll{};
};

enum class RotationOrder {
    Xyz,
    Zyx,
};

inline Vec3 rotateY(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        cosine * point.x + sine * point.z,
        point.y,
        -sine * point.x + cosine * point.z,
    };
}

inline Vec3 rotateZ(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        cosine * point.x - sine * point.y,
        sine * point.x + cosine * point.y,
        point.z,
    };
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
    return {
        rotateEuler(triangle.a, angles, order),
        rotateEuler(triangle.b, angles, order),
        rotateEuler(triangle.c, angles, order),
    };
}
#endif

#if LAB_CHECKPOINT >= 5
// Mouse delta điều khiển orientation, còn pitch được giữ khỏi hai cực ±90°.
inline EulerAngles applyMouseDrag(
    EulerAngles angles,
    double deltaX,
    double deltaY,
    double sensitivity
) {
    constexpr double pitchLimit = 89.0 * kPi / 180.0;
    angles.yaw += deltaX * sensitivity;
    angles.pitch -= deltaY * sensitivity;
    angles.pitch = std::clamp(angles.pitch, -pitchLimit, pitchLimit);
    return angles;
}
#endif

#if LAB_CHECKPOINT >= 6
// Inverse chạy các rotation ngược dấu theo thứ tự đảo lại.
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
    return {
        magnitude(subtract(triangle.b, triangle.a)),
        magnitude(subtract(triangle.c, triangle.b)),
        magnitude(subtract(triangle.a, triangle.c)),
    };
}

inline double maximumEdgeLengthError(const Triangle3& original, const Triangle3& rotated) {
    const std::array<double, 3> before = triangleEdgeLengths(original);
    const std::array<double, 3> after = triangleEdgeLengths(rotated);
    double error = 0.0;
    for (std::size_t index = 0; index < before.size(); ++index) {
        error = std::max(error, std::abs(before[index] - after[index]));
    }
    return error;
}

inline double rotationRoundTripError(Vec3 point, EulerAngles angles, RotationOrder order) {
    const Vec3 rotated = rotateEuler(point, angles, order);
    const Vec3 restored = inverseRotateEuler(rotated, angles, order);
    return magnitude(subtract(restored, point));
}

inline EulerAngles advanceEulerAngles(
    EulerAngles angles,
    EulerAngles angularVelocity,
    double deltaTime
) {
    const double safeDeltaTime = std::clamp(deltaTime, 0.0, 0.1);
    angles.pitch += angularVelocity.pitch * safeDeltaTime;
    angles.yaw += angularVelocity.yaw * safeDeltaTime;
    angles.roll += angularVelocity.roll * safeDeltaTime;
    return angles;
}
#endif
} // namespace lab
