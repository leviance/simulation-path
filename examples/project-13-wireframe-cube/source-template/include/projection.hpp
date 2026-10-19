#pragma once
#include <algorithm>
#include <cmath>
#include <optional>

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

// Camera nhìn theo +Z, Y lên trên và chưa xoay: chỉ cần đổi gốc.
inline Vec3 worldToCamera(Vec3 worldPoint, const Camera3D& camera) {
    return {worldPoint.x - camera.position.x, worldPoint.y - camera.position.y, worldPoint.z - camera.position.z};
}

inline Vec3 cameraToWorld(Vec3 point, const Camera3D& camera) {
    return {point.x + camera.position.x, point.y + camera.position.y, point.z + camera.position.z};
}

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
    // Kế thừa guard của P11: depth hợp lệ rồi mới perspective divide.
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
    const Vec2 ndc = cameraToNdc(cameraPoint, lens, aspectRatio);
    const Vec2 screen = ndcToScreen(ndc, viewport);
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

// Cắt đoạn 3D ở near/far TRƯỚC khi chia. Trả endpoint đúng trên plane.
inline bool clipDepth(Vec3& start, Vec3& end, const PerspectiveLens& lens) {
    if (!finite(start) || !finite(end)) {
        return false;
    }
    for (const auto& plane : {Vec2{lens.nearPlane, 1.0}, Vec2{lens.farPlane, -1.0}}) {
        const double a = (start.z - plane.x) * plane.y;
        const double b = (end.z - plane.x) * plane.y;
        if (a < 0.0 && b < 0.0) {
            return false;
        }
        if (a < 0.0 || b < 0.0) {
            const double t = a / (a - b);
            Vec3 hit{start.x + t * (end.x - start.x), start.y + t * (end.y - start.y), plane.x};
            if (a < 0.0) {
                start = hit;
            } else {
                end = hit;
            }
        }
    }
    return true;
}
} // namespace lab
