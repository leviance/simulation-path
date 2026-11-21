#pragma once
#include "lab.hpp"

namespace lab {
// Các sao đứng yên trong thế giới. Chuyến bay chỉ thay đổi Z của camera.
struct Scene {
    Vec3 point{1.0, 0.6, 4.0};
    Camera3D camera{};
    PerspectiveLens lens{};
    int aspect = 0;
    bool paused = true;
#if LAB_CHECKPOINT >= 6
    bool forwardHeld = false;
    bool backwardHeld = false;
#endif
#if LAB_CHECKPOINT >= 8
    bool debug = false;
    bool measureDepth = false;
#else
    bool debug = true;
#endif
    double elapsed = 0.0;
};

inline Viewport viewportFor(const Scene& scene) {
    if (scene.aspect == 1) {
        return {150.0, 100.0, 800.0, 600.0};
    }
    if (scene.aspect == 2) {
        return {250.0, 100.0, 600.0, 600.0};
    }
    return {};
}

#if LAB_CHECKPOINT >= 2
constexpr double flightLimit = 12.0;
// [snippet flight-camera]
inline void setCameraDepth(Scene& scene, double depth) {
    if (std::isfinite(depth)) {
        scene.camera.position.z = std::clamp(depth, 0.0, flightLimit);
    }
}
// [/snippet flight-camera]
#endif

#if LAB_CHECKPOINT >= 6
inline void stopFlight(Scene& scene) {
    scene.paused = true;
    scene.forwardHeld = false;
    scene.backwardHeld = false;
}

// [snippet flight-direction]
inline double flightDirection(const Scene& scene) {
    if (scene.forwardHeld && scene.backwardHeld) return 0.0;
    if (scene.forwardHeld) return 1.0;
    if (scene.backwardHeld) return -1.0;
    if (!scene.paused) return 1.0;
    return 0.0;
}
// [/snippet flight-direction]

// [snippet flight-step]
inline void advanceScene(Scene& scene, double deltaTime, double direction = 1.0) {
    if (!std::isfinite(deltaTime) || !std::isfinite(direction) || deltaTime <= 0.0 || direction == 0.0) return;
    constexpr double speed = 2.0;
    const double dt = std::min(deltaTime, 0.1);
    const double start = scene.camera.position.z;
    setCameraDepth(scene, start + std::clamp(direction, -1.0, 1.0) * speed * dt);
    const double finish = scene.camera.position.z;
    scene.elapsed += std::abs(finish - start) / speed;
    if ((direction > 0.0 && finish >= flightLimit) || (direction < 0.0 && finish <= 0.0)) {
        stopFlight(scene);
    }
}
// [/snippet flight-step]
#endif

#if LAB_CHECKPOINT >= 1
inline void movePoint(Scene& scene, Vec3 delta) {
    if (!finite(delta)) return;
    scene.debug = true;
    scene.point.x = std::clamp(scene.point.x + delta.x, -6.0, 6.0);
    scene.point.y = std::clamp(scene.point.y + delta.y, -6.0, 6.0);
    scene.point.z = std::clamp(scene.point.z + delta.z, -2.0, 20.0);
    scene.paused = true;
#if LAB_CHECKPOINT >= 6
    stopFlight(scene);
#endif
}
#endif

// R về màn bay sạch; F1..F6 là các vị trí so sánh của riêng điểm thử.
inline void applyPreset(Scene& scene, int index) {
    scene = {};
    if (index != 0) scene.debug = true;
    if (index == 1) scene.point = {1.0, 0.6, 8.0};
    if (index == 2) scene.point = {0.0, 0.0, 0.25};
    if (index == 3) scene.point = {0.0, 0.0, -1.0};
    if (index == 4) scene.point = {0.0, 0.0, 18.0};
    if (index == 5) scene.point = {6.0, 0.0, 1.0};
}
} // namespace lab
