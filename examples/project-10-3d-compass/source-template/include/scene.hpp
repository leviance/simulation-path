#pragma once
#include "camera.hpp"

namespace lab {
// Camera và hình học là hai state riêng: orbit không sửa dữ liệu tam giác.
struct Scene {
    Camera camera{};
    bool paused = true;
#if LAB_CHECKPOINT >= 2
    Triangle triangle{};
    int selected = 2;
#endif
};
#if LAB_CHECKPOINT >= 2
inline Vec3& selectedVertex(Scene& scene) {
    if (scene.selected == 0) {
        return scene.triangle.p0;
    }
    if (scene.selected == 1) {
        return scene.triangle.p1;
    }
    return scene.triangle.p2;
}

inline void moveVertex(Scene& scene, Vec3 delta) {
    if (!finite(delta)) {
        return;
    }
    Vec3& vertex = selectedVertex(scene);
    vertex.x = std::clamp(vertex.x + delta.x, -2.0, 2.0);
    vertex.y = std::clamp(vertex.y + delta.y, -2.0, 2.0);
    vertex.z = std::clamp(vertex.z + delta.z, -2.0, 2.0);
}
#endif
inline void applyPreset(Scene& scene, int index) {
    scene = {};
#if LAB_CHECKPOINT >= 2
    if (index == 1) {
        scene.triangle = {{-1.5, -2.0, 0.0}, {1.5, -2.0, 0.0}, {-1.5, 2.0, 0.0}};
    }
    if (index == 2) {
        scene.triangle = {{-1.0, 0.0, 0.0}, {0.0, 0.0, 0.0}, {1.0, 0.0, 0.0}};
    }
    if (index == 3) {
        scene.triangle = {{0.0, 0.0, 0.0}, {0.0, 0.0, 0.0}, {1.0, 1.0, 1.0}};
    }
    if (index == 4) {
        scene.triangle = {{0.0, 0.0, 0.0}, {1.0, 0.0, 0.0}, {2.0, 1e-7, 0.0}};
    }
#else
    (void)index;
#endif
}
#if LAB_CHECKPOINT >= 6
inline void advanceScene(Scene& scene, double deltaTime) {
    if (!std::isfinite(deltaTime) || deltaTime <= 0.0 || deltaTime > 0.1) {
        return;
    }
    scene.camera.yaw = std::remainder(scene.camera.yaw + 0.35 * deltaTime, 2.0 * kPi);
}
#endif
} // namespace lab
