#pragma once
#include "scene.hpp"
#include <SDL3/SDL.h>

namespace lab {
// Toggle xử lý một lần theo key-down; giữ phím xoay dùng dt trong heldInput.
inline void handleKey(Scene& scene, SDL_Keycode key, bool repeat) {
    if (repeat) {
        return;
    }
    if (key == SDLK_R) {
        scene = Scene{};
    }
#if LAB_CHECKPOINT >= 1
    if (key >= SDLK_1 && key <= SDLK_3) {
        applyPreset(scene, int(key - SDLK_0));
    }
#endif
#if LAB_CHECKPOINT >= 2
    if (key == SDLK_T) {
        if (scene.address == AddressMode::clamp) {
            scene.address = AddressMode::repeat;
        } else {
            scene.address = AddressMode::clamp;
        }
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_M) {
        scene.corrected = !scene.corrected;
        scene.compare = false;
    }
    if (key == SDLK_C) {
        scene.compare = !scene.compare;
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_4) {
        applyPreset(scene, 4);
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_F) {
        scene.debug = !scene.debug;
    }
    if (key == SDLK_SPACE) {
        scene.paused = !scene.paused;
    }
    if (key == SDLK_PERIOD) {
        scene.paused = true;
        advanceScene(scene, 1.0 / 60.0, true);
    }
#endif
}

inline bool heldInput(Scene& scene, const bool* keys, double dt) {
#if LAB_CHECKPOINT >= 1
    double yaw = 0;
    double pitch = 0;
    if (keys[SDL_SCANCODE_A] || keys[SDL_SCANCODE_LEFT]) {
        yaw -= 1;
    }
    if (keys[SDL_SCANCODE_D] || keys[SDL_SCANCODE_RIGHT]) {
        yaw += 1;
    }
    if (keys[SDL_SCANCODE_W] || keys[SDL_SCANCODE_UP]) {
        pitch -= 1;
    }
    if (keys[SDL_SCANCODE_S] || keys[SDL_SCANCODE_DOWN]) {
        pitch += 1;
    }
    if (yaw != 0 || pitch != 0) {
        tiltScene(scene, yaw * std::clamp(dt, 0.0, 0.05), pitch * std::clamp(dt, 0.0, 0.05));
        return true;
    }
#if LAB_CHECKPOINT == 2
    if (keys[SDL_SCANCODE_J] || keys[SDL_SCANCODE_L] || keys[SDL_SCANCODE_I] || keys[SDL_SCANCODE_K]) {
        const double step = std::clamp(dt, 0.0, 0.05);
        if (keys[SDL_SCANCODE_L]) {
            scene.sampleUv.x += step;
        }
        if (keys[SDL_SCANCODE_J]) {
            scene.sampleUv.x -= step;
        }
        if (keys[SDL_SCANCODE_K]) {
            scene.sampleUv.y += step;
        }
        if (keys[SDL_SCANCODE_I]) {
            scene.sampleUv.y -= step;
        }
        scene.sampleUv.x = std::clamp(scene.sampleUv.x, -0.5, 1.5);
        scene.sampleUv.y = std::clamp(scene.sampleUv.y, -0.5, 1.5);
        return true;
    }
#endif
#else
    (void)scene;
    (void)keys;
    (void)dt;
#endif
    return false;
}
} // namespace lab
