#pragma once
#include "lab.hpp"

namespace lab {
// World point không bị ghi đè bằng tọa độ camera hoặc pixel.
struct Scene {
    Vec3 point{1.0, 0.6, 4.0};
    Camera3D camera{};
    PerspectiveLens lens{};
    int aspect = 0;
    bool paused = true;
    bool debug = true;
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
#if LAB_CHECKPOINT >= 1
inline void movePoint(Scene& scene, Vec3 delta) {
    if (!finite(delta)) {
        return;
    }
    scene.point.x = std::clamp(scene.point.x + delta.x, -6.0, 6.0);
    scene.point.y = std::clamp(scene.point.y + delta.y, -6.0, 6.0);
    scene.point.z = std::clamp(scene.point.z + delta.z, -2.0, 20.0);
    scene.paused = true;
}
#endif
inline void applyPreset(Scene& scene, int index) {
    scene = {};
    if (index == 1) {
        scene.point = {1.0, 0.6, 8.0};
    }
    if (index == 2) {
        scene.point = {0.0, 0.0, 0.25};
    }
    if (index == 3) {
        scene.point = {0.0, 0.0, -1.0};
    }
    if (index == 4) {
        scene.point = {0.0, 0.0, 18.0};
    }
    if (index == 5) {
        scene.point = {6.0, 0.0, 1.0};
    }
}
#if LAB_CHECKPOINT >= 6
inline void advanceScene(Scene& scene, double deltaTime) {
    if (!std::isfinite(deltaTime) || deltaTime <= 0.0) {
        return;
    }
    scene.elapsed = advanceFlightTime(scene.elapsed, deltaTime);
    scene.point = flightPoint(scene.elapsed);
}
#endif
} // namespace lab
