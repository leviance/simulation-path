#pragma once
#include "lab.hpp"

namespace lab {
enum class ProjectionMode {
    Perspective,
    Orthographic,
};

struct Scene {
    Camera3D camera{};
    PerspectiveLens lens{};
    Vec3 position{0.0, 0.0, 6.0};
    EulerAngles angles{};
    RotationOrder order = RotationOrder::Xyz;
    ProjectionMode projection = ProjectionMode::Perspective;
    double halfExtent = 1.2;
    double zoom = 1.0;
    double sensitivity = 0.008;
    bool paused = true;
    bool debug = true;
    bool depthCue = true;
};

// Toàn bộ bảng logic là viewport. HUD chỉ phủ lên ảnh, không thu nhỏ cảnh.
inline Viewport viewportFor() {
    return {0.0, 0.0, 1100.0, 800.0};
}

inline void applyPreset(Scene& scene, int index) {
    scene = {};
#if LAB_CHECKPOINT >= 3
    scene.angles = {0.3, 0.5, 0.0};
#endif
    if (index == 1) {
        scene.angles = {};
    }
    if (index == 2) {
        scene.position.z = 10.0;
    }
    if (index == 3) {
        scene.position.z = 0.7;
    }
    if (index == 4) {
        scene.position = {5.0, 0.0, 3.0};
    }
}

#if LAB_CHECKPOINT >= 4
// Perspective và ortho có cùng kích thước ở mặt phẳng tham chiếu Z=6.
inline PerspectiveLens zoomedLens(const Scene& scene) {
    PerspectiveLens lens = scene.lens;
    lens.verticalFovRadians = 2.0 * std::atan(std::tan(scene.lens.verticalFovRadians * 0.5) / scene.zoom);
    return lens;
}

inline ProjectionResult projectOrthographic(Vec3 world, const Scene& scene) {
    ProjectionResult result;
    if (!finite(world) || !finite(scene.camera.position) || !validLens(scene.lens, viewportFor()) || !std::isfinite(scene.zoom) || scene.zoom < 0.5 || scene.zoom > 2.0) {
        return result;
    }
    result.cameraPoint = worldToCamera(world, scene.camera);
    if (!finite(result.cameraPoint)) {
        return result;
    }
    if (result.cameraPoint.z <= 0.0) {
        result.status = ProjectionStatus::BehindCamera;
        return result;
    }
    if (result.cameraPoint.z < scene.lens.nearPlane) {
        result.status = ProjectionStatus::BeforeNearPlane;
        return result;
    }
    if (result.cameraPoint.z > scene.lens.farPlane) {
        result.status = ProjectionStatus::BeyondFarPlane;
        return result;
    }
    const double halfHeight = 6.0 * std::tan(scene.lens.verticalFovRadians * 0.5) / scene.zoom;
    const double aspect = viewportFor().width / viewportFor().height;
    const Vec2 ndc{result.cameraPoint.x / (halfHeight * aspect), result.cameraPoint.y / halfHeight};
    const Vec2 screen = ndcToScreen(ndc, viewportFor());
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

inline ProjectionResult projectVertex(Vec3 world, const Scene& scene) {
#if LAB_CHECKPOINT >= 4
    if (!std::isfinite(scene.zoom) || scene.zoom < 0.5 || scene.zoom > 2.0) {
        return {};
    }
    if (scene.projection == ProjectionMode::Orthographic) {
        return projectOrthographic(world, scene);
    }
    return projectPerspective(world, scene.camera, zoomedLens(scene), viewportFor());
#else
    return projectPerspective(world, scene.camera, scene.lens, viewportFor());
#endif
}

#if LAB_CHECKPOINT >= 1
inline CubeVertices worldCube(const Scene& scene) {
    const CubeVertices local = makeCubeVertices(scene.halfExtent);
#if LAB_CHECKPOINT >= 3
    const CubeVertices rotated = rotateCube(local, scene.angles, scene.order);
    return translateCube(rotated, scene.position);
#else
    return translateCube(local, scene.position);
#endif
}

struct ProjectedCube {
    std::array<ProjectionResult, kCubeVertexCount> vertices{};
    std::size_t projectionCount = 0;
};

inline ProjectedCube projectCube(const CubeVertices& world, const Scene& scene) {
    ProjectedCube projected;
    for (std::size_t i = 0; i < world.size(); ++i) {
        projected.vertices[i] = projectVertex(world[i], scene);
        ++projected.projectionCount;
    }
    return projected;
}
#endif
#if LAB_CHECKPOINT >= 5
inline void moveModel(Scene& scene, Vec3 direction, double deltaTime) {
    if (!finite(direction) || !std::isfinite(deltaTime) || deltaTime <= 0.0) {
        return;
    }
    const double length = magnitude(direction);
    if (length <= 0.0) {
        return;
    }
    // W/S: +Z/-Z, A/D: -X/+X, Q/E: -Y/+Y. Chuẩn hóa để chéo không nhanh hơn.
    const double distance = 2.0 * std::min(deltaTime, 0.1);
    const Vec3 delta = scale(direction, distance / length);
    scene.position.x = std::clamp(scene.position.x + delta.x, -6.0, 6.0);
    scene.position.y = std::clamp(scene.position.y + delta.y, -6.0, 6.0);
    scene.position.z = std::clamp(scene.position.z + delta.z, 0.1, 15.0);
    scene.paused = true;
}

inline void zoomScene(Scene& scene, double steps) {
    if (!std::isfinite(steps)) {
        return;
    }
    scene.zoom = std::clamp(scene.zoom * std::exp(std::clamp(steps, -20.0, 20.0) * 0.12), 0.5, 2.0);
    scene.paused = true;
}

inline EulerAngles applyMouseDrag(EulerAngles angles, double deltaX, double deltaY, double sensitivity) {
    if (!finiteAngles(angles) || !std::isfinite(deltaX) || !std::isfinite(deltaY) || !std::isfinite(sensitivity) || sensitivity < 0.002 || sensitivity > 0.02) {
        return angles;
    }
    angles.yaw = wrapAngle(angles.yaw + deltaX * sensitivity);
    angles.pitch = wrapAngle(angles.pitch - deltaY * sensitivity);
    return angles;
}
#endif
#if LAB_CHECKPOINT >= 6
inline void advanceScene(Scene& scene, double deltaTime) {
    if (!std::isfinite(deltaTime) || deltaTime <= 0.0) {
        return;
    }
    const double step = std::min(deltaTime, 0.1);
    scene.angles.pitch = wrapAngle(scene.angles.pitch + 0.35 * step);
    scene.angles.yaw = wrapAngle(scene.angles.yaw + 0.55 * step);
    scene.angles.roll = wrapAngle(scene.angles.roll + 0.20 * step);
}
#endif
} // namespace lab
