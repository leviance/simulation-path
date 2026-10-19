#pragma once
#include "lab.hpp"

namespace lab {
inline constexpr Vec2 kOrigin{550.0, 410.0};
inline constexpr double kPixelsPerUnit = 40.0;
inline constexpr double kTargetRadius = 6.5;

struct Scene {
#if LAB_CHECKPOINT >= 1
    Vec2 targetOffset{4.0, 3.0};
    double turretAngle{};
    bool followMouse = true;
    bool dragging{};
#endif
#if LAB_CHECKPOINT >= 5
    double turnSpeed = kPi / 2.0;
#endif
#if LAB_CHECKPOINT >= 6
    double halfViewAngle = 35.0 * kPi / 180.0;
#endif
};

inline Vec2 worldToScreen(Vec2 world) {
    return {kOrigin.x + kPixelsPerUnit * world.x, kOrigin.y - kPixelsPerUnit * world.y};
}

inline Vec2 screenToWorld(Vec2 screen) {
    return {(screen.x - kOrigin.x) / kPixelsPerUnit, (kOrigin.y - screen.y) / kPixelsPerUnit};
}

#if LAB_CHECKPOINT >= 1
inline Vec2 boundedTarget(Vec2 target) {
    if (!std::isfinite(target.x) || !std::isfinite(target.y)) {
        return {};
    }
    if (length(target) > kTargetRadius) {
        return scale(normalize(target), kTargetRadius);
    }
    return target;
}

inline void setTarget(Scene& scene, Vec2 target) {
    scene.targetOffset = boundedTarget(target);
}

// Miền thao tác khác với zero vector toán học: gần tâm 8 logical px thì không suy hướng.
inline bool targetHasDirection(const Scene& scene) {
    return length(scene.targetOffset) >= 8.0 / kPixelsPerUnit;
}

inline void cancelDrag(Scene& scene) {
    scene.dragging = false;
}

inline void applyPreset(Scene& scene, int index) {
    double angle = scene.turretAngle;
    double radius = 5.0;
    if (index == 0) {
        radius = 2.0;
    }
    if (index == 2) {
        angle += kPi / 2.0;
    }
    if (index == 3) {
        angle -= kPi / 2.0;
    }
    if (index == 4) {
        angle += kPi;
    }
    if (index == 5) {
        radius = 0.0;
    }
    if (index == 6) {
#if LAB_CHECKPOINT >= 6
        angle += scene.halfViewAngle;
#else
        angle += 35.0 * kPi / 180.0;
#endif
    }
    setTarget(scene, scale(directionFromAngle(angle), radius));
    scene.followMouse = false;
    cancelDrag(scene);
}
#endif

#if LAB_CHECKPOINT >= 5
inline void advanceScene(Scene& scene, double deltaTime) {
    if (!std::isfinite(deltaTime) || deltaTime <= 0.0 || deltaTime > 0.1 || !targetHasDirection(scene)) {
        return;
    }
    scene.turretAngle = rotateTowards(scene.turretAngle, scene.targetOffset, scene.turnSpeed * deltaTime);
}
#endif
} // namespace lab
