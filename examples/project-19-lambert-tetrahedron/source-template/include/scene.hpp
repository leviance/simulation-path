#pragma once
#include "lighting.hpp"

namespace lab {
// State mô hình, camera và nguồn sáng tách riêng để không xoay nhầm cả thế giới.
enum class DragTarget { model,
                        camera };

struct Scene {
    double pitch{-0.3};
    double yaw{0.6};
    Camera camera{};
    double lightAzimuth{0.6};
    double lightElevation{0.5};
    double ambient{0.16};
    double diffuseStrength{0.84};
    std::size_t selectedFace{};
    DragTarget dragTarget{DragTarget::model};
    bool paused{true};
#if LAB_CHECKPOINT >= 4
    bool lighting{true};
#else
    bool lighting{false};
#endif
    bool normals{false};
#if LAB_CHECKPOINT >= 7
    bool debug{false};
#else
    bool debug{true};
#endif
#if LAB_CHECKPOINT >= 2
    bool palette{false};
#else
    bool palette{true};
#endif
#if LAB_CHECKPOINT >= 6
    bool culling{true};
#else
    bool culling{false};
#endif
};

inline void lightPreset(Scene& scene, int preset) {
    scene.paused = true;
    scene.lightElevation = 0;
    if (preset == 1) {
        scene.lightAzimuth = 0;
    }
    if (preset == 2) {
        scene.lightAzimuth = 0;
        scene.lightElevation = 1.4;
    }
    if (preset == 3) {
        scene.lightAzimuth = 1.5707963267948966;
    }
    if (preset == 4) {
        scene.lightAzimuth = 3.141592653589793;
    }
}

inline void rotateSelection(Scene& scene, double dx, double dy) {
    scene.paused = true;
#if LAB_CHECKPOINT >= 6
    if (scene.dragTarget == DragTarget::camera) {
        scene.camera.yaw += dx;
        scene.camera.pitch = std::clamp(scene.camera.pitch + dy, -1.4, 1.4);
        return;
    }
#endif
    scene.yaw += dx;
    scene.pitch = std::clamp(scene.pitch + dy, -1.4, 1.4);
}

inline bool advanceScene(Scene& scene, double deltaSeconds) {
#if LAB_CHECKPOINT >= 3
    if (!scene.paused && std::isfinite(deltaSeconds) && deltaSeconds > 0) {
        scene.lightAzimuth = std::remainder(scene.lightAzimuth + std::min(deltaSeconds, 0.05) * 0.65, 6.283185307179586);
        return true;
    }
#else
    (void)scene;
    (void)deltaSeconds;
#endif
    return false;
}

struct DragState {
    bool active{};
    Vec2 previous{};
};

inline bool beginDrag(Scene& scene, DragState& drag, Vec2 point) {
    if (!std::isfinite(point.x) || !std::isfinite(point.y) || drag.active) {
        return false;
    }
    scene.paused = true;
    drag = {true, point};
    return true;
}

inline bool updateDrag(Scene& scene, DragState& drag, Vec2 point) {
    if (!drag.active || !std::isfinite(point.x) || !std::isfinite(point.y)) {
        return false;
    }
    rotateSelection(scene, (point.x - drag.previous.x) * 0.008, (point.y - drag.previous.y) * 0.008);
    drag.previous = point;
    return true;
}
} // namespace lab
