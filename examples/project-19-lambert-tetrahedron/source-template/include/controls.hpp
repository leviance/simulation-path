#pragma once
#include "scene.hpp"
#include <SDL3/SDL.h>

namespace lab {
// Phím toggle bỏ qua repeat; phím giữ được tích phân riêng theo thời gian.
inline void handleKey(Scene& scene, SDL_Keycode key, bool repeat) {
    if (repeat) {
        return;
    }
    if (key == SDLK_R) {
        scene = Scene{};
    }
    if (key == SDLK_F) {
        scene.debug = !scene.debug;
    }
#if LAB_CHECKPOINT >= 1
    if (key == SDLK_T) {
        scene.selectedFace = (scene.selectedFace + 1) % 12;
        scene.debug = true;
    }
#endif
#if LAB_CHECKPOINT >= 2
    if (key == SDLK_N) {
        scene.normals = !scene.normals;
        scene.debug = true;
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (key >= SDLK_1 && key <= SDLK_4) {
        lightPreset(scene, int(key - SDLK_0));
    }
    if (key == SDLK_SPACE) {
        scene.paused = !scene.paused;
    }
    if (key == SDLK_PERIOD) {
        scene.paused = false;
        advanceScene(scene, 1.0 / 60.0);
        scene.paused = true;
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (key == SDLK_L) {
        scene.lighting = !scene.lighting;
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_P) {
        scene.palette = !scene.palette;
    }
    if (key == SDLK_5) {
        scene.ambient = std::max(0.0, scene.ambient - 0.05);
    }
    if (key == SDLK_6) {
        scene.ambient = std::min(1.0, scene.ambient + 0.05);
    }
    if (key == SDLK_7) {
        scene.diffuseStrength = std::max(0.0, scene.diffuseStrength - 0.05);
    }
    if (key == SDLK_8) {
        scene.diffuseStrength = std::min(1.0, scene.diffuseStrength + 0.05);
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_M) {
        if (scene.dragTarget == DragTarget::model) {
            scene.dragTarget = DragTarget::camera;
        } else {
            scene.dragTarget = DragTarget::model;
        }
    }
    if (key == SDLK_C) {
        scene.culling = !scene.culling;
    }
#endif
}

inline bool heldInput(Scene& scene, const bool* keys, double dt) {
    dt = std::clamp(dt, 0.0, 0.05);
    bool changed = false;
#if LAB_CHECKPOINT >= 1
    const double dx = double(int(keys[SDL_SCANCODE_D] || keys[SDL_SCANCODE_RIGHT]) - int(keys[SDL_SCANCODE_A] || keys[SDL_SCANCODE_LEFT]));
    const double dy = double(int(keys[SDL_SCANCODE_S] || keys[SDL_SCANCODE_DOWN]) - int(keys[SDL_SCANCODE_W] || keys[SDL_SCANCODE_UP]));
    if (dx != 0 || dy != 0) {
        rotateSelection(scene, dx * dt, dy * dt);
        changed = true;
    }
#endif
#if LAB_CHECKPOINT >= 3
    const int lightAxis = int(keys[SDL_SCANCODE_E]) - int(keys[SDL_SCANCODE_Q]);
    const int elevationAxis = int(keys[SDL_SCANCODE_RIGHTBRACKET]) - int(keys[SDL_SCANCODE_LEFTBRACKET]);
    if (lightAxis != 0 || elevationAxis != 0) {
        scene.lightAzimuth += double(lightAxis) * dt;
        scene.lightElevation = std::clamp(scene.lightElevation + double(elevationAxis) * dt, -1.4, 1.4);
        scene.paused = true;
        changed = true;
    }
#endif
    (void)keys;
    (void)dt;
    (void)scene;
    return changed;
}
} // namespace lab
