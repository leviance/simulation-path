#pragma once
#include "framebuffer.hpp"
#include "lab.hpp"

namespace lab {
// Camera chỉ tịnh tiến; góc quay luôn thuộc mô hình, không thuộc lưới world.
struct Vec2 {
    double x{};
    double y{};
};

struct Scene {
    double angleX{-0.42};
    double angleY{0.68};
    Vec3 camera{};
    bool reverseOrder{};
#if LAB_CHECKPOINT >= 5
    bool depthEnabled{true};
#else
    bool depthEnabled{false};
#endif
    bool cullEnabled{};
    bool debug{true};
    bool depthView{};
    bool paused{true};
    int inspectX{550};
    int inspectY{300};
};

inline int viewportHeight(const Scene& scene) {
    if (scene.debug) {
        return 600;
    }
    return 800;
}

inline void resetScene(Scene& scene, int preset = 1) {
    scene = {};
    if (preset == 2) {
        scene.angleX = 0.0;
        scene.angleY = 0.0;
    }
    if (preset == 3) {
        scene.angleX = -0.70;
        scene.angleY = 0.95;
    }
}

struct DragState {
    bool active{};
    Vec2 start{};
    double angleX{};
    double angleY{};
};

#if LAB_CHECKPOINT >= 1
inline void beginDrag(Scene& scene, Vec2 mouse, DragState& drag) {
    if (!std::isfinite(mouse.x) || !std::isfinite(mouse.y)) {
        drag = {};
        return;
    }
    drag = {true, mouse, scene.angleX, scene.angleY};
    scene.inspectX = std::clamp(static_cast<int>(mouse.x), 0, Framebuffer::width - 1);
    scene.inspectY = std::clamp(static_cast<int>(mouse.y), 0, viewportHeight(scene) - 1);
    scene.paused = true;
}

inline void updateDrag(Scene& scene, const DragState& drag, Vec2 mouse) {
    if (!drag.active || !std::isfinite(mouse.x) || !std::isfinite(mouse.y)) {
        return;
    }
    scene.angleX = std::remainder(drag.angleX + (mouse.y - drag.start.y) * 0.008, 6.283185307179586);
    scene.angleY = std::remainder(drag.angleY + (mouse.x - drag.start.x) * 0.008, 6.283185307179586);
    scene.paused = true;
}
#endif

#if LAB_CHECKPOINT >= 6
inline bool advanceScene(Scene& scene, double deltaSeconds) {
    if (scene.paused || !std::isfinite(deltaSeconds) || deltaSeconds <= 0.0) {
        return false;
    }
    scene.angleY = std::remainder(scene.angleY + std::min(deltaSeconds, 0.05) * 0.55, 6.283185307179586);
    return true;
}
#endif
} // namespace lab
