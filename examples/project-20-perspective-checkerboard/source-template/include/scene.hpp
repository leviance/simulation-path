#pragma once
#include "sampler.hpp"

namespace lab {
struct Scene {
    double yaw{-0.65};
    double pitch{0.12};
    double distance{3.8};
    Vec2 sample{0.5, 0.5};
    Vec2 sampleUv{0.62, 0.38};
    int preset{2};
    bool debug{true};
    bool paused{true};
    bool compare{false};
    bool corrected{false};
    double phase{};
#if LAB_CHECKPOINT >= 2
    AddressMode address{AddressMode::clamp};
#endif
    Scene() {
#if LAB_CHECKPOINT >= 6
        corrected = true;
        compare = true;
#endif
#if LAB_CHECKPOINT >= 8
        debug = false;
#endif
    }
};

inline void applyPreset(Scene& scene, int preset) {
    scene.preset = preset;
    scene.paused = true;
    scene.phase = 0;
    scene.yaw = -0.65;
    scene.pitch = 0.12;
    scene.distance = 3.8;
    if (preset == 1) {
        scene.yaw = 0;
        scene.pitch = 0;
        scene.distance = 4;
    }
    if (preset == 3) {
        scene.yaw = -1.12;
        scene.pitch = 0.22;
        scene.distance = 3.2;
    }
#if LAB_CHECKPOINT >= 7
    if (preset == 4) {
        scene.yaw = -1.10;
        scene.pitch = 0.12;
        scene.distance = 1.6;
    }
#endif
}

inline void tiltScene(Scene& scene, double deltaYaw, double deltaPitch) {
    scene.yaw = std::clamp(scene.yaw + deltaYaw, -1.25, 1.25);
    scene.pitch = std::clamp(scene.pitch + deltaPitch, -0.8, 0.8);
    scene.preset = 0;
    scene.paused = true;
}

inline double minimumDistance() {
#if LAB_CHECKPOINT >= 7
    return 1.4;
#else
    return 2.8;
#endif
}

inline bool advanceScene(Scene& scene, double dt, bool singleStep = false) {
#if LAB_CHECKPOINT >= 8
    if ((!scene.paused || singleStep) && std::isfinite(dt) && dt > 0) {
        // Single-step luôn dùng 1/60 giây, không phụ thuộc lần render trước.
        double step = std::min(dt, 0.05);
        if (singleStep) {
            step = 1.0 / 60.0;
        }
        const double nextPhase = std::fmod(scene.phase + step, 6.283185307179586);
        scene.yaw = std::clamp(scene.yaw + 0.5 * (std::sin(nextPhase) - std::sin(scene.phase)), -1.25, 1.25);
        scene.phase = nextPhase;
        scene.preset = 0;
        return true;
    }
#else
    (void)scene;
    (void)dt;
    (void)singleStep;
#endif
    return false;
}

inline int viewportHeight(const Scene& scene, int height) {
    if (scene.debug) {
        return std::max(1, height - 180);
    }
    return std::max(1, height - 70);
}

inline std::vector<Viewport> viewports(const Scene& scene, int width, int height) {
    const int h = viewportHeight(scene, height);
    if (scene.compare) {
        const int half = (width - 12) / 2;
        return {{0, 0, half, h}, {half + 12, 0, half, h}};
    }
    return {{0, 0, width, h}};
}

struct DragState {
    bool active{false};
    bool moved{false};
    Vec2 start{};
    double yaw{};
    double pitch{};
};

inline void beginDrag(Scene& scene, DragState& drag, Vec2 point) {
    drag = {true, false, point, scene.yaw, scene.pitch};
    scene.paused = true;
}

inline void updateDrag(Scene& scene, DragState& drag, Vec2 point) {
    const double dx = point.x - drag.start.x;
    const double dy = point.y - drag.start.y;
    if (std::hypot(dx, dy) > 4) {
        drag.moved = true;
    }
    if (drag.moved) {
        scene.yaw = drag.yaw;
        scene.pitch = drag.pitch;
        tiltScene(scene, dx * 0.008, dy * 0.008);
    }
}
} // namespace lab
