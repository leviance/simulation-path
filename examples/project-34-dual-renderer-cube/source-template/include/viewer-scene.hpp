#pragma once
#include "pipeline.hpp"
#include <stdexcept>

namespace lab {
#if LAB_CHECKPOINT >= 1
// Camera/object state follows Project 21; renderer resources live elsewhere.
struct ViewerState {
    double angleX{-0.35};
    double angleY{0.65};
    double cameraYaw{};
    double cameraPitch{};
    double distance{4.2};
    bool cameraDrag{};
    bool paused{true};
    bool wireframe{};
    bool normals{};
    bool cullBackfaces{true};
    bool reverseOrder{};
    bool debug{true};
    bool grid{true};

    bool operator==(const ViewerState&) const = default;
};

struct ViewerScene {
    ViewerState view{};
    std::size_t meshIndex{};
    float targetX{}, targetY{}, targetZ{};
    float verticalFov{std::numbers::pi_v<float> / 3};
    float nearPlane{0.2F};
    float farPlane{50};
    bool depthEnabled{true};
    bool lit{true};
    float lightX{-0.45F}, lightY{0.75F}, lightZ{1};
    float baseRed{0.28F}, baseGreen{0.64F}, baseBlue{0.91F};

    bool operator==(const ViewerScene&) const = default;
};

inline void turnViewer(ViewerState& state, double horizontal, double vertical) {
    if (!std::isfinite(horizontal) || !std::isfinite(vertical))
        return;
    if (state.cameraDrag) {
        state.cameraYaw = std::remainder(state.cameraYaw + horizontal, 2 * std::numbers::pi);
        state.cameraPitch = std::clamp(state.cameraPitch + vertical, -1.3, 1.3);
    } else {
        state.angleY = std::remainder(state.angleY + horizontal, 2 * std::numbers::pi);
        state.angleX = std::remainder(state.angleX + vertical, 2 * std::numbers::pi);
    }
    state.paused = true;
}

inline void zoomViewer(ViewerState& state, double wheel) {
    if (!std::isfinite(wheel))
        return;
    state.distance = std::clamp(state.distance * std::exp(-std::clamp(wheel, -50.0, 50.0) * 0.12), 0.35, 40.0);
}
#endif

#if LAB_CHECKPOINT >= 3
inline Vec3 subtractVector(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline float dotVector(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 crossVector(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline Vec3 unitVector(Vec3 value) {
    const float magnitude = std::sqrt(dotVector(value, value));
    if (!std::isfinite(magnitude) || magnitude <= 1e-8F)
        throw std::invalid_argument("Invalid direction vector");
    return {value.x / magnitude, value.y / magnitude, value.z / magnitude};
}

struct ViewerMatrices {
    Mat4 model{}, view{}, projection{}, mvp{};
    Vec3 eye{}, right{}, up{};
};

inline ViewerMatrices viewerMatrices(const ViewerScene& scene, float aspect) {
    const float lightSquared = scene.lightX * scene.lightX + scene.lightY * scene.lightY + scene.lightZ * scene.lightZ;
    if (!std::isfinite(scene.view.angleX) || !std::isfinite(scene.view.angleY) ||
        !std::isfinite(scene.view.cameraYaw) || !std::isfinite(scene.view.cameraPitch) ||
        !std::isfinite(scene.targetX) || !std::isfinite(scene.targetY) || !std::isfinite(scene.targetZ) ||
        !std::isfinite(scene.baseRed) || !std::isfinite(scene.baseGreen) || !std::isfinite(scene.baseBlue) ||
        (scene.lit && (!std::isfinite(lightSquared) || lightSquared <= 1e-12F)) ||
        !std::isfinite(aspect) || aspect <= 0 || !std::isfinite(scene.nearPlane) || !std::isfinite(scene.farPlane) ||
        scene.nearPlane <= 0 || scene.farPlane <= scene.nearPlane || !std::isfinite(scene.view.distance) || scene.view.distance <= 0 ||
        !std::isfinite(scene.verticalFov) || scene.verticalFov <= 0 || scene.verticalFov >= std::numbers::pi_v<float>) {
        throw std::invalid_argument("Invalid viewer projection");
    }
    ViewerMatrices result{};
    // Same Y-then-X model rotation as Project 21; column vectors multiply right-to-left.
    result.model = multiply(rotationXMatrix(float(scene.view.angleX)), rotationYMatrix(float(scene.view.angleY)));
    const float yaw = float(scene.view.cameraYaw), pitch = float(scene.view.cameraPitch), distance = float(scene.view.distance);
    const Vec3 target{scene.targetX, scene.targetY, scene.targetZ};
    result.eye = {target.x + distance * std::sin(yaw) * std::cos(pitch), target.y + distance * std::sin(pitch), target.z + distance * std::cos(yaw) * std::cos(pitch)};
    const Vec3 forward = unitVector(subtractVector(target, result.eye));
    result.right = unitVector(crossVector(forward, {0, 1, 0}));
    result.up = crossVector(result.right, forward);
    const auto right = result.right, up = result.up;
    // Right-handed view: forward is -Z; OpenGL clip depth is [-w,+w].
    result.view.values = {right.x, up.x, -forward.x, 0, right.y, up.y, -forward.y, 0, right.z, up.z, -forward.z, 0, -dotVector(right, result.eye), -dotVector(up, result.eye), dotVector(forward, result.eye), 1};
    result.projection = perspectiveMatrix(scene.verticalFov, aspect, scene.nearPlane, scene.farPlane);
    result.mvp = multiply(result.projection, multiply(result.view, result.model));
    return result;
}

inline void panViewer(ViewerScene& scene, float dx, float dy, int pixelHeight) {
    if (pixelHeight <= 0 || !std::isfinite(dx) || !std::isfinite(dy))
        return;
    const auto matrices = viewerMatrices(scene, 1);
    const float metresPerPixel = 2 * float(scene.view.distance) * std::tan(scene.verticalFov * 0.5F) / float(pixelHeight);
    scene.targetX += (-dx * matrices.right.x + dy * matrices.up.x) * metresPerPixel;
    scene.targetY += (-dx * matrices.right.y + dy * matrices.up.y) * metresPerPixel;
    scene.targetZ += (-dx * matrices.right.z + dy * matrices.up.z) * metresPerPixel;
    scene.view.paused = true;
}
#endif
} // namespace lab
