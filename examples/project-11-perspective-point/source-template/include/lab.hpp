#pragma once
#include <algorithm>
#include <cmath>
#include <optional>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

namespace lab {
constexpr double kPi = 3.14159265358979323846;

// Dữ liệu world/camera giữ đơn vị world; screen mới dùng pixel.
struct Vec2 {
    double x{};
    double y{};
};

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline bool finite(Vec3 p) {
    return std::isfinite(p.x) && std::isfinite(p.y) && std::isfinite(p.z);
}

struct Camera3D {
    Vec3 position{};
};

struct PerspectiveLens {
    double verticalFovRadians = kPi / 3.0;
    double nearPlane = 0.5;
    double farPlane = 16.0;
};

struct Viewport {
    double x = 30.0;
    double y = 107.5;
    double width = 1040.0;
    double height = 585.0;
};
#if LAB_CHECKPOINT >= 1
inline Vec2 previewPoint(Vec3 point) {
    return {point.x * 70.0, point.y * 70.0};
}
#endif
#if LAB_CHECKPOINT >= 2
// Camera nhìn theo +Z, Y lên trên và chưa xoay: chỉ cần đổi gốc.
inline Vec3 worldToCamera(Vec3 worldPoint, const Camera3D& camera) {
    return {worldPoint.x - camera.position.x, worldPoint.y - camera.position.y, worldPoint.z - camera.position.z};
}

inline Vec3 cameraToWorld(Vec3 point, const Camera3D& camera) {
    return {point.x + camera.position.x, point.y + camera.position.y, point.z + camera.position.z};
}
#endif
#if LAB_CHECKPOINT >= 3
// Chỉ gọi sau khi xác nhận depth nằm trong [near, far].
inline Vec2 perspectiveDivide(Vec3 cameraPoint) {
    return {cameraPoint.x / cameraPoint.z, cameraPoint.y / cameraPoint.z};
}
enum class ProjectionStatus {
    Visible,
    BehindCamera,
    BeforeNearPlane,
    BeyondFarPlane,
    OutsideFrustum,
    Invalid,
};

struct ProjectionResult {
    ProjectionStatus status = ProjectionStatus::Invalid;
    Vec3 cameraPoint{};
    std::optional<Vec2> ndc;
    std::optional<Vec2> screen;
};

inline bool validLens(const PerspectiveLens& lens, const Viewport& viewport) {
    return std::isfinite(lens.verticalFovRadians) && lens.verticalFovRadians > 0.0 && lens.verticalFovRadians < kPi &&
        std::isfinite(lens.nearPlane) && std::isfinite(lens.farPlane) && lens.nearPlane > 0.0 && lens.farPlane > lens.nearPlane &&
        std::isfinite(viewport.x) && std::isfinite(viewport.y) && std::isfinite(viewport.width) && std::isfinite(viewport.height) && viewport.width > 0.0 && viewport.height > 0.0;
}
#endif
#if LAB_CHECKPOINT >= 4
inline double verticalFocalScale(const PerspectiveLens& lens) {
    return 1.0 / std::tan(lens.verticalFovRadians * 0.5);
}

inline Vec2 cameraToNdc(Vec3 cameraPoint, const PerspectiveLens& lens, double aspectRatio) {
    const Vec2 divided = perspectiveDivide(cameraPoint);
    const double focalScale = verticalFocalScale(lens);
    return {divided.x * focalScale / aspectRatio, divided.y * focalScale};
}

// Đây là tọa độ liên tục trên cạnh viewport, chưa phải chỉ số pixel.
inline Vec2 ndcToScreen(Vec2 ndc, const Viewport& viewport) {
    return {viewport.x + (ndc.x + 1.0) * 0.5 * viewport.width, viewport.y + (1.0 - ndc.y) * 0.5 * viewport.height};
}
#endif
#if LAB_CHECKPOINT >= 3
inline bool isInsideNdc(Vec2 ndc) {
    return std::abs(ndc.x) <= 1.0 && std::abs(ndc.y) <= 1.0;
}

inline ProjectionResult projectPerspective(Vec3 worldPoint, const Camera3D& camera, const PerspectiveLens& lens, const Viewport& viewport) {
    ProjectionResult result;
    if (!finite(worldPoint) || !finite(camera.position) || !validLens(lens, viewport)) {
        return result;
    }
    const Vec3 cameraPoint = worldToCamera(worldPoint, camera);
    result.cameraPoint = cameraPoint;
    if (!finite(cameraPoint)) {
        return result;
    }
    // Các guard đã có từ bài 3 để checkpoint không chia cho 0.
    // Bài 5 giải thích và đưa từng trạng thái ra giao diện.
    if (cameraPoint.z <= 0.0) {
        result.status = ProjectionStatus::BehindCamera;
        return result;
    }
    if (cameraPoint.z < lens.nearPlane) {
        result.status = ProjectionStatus::BeforeNearPlane;
        return result;
    }
    if (cameraPoint.z > lens.farPlane) {
        result.status = ProjectionStatus::BeyondFarPlane;
        return result;
    }
    const double aspectRatio = viewport.width / viewport.height;
#if LAB_CHECKPOINT >= 4
    const Vec2 ndc = cameraToNdc(cameraPoint, lens, aspectRatio);
    const Vec2 screen = ndcToScreen(ndc, viewport);
#else
    const Vec2 divided = perspectiveDivide(cameraPoint);
    // Ở bài 3 mặt phẳng ảnh tạm có focal scale = 1.
    const Vec2 ndc{divided.x / aspectRatio, divided.y};
    const Vec2 screen{viewport.x + viewport.width * 0.5 + ndc.x * viewport.width * 0.5, viewport.y + viewport.height * 0.5 - ndc.y * viewport.height * 0.5};
#endif
    if (!std::isfinite(ndc.x) || !std::isfinite(ndc.y) || !std::isfinite(screen.x) || !std::isfinite(screen.y)) {
        return result;
    }
    result.ndc = ndc;
    result.screen = screen;
    result.status = ProjectionStatus::OutsideFrustum;
    if (isInsideNdc(ndc)) {
        result.status = ProjectionStatus::Visible;
    }
    return result;
}

#endif
#if LAB_CHECKPOINT >= 5
// Cắt đoạn 3D ở near/far TRƯỚC khi chia. Trả endpoint đúng trên plane.
inline bool clipDepth(Vec3& start, Vec3& end, const PerspectiveLens& lens) {
    if (!finite(start) || !finite(end) || !std::isfinite(lens.nearPlane) || !std::isfinite(lens.farPlane) || lens.nearPlane <= 0.0 || lens.farPlane <= lens.nearPlane) {
        return false;
    }

    struct DepthPlane {
        double depth;
        double direction;
    };

    for (const auto& plane : {DepthPlane{lens.nearPlane, 1.0}, DepthPlane{lens.farPlane, -1.0}}) {
        const double a = (start.z - plane.depth) * plane.direction;
        const double b = (end.z - plane.depth) * plane.direction;
        if (!std::isfinite(a) || !std::isfinite(b)) {
            return false;
        }
        if (a < 0.0 && b < 0.0) {
            return false;
        }
        if (a < 0.0 || b < 0.0) {
            const double denominator = a - b;
            if (!std::isfinite(denominator)) {
                return false;
            }
            const double t = a / denominator;
            Vec3 hit{start.x + t * (end.x - start.x), start.y + t * (end.y - start.y), plane.depth};
            if (!finite(hit)) {
                return false;
            }
            if (a < 0.0) {
                start = hit;
            } else {
                end = hit;
            }
        }
    }
    return true;
}
#endif
#if LAB_CHECKPOINT >= 6
inline Vec3 flightPoint(double timeSeconds) {
    return {std::sin(0.9 * timeSeconds) * 2.2, std::cos(1.3 * timeSeconds) * 1.3, 6.0 + std::sin(0.55 * timeSeconds) * 4.0};
}

inline double advanceFlightTime(double current, double deltaTime) {
    if (!std::isfinite(current) || !std::isfinite(deltaTime) || deltaTime <= 0.0) {
        return current;
    }
    return current + std::min(deltaTime, 0.1);
}
#endif
#if LAB_CHECKPOINT >= 7
// Một screen point là một tia; cần depth mới chọn được duy nhất một điểm.
inline std::optional<Vec3> screenToCameraAtDepth(Vec2 screen, double depth, const PerspectiveLens& lens, const Viewport& viewport) {
    if (!validLens(lens, viewport) || !std::isfinite(screen.x) || !std::isfinite(screen.y) || !std::isfinite(depth) || depth < lens.nearPlane || depth > lens.farPlane) {
        return std::nullopt;
    }
    const Vec2 ndc{(screen.x - viewport.x) * 2.0 / viewport.width - 1.0, 1.0 - (screen.y - viewport.y) * 2.0 / viewport.height};
    const double tanHalfFov = std::tan(lens.verticalFovRadians * 0.5);
    const double aspectRatio = viewport.width / viewport.height;
    const Vec3 point{ndc.x * depth * tanHalfFov * aspectRatio, ndc.y * depth * tanHalfFov, depth};
    if (!finite(point)) {
        return std::nullopt;
    }
    return point;
}
#endif
#if LAB_CHECKPOINT >= 8
inline std::optional<double> projectionRoundTripError(Vec3 point, const Camera3D& camera, const PerspectiveLens& lens, const Viewport& viewport) {
    const ProjectionResult projected = projectPerspective(point, camera, lens, viewport);
    if (projected.status != ProjectionStatus::Visible || !projected.screen) {
        return std::nullopt;
    }
    const auto restored = screenToCameraAtDepth(*projected.screen, projected.cameraPoint.z, lens, viewport);
    if (!restored) {
        return std::nullopt;
    }
    return std::hypot(restored->x - projected.cameraPoint.x, restored->y - projected.cameraPoint.y, restored->z - projected.cameraPoint.z);
}
#endif
} // namespace lab
