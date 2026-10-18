#pragma once
#include "camera.hpp"

namespace lab {
// Scene giữ dữ liệu người dùng sửa; mọi kết quả toán học được suy ra khi vẽ.
struct Scene {
#if LAB_CHECKPOINT >= 1
    Vec2 vectorA{3.0, 1.5};
    Vec2 vectorB{-1.0, 2.5};
#endif
#if LAB_CHECKPOINT >= 3
    int selected{};
    int dragged{-1};
    Vec2 grabOffset{};
#endif
#if LAB_CHECKPOINT >= 6
    enum class ViewMode { Arithmetic, Scalar, Unit, Interpolation, All };
#if LAB_CHECKPOINT == 6
    ViewMode viewMode = ViewMode::Scalar;
#elif LAB_CHECKPOINT == 7
    ViewMode viewMode = ViewMode::Unit;
#else
    ViewMode viewMode = ViewMode::Arithmetic;
#endif
    double scalar{0.5};
#endif
#if LAB_CHECKPOINT >= 8
    double interpolation{0.5};
#endif
};

#if LAB_CHECKPOINT >= 3
inline void cancelDrag(Scene& scene) {
    scene.dragged = -1;
}

// Khoảng cách tính bằng pixel logic; trùng nhau thì ưu tiên điểm đang được chọn.
inline int hitTarget(const Scene& scene, Vec2 screen) {
    const double distanceA = distance(worldToScreen(scene.vectorA), screen);
    const double distanceB = distance(worldToScreen(scene.vectorB), screen);
    if (std::min(distanceA, distanceB) > 14.0) {
        return -1;
    }
    if (std::abs(distanceA - distanceB) < 1e-9) {
        return scene.selected;
    }
    if (distanceA < distanceB) {
        return 0;
    }
    return 1;
}

inline bool beginDrag(Scene& scene, Vec2 screen) {
    cancelDrag(scene);
    if (!finite(screen)) {
        return false;
    }
    scene.dragged = hitTarget(scene, screen);
    if (scene.dragged < 0) {
        return false;
    }
    scene.selected = scene.dragged;
    Vec2 endpoint = scene.vectorA;
    if (scene.dragged == 1) {
        endpoint = scene.vectorB;
    }
    scene.grabOffset = endpoint - screenToWorld(screen);
    return true;
}

inline void moveEndpoint(Scene& scene, Vec2 screen) {
    if (scene.dragged < 0 || !finite(screen)) {
        return;
    }
    const Vec2 endpoint = boundedEndpoint(screenToWorld(screen) + scene.grabOffset);
    if (scene.dragged == 0) {
        scene.vectorA = endpoint;
    } else {
        scene.vectorB = endpoint;
    }
}

inline void nudgeEndpoint(Scene& scene, Vec2 deltaWorld) {
    cancelDrag(scene);
    if (scene.selected == 0) {
        scene.vectorA = boundedEndpoint(scene.vectorA + deltaWorld);
    } else {
        scene.vectorB = boundedEndpoint(scene.vectorB + deltaWorld);
    }
}

inline void applyPreset(Scene& scene, int preset) {
    const int selected = scene.selected;
    scene = {};
    scene.selected = selected;
    if (preset == 1) {
        scene.vectorA = {3.0, 0.0};
        scene.vectorB = {0.0, 2.0};
    } else if (preset == 2) {
        scene.vectorA = {3.0, 1.0};
        scene.vectorB = {-3.0, -1.0};
    } else if (preset == 3) {
        scene.vectorA = {};
        scene.vectorB = {2.0, 2.0};
    } else if (preset == 4) {
        scene.vectorA = {};
        scene.vectorB = {};
    }
}
#endif
} // namespace lab
