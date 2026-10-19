#pragma once
#include "lab.hpp"

namespace lab {
// State model độc lập với camera; mỗi frame bắt đầu từ local triangle bất biến.
struct Scene {
    Camera3D camera{};
    PerspectiveLens lens{};
    Vec3 position{0.0, 0.0, 6.0};
    EulerAngles angles{};
    RotationOrder order = RotationOrder::Xyz;
    double sensitivity = 0.008;
    bool paused = true;
    bool debug = true;
};

inline Viewport viewportFor() {
    return {30.0, 100.0, 1040.0, 600.0};
}
#if LAB_CHECKPOINT >= 1
inline Triangle3 worldTriangle(const Scene& scene) {
#if LAB_CHECKPOINT >= 2
    const Triangle3 localTriangle = toLocalTriangle(defaultWorldTriangle());
    Triangle3 rotatedLocal = localTriangle;
#if LAB_CHECKPOINT >= 4
    rotatedLocal = rotateTriangle(localTriangle, scene.angles, scene.order);
#elif LAB_CHECKPOINT >= 3
    rotatedLocal = rotateTriangleX(localTriangle, scene.angles.pitch);
#endif
    return translateTriangle(rotatedLocal, scene.position);
#else
    return translateTriangle(defaultWorldTriangle(), subtract(scene.position, {0.0, 0.0, 6.0}));
#endif
}
#endif
inline void moveModel(Scene& scene, Vec3 delta) {
    if (!finite(delta)) {
        return;
    }
    scene.position.x = std::clamp(scene.position.x + delta.x, -4.0, 4.0);
    scene.position.y = std::clamp(scene.position.y + delta.y, -4.0, 4.0);
    scene.position.z = std::clamp(scene.position.z + delta.z, 0.1, 15.0);
    scene.paused = true;
}

inline void applyPreset(Scene& scene, int index) {
    scene = {};
    if (index == 1) {
        scene.angles = {kPi * 0.5, kPi * 0.5, 0.0};
    }
    if (index == 2) {
        scene.angles = {0.4, 0.7, -0.3};
    }
    if (index == 3) {
        scene.position.z = 0.7;
    }
    if (index == 4) {
        scene.position.x = 4.0;
        scene.position.z = 2.0;
    }
}
#if LAB_CHECKPOINT >= 7
inline void advanceScene(Scene& scene, double deltaTime) {
    scene.angles = advanceEulerAngles(scene.angles, {0.35, 0.55, 0.20}, deltaTime);
}
#endif
} // namespace lab
