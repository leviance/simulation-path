#pragma once
#include "rotation.hpp"
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

namespace lab {
inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

struct FpsCamera {
    Vec3 position{0.0, 1.6, 2.0};
    double yaw = 0.0;
    double pitch = 0.0;
};

inline bool finiteCamera(const FpsCamera& camera) {
    return finite(camera.position) && std::isfinite(camera.yaw) && std::isfinite(camera.pitch);
}
#if LAB_CHECKPOINT >= 2
inline Vec3 worldToCameraTranslation(Vec3 worldPoint, const FpsCamera& camera) {
    return subtract(worldPoint, camera.position);
}
#endif
#if LAB_CHECKPOINT >= 3
// Camera orientation = Ry(yaw) Rx(-pitch). Đảo thứ tự và dấu để đổi world -> view.
inline Vec3 worldToCamera(Vec3 worldPoint, const FpsCamera& camera) {
    const Vec3 relative = worldToCameraTranslation(worldPoint, camera);
    const Vec3 yawNeutral = rotateY(relative, -camera.yaw);
    return rotateX(yawNeutral, camera.pitch);
}

inline FpsCamera applyKeyboardLook(FpsCamera camera, double yawDelta, double pitchDelta) {
    if (!finiteCamera(camera) || !std::isfinite(yawDelta) || !std::isfinite(pitchDelta)) {
        return camera;
    }
    constexpr double limit = 89.0 * kPi / 180.0;
    camera.yaw = wrapAngle(camera.yaw + yawDelta);
    camera.pitch = std::clamp(camera.pitch + pitchDelta, -limit, limit);
    return camera;
}
#endif
#if LAB_CHECKPOINT >= 4
struct CameraBasis {
    Vec3 forward{};
    Vec3 right{};
    Vec3 up{};
};

inline CameraBasis cameraBasis(const FpsCamera& camera) {
    const double sinYaw = std::sin(camera.yaw);
    const double cosYaw = std::cos(camera.yaw);
    const double sinPitch = std::sin(camera.pitch);
    const double cosPitch = std::cos(camera.pitch);
    CameraBasis basis;
    basis.forward = {sinYaw * cosPitch, sinPitch, cosYaw * cosPitch};
    basis.right = {cosYaw, 0.0, -sinYaw};
    basis.up = {-sinYaw * sinPitch, cosPitch, -cosYaw * sinPitch};
    return basis;
}

inline Vec3 groundForward(const FpsCamera& camera) {
    return {std::sin(camera.yaw), 0.0, std::cos(camera.yaw)};
}
#endif
#if LAB_CHECKPOINT >= 5
struct MoveInput {
    double strafe = 0.0;
    double advance = 0.0;
    double lift = 0.0;
};

enum class MovementMode {
    Walk,
    Fly,
};

inline MoveInput makeMoveInput(bool left, bool right, bool backward, bool forward, bool down, bool up) {
    MoveInput input;
    if (left) {
        input.strafe -= 1.0;
    }
    if (right) {
        input.strafe += 1.0;
    }
    if (backward) {
        input.advance -= 1.0;
    }
    if (forward) {
        input.advance += 1.0;
    }
    if (down) {
        input.lift -= 1.0;
    }
    if (up) {
        input.lift += 1.0;
    }
    return input;
}

inline Vec3 movementDirection(const FpsCamera& camera, MoveInput input, MovementMode mode) {
    const CameraBasis basis = cameraBasis(camera);
    Vec3 forward = groundForward(camera);
    static_cast<void>(mode);
#if LAB_CHECKPOINT >= 6
    if (mode == MovementMode::Fly) {
        forward = basis.forward;
    }
#endif
    Vec3 direction = add(scale(basis.right, input.strafe), scale(forward, input.advance));
#if LAB_CHECKPOINT >= 6
    if (mode == MovementMode::Fly) {
        direction.y += input.lift;
    }
#endif
    return direction;
}

inline FpsCamera advanceCamera(FpsCamera camera, MoveInput input, MovementMode mode, double speed, double deltaTime) {
    if (!finiteCamera(camera) || !std::isfinite(input.strafe) || !std::isfinite(input.advance) || !std::isfinite(input.lift) || !std::isfinite(speed) || speed < 0.0 || !std::isfinite(deltaTime) || deltaTime <= 0.0) {
        return camera;
    }
    const Vec3 direction = movementDirection(camera, input, mode);
    const double length = magnitude(direction);
    if (!finite(direction) || !std::isfinite(length) || length <= 1e-12) {
        return camera;
    }
    // Digital input: chuẩn hóa tổng hướng world, kể cả forward và lift không vuông góc khi fly.
    const Vec3 unitDirection = scale(direction, 1.0 / length);
    const double distance = speed * std::min(deltaTime, 0.1);
    const Vec3 candidate = add(camera.position, scale(unitDirection, distance));
    if (finite(candidate)) {
        camera.position = candidate;
    }
    return camera;
}
#endif
#if LAB_CHECKPOINT >= 7
inline FpsCamera applyMouseLook(FpsCamera camera, double deltaX, double deltaY, double sensitivity) {
    if (!std::isfinite(deltaX) || !std::isfinite(deltaY) || !std::isfinite(sensitivity) || sensitivity < 0.001 || sensitivity > 0.02) {
        return camera;
    }
    return applyKeyboardLook(camera, deltaX * sensitivity, -deltaY * sensitivity);
}
#endif
#if LAB_CHECKPOINT >= 9
inline Vec3 cameraToWorld(Vec3 point, const FpsCamera& camera) {
    const Vec3 pitchRestored = rotateX(point, -camera.pitch);
    const Vec3 yawRestored = rotateY(pitchRestored, camera.yaw);
    return add(yawRestored, camera.position);
}

inline double basisError(const FpsCamera& camera) {
    const CameraBasis basis = cameraBasis(camera);
    double error = 0.0;
    error = std::max(error, std::abs(magnitude(basis.forward) - 1.0));
    error = std::max(error, std::abs(magnitude(basis.right) - 1.0));
    error = std::max(error, std::abs(magnitude(basis.up) - 1.0));
    error = std::max(error, std::abs(dot(basis.forward, basis.right)));
    error = std::max(error, std::abs(dot(basis.forward, basis.up)));
    return std::max(error, std::abs(dot(basis.right, basis.up)));
}

inline double viewRoundTripError(Vec3 world, const FpsCamera& camera) {
    return magnitude(subtract(cameraToWorld(worldToCamera(world, camera), camera), world));
}
#endif
} // namespace lab
