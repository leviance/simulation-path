#pragma once
#include "lab.hpp"

namespace lab {
// Camera và near plane độc lập với vị trí của tam giác.
struct Scene {
#if LAB_CHECKPOINT >= 8
    int preset{2};
#else
    int preset{1};
#endif
    double nearPlane{1.0};
    double depthOffset{};
    Vec3 camera{};
    double direction{1.0};
    bool paused{true};
    bool debug{true};
#if LAB_CHECKPOINT >= 6
    bool clipping{true};
#else
    bool clipping{false};
#endif
};

struct HeldInput {
    bool toward{};
    bool away{};
};

struct DragState {
    bool active{};
    double startX{};
    double depthOffset{};
};

inline int viewportHeight(const Scene& scene) {
    if (scene.debug) {
        return 600;
    }
    return 800;
}

inline void resetScene(Scene& scene, int preset) {
    scene = {};
    scene.preset = std::clamp(preset, 1, 5);
}

#if LAB_CHECKPOINT >= 1
inline Triangle3 makeDefaultTriangle() {
    return {
        {{-1.15, -0.85, 0.45}, {255.0, 92.0, 106.0}},
        {{1.15, -0.70, 3.20}, {78.0, 232.0, 163.0}},
        {{0.00, 1.05, 2.25}, {93.0, 145.0, 255.0}},
    };
}

inline Triangle3 presetTriangle(int preset) {
    if (preset == 1) {
        return {
            {{-1.0, -0.8, 2.1}, {255.0, 92.0, 106.0}},
            {{1.1, -0.7, 3.2}, {78.0, 232.0, 163.0}},
            {{0.0, 1.0, 2.6}, {93.0, 145.0, 255.0}},
        };
    }
    if (preset == 2) {
        return makeDefaultTriangle();
    }
    if (preset == 3) {
        return {
            {{-1.1, -0.8, 0.35}, {255.0, 92.0, 106.0}},
            {{1.1, -0.7, 0.55}, {78.0, 232.0, 163.0}},
            {{0.0, 1.0, 2.8}, {93.0, 145.0, 255.0}},
        };
    }
    if (preset == 4) {
        return {
            {{-1.0, -0.8, 0.25}, {255.0, 92.0, 106.0}},
            {{1.0, -0.7, 0.45}, {78.0, 232.0, 163.0}},
            {{0.0, 1.0, 0.65}, {93.0, 145.0, 255.0}},
        };
    }
    return {
        {{-1.0, -0.8, 1.0}, {255.0, 92.0, 106.0}},
        {{1.0, -0.7, 2.8}, {78.0, 232.0, 163.0}},
        {{0.0, 1.0, 1.0}, {93.0, 145.0, 255.0}},
    };
}

inline Triangle3 cameraTriangle(const Scene& scene) {
    Triangle3 t = moveAlongDepth(presetTriangle(scene.preset), scene.depthOffset);
    for (auto* v : {&t.a, &t.b, &t.c}) {
        v->position.x -= scene.camera.x;
        v->position.y -= scene.camera.y;
        v->position.z -= scene.camera.z;
    }
    return t;
}

inline bool moveDepthOffset(Scene& scene, double offset) {
    if (!std::isfinite(offset)) {
        return false;
    }
    const double next = std::clamp(offset, -4.0, 3.0);
    if (next == scene.depthOffset) {
        return false;
    }
    scene.depthOffset = next;
    return true;
}

inline void beginDrag(Scene& scene, double mouseX, DragState& drag) {
    if (!std::isfinite(mouseX)) {
        drag = {};
        return;
    }
    drag = {true, mouseX, scene.depthOffset};
    scene.paused = true;
}

inline void updateDrag(Scene& scene, const DragState& drag, double mouseX) {
    if (drag.active && std::isfinite(mouseX)) {
        moveDepthOffset(scene, drag.depthOffset + (mouseX - drag.startX) * 0.012);
    }
}
#endif

#if LAB_CHECKPOINT >= 7
inline bool stepSweep(Scene& scene, double distance) {
    if (!std::isfinite(distance) || distance < 0.0) {
        return false;
    }
    double next = scene.depthOffset + scene.direction * distance;
    if (next >= 3.0) {
        next = 3.0;
        scene.direction = -1.0;
    }
    if (next <= -4.0) {
        next = -4.0;
        scene.direction = 1.0;
    }
    return moveDepthOffset(scene, next);
}
#endif

inline bool advanceScene(Scene& scene, double deltaSeconds, int heldAxis) {
#if LAB_CHECKPOINT >= 1
    if (!std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return false;
    }
    const double dt = std::min(deltaSeconds, 0.05);
    if (heldAxis != 0) {
        return moveDepthOffset(scene, scene.depthOffset + heldAxis * dt);
    }
#if LAB_CHECKPOINT >= 7
    if (!scene.paused) {
        return stepSweep(scene, 0.75 * dt);
    }
#endif
#else
    (void)scene;
    (void)deltaSeconds;
    (void)heldAxis;
#endif
    return false;
}
} // namespace lab
