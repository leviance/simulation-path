#pragma once
#include "room.hpp"

namespace lab {
struct Scene {
    FpsCamera camera{};
    PerspectiveLens lens{kPi / 3.0, 0.15, 40.0};
    RoomBounds bounds{};
    double speed = 3.5;
    double sensitivity = 0.0025;
    double margin = 0.35;
    bool fly = false;
    bool paused = false;
    bool demo = false;
    bool debug = true;
};

inline Viewport viewportFor() {
    return {0.0, 0.0, 1100.0, 800.0};
}

inline FpsCamera activeCamera(const Scene& scene) {
#if LAB_CHECKPOINT >= 3
    return scene.camera;
#elif LAB_CHECKPOINT >= 2
    FpsCamera camera = scene.camera;
    camera.yaw = 0.0;
    camera.pitch = 0.0;
    return camera;
#else
    static_cast<void>(scene);
    return {};
#endif
}

inline Vec3 viewPoint(Vec3 world, const Scene& scene) {
    const FpsCamera camera = activeCamera(scene);
#if LAB_CHECKPOINT >= 3
    return worldToCamera(world, camera);
#elif LAB_CHECKPOINT >= 2
    return worldToCameraTranslation(world, camera);
#else
    return subtract(world, camera.position);
#endif
}

inline void applyPreset(Scene& scene, int index) {
    scene = {};
    if (index == 1) {
        scene.camera.position = {0.0, 1.6, 19.0};
        scene.camera.yaw = kPi;
    }
    if (index == 2) {
        scene.camera.yaw = kPi / 2.0;
    }
    if (index == 3) {
        scene.camera.pitch = kPi / 3.0;
#if LAB_CHECKPOINT >= 6
        scene.fly = true;
#endif
    }
    if (index == 4) {
        scene.camera.position = {5.65, 1.6, 10.0};
        scene.camera.yaw = kPi / 2.0;
    }
}
#if LAB_CHECKPOINT >= 6
inline void changeMode(Scene& scene) {
    scene.fly = !scene.fly;
    if (!scene.fly) {
        scene.camera.position.y = 1.6;
    }
    scene.demo = false;
}
#endif
#if LAB_CHECKPOINT >= 8
inline FpsCamera clampCameraToRoom(FpsCamera camera, const RoomBounds& b, bool fly, double margin) {
    if (!finiteCamera(camera) || !std::isfinite(margin)) {
        return camera;
    }
    // Bounds là room mặc định; margin bị chặn trước khi dùng std::clamp.
    const double safeMargin = std::clamp(margin, 0.0, 1.0);
    camera.position.x = std::clamp(camera.position.x, b.minX + safeMargin, b.maxX - safeMargin);
    camera.position.z = std::clamp(camera.position.z, b.minZ + safeMargin, b.maxZ - safeMargin);
    if (fly) {
        camera.position.y = std::clamp(camera.position.y, b.floorY + safeMargin, b.ceilingY - safeMargin);
    } else {
        camera.position.y = 1.6;
    }
    return camera;
}
#endif
#if LAB_CHECKPOINT >= 5
inline void advanceScene(Scene& scene, MoveInput input, double deltaTime) {
    if (scene.paused) {
        return;
    }
    MovementMode mode = MovementMode::Walk;
#if LAB_CHECKPOINT >= 6
    if (scene.fly) {
        mode = MovementMode::Fly;
    }
#endif
    scene.camera = advanceCamera(scene.camera, input, mode, scene.speed, deltaTime);
#if LAB_CHECKPOINT >= 8
    scene.camera = clampCameraToRoom(scene.camera, scene.bounds, scene.fly, scene.margin);
#endif
}
#endif
} // namespace lab
