#pragma once

#include <algorithm>
#include <cmath>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

namespace lab {
#if LAB_CHECKPOINT >= 1
// Các kiểu toán học giữ world unit; phần SDL chỉ đổi kết quả cuối sang pixel.
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

inline Vec2 previewPoint(Vec3 point, double pixelsPerUnit) {
    return {point.x * pixelsPerUnit, point.y * pixelsPerUnit};
}
#endif

#if LAB_CHECKPOINT >= 2
// Camera chưa xoay nên đổi hệ tọa độ chỉ cần tịnh tiến gốc.
struct Camera3D {
    Vec3 position{};
};

inline Vec3 add(Vec3 left, Vec3 right) {
    return {left.x + right.x, left.y + right.y, left.z + right.z};
}

inline Vec3 subtract(Vec3 left, Vec3 right) {
    return {left.x - right.x, left.y - right.y, left.z - right.z};
}

inline Vec3 worldToCamera(Vec3 worldPoint, const Camera3D& camera) {
    return subtract(worldPoint, camera.position);
}

inline Vec3 cameraToWorld(Vec3 cameraPoint, const Camera3D& camera) {
    return add(cameraPoint, camera.position);
}
#endif

#if LAB_CHECKPOINT >= 3
// Caller phải kiểm tra depth hợp lệ trước khi thực hiện phép chia này.
inline Vec2 perspectiveDivide(Vec3 cameraPoint) {
    return {cameraPoint.x / cameraPoint.z, cameraPoint.y / cameraPoint.z};
}
#endif

#if LAB_CHECKPOINT >= 4
// Lens dùng vertical FOV; aspect ratio chỉ điều chỉnh thành phần ngang.
struct PerspectiveLens {
    double verticalFovRadians{60.0 * kPi / 180.0};
};

inline double verticalFocalScale(const PerspectiveLens& lens) {
    return 1.0 / std::tan(lens.verticalFovRadians * 0.5);
}

inline Vec2 cameraToNdc(Vec3 cameraPoint, const PerspectiveLens& lens, double aspectRatio) {
    const double focalScale = verticalFocalScale(lens);
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

inline Vec2 screenToNdc(Vec2 screen, int width, int height) {
    return {
        screen.x * 2.0 / width - 1.0,
        1.0 - screen.y * 2.0 / height,
    };
}
#endif

#if LAB_CHECKPOINT >= 5
// Status giúp render phân biệt dữ liệu không nhìn thấy mà không clamp giả vào viewport.
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

inline bool isInsideNdc(Vec2 ndc) {
    return std::abs(ndc.x) <= 1.0 && std::abs(ndc.y) <= 1.0;
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

    const double aspectRatio = double(width) / double(height);
    result.ndc = cameraToNdc(result.cameraPoint, lens, aspectRatio);
    result.screen = ndcToScreen(result.ndc, width, height);
    if (!isInsideNdc(result.ndc)) {
        result.status = ProjectionStatus::OutsideFrustum;
        return result;
    }
    result.status = ProjectionStatus::Visible;
    return result;
}
#endif

#if LAB_CHECKPOINT >= 6
// Một pixel chỉ đổi ngược được thành point 3D khi caller cung cấp depth.
inline Vec3 screenToCameraAtDepth(
    Vec2 screen,
    double cameraDepth,
    const PerspectiveLens& lens,
    int width,
    int height
) {
    const Vec2 ndc = screenToNdc(screen, width, height);
    const double tanHalfFov = std::tan(lens.verticalFovRadians * 0.5);
    const double aspectRatio = double(width) / double(height);
    return {
        ndc.x * cameraDepth * tanHalfFov * aspectRatio,
        ndc.y * cameraDepth * tanHalfFov,
        cameraDepth,
    };
}

inline Vec3 flightPoint(double timeSeconds) {
    return {
        std::sin(timeSeconds * 0.9) * 2.2,
        std::cos(timeSeconds * 1.3) * 1.3,
        4.5 + std::sin(timeSeconds * 0.55) * 3.0,
    };
}

inline double advanceFlightTime(double current, double deltaTime) {
    const double safeDeltaTime = std::clamp(deltaTime, 0.0, 0.1);
    return current + safeDeltaTime;
}

inline double projectionRoundTripError(
    Vec3 worldPoint,
    const Camera3D& camera,
    const PerspectiveLens& lens,
    int width,
    int height
) {
    const Vec3 cameraPoint = worldToCamera(worldPoint, camera);
    if (cameraPoint.z <= 0.0) {
        return 0.0;
    }
    const Vec2 ndc = cameraToNdc(cameraPoint, lens, double(width) / double(height));
    const Vec2 screen = ndcToScreen(ndc, width, height);
    const Vec3 restored = screenToCameraAtDepth(screen, cameraPoint.z, lens, width, height);
    return std::hypot(
        restored.x - cameraPoint.x,
        restored.y - cameraPoint.y,
        restored.z - cameraPoint.z
    );
}
#endif
} // namespace lab
