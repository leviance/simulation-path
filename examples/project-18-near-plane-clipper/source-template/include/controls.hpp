#pragma once
#include "scene.hpp"
#include <SDL3/SDL_keycode.h>

namespace lab {
// A/D được main lưu dưới dạng held state; các lệnh ở đây thay Scene một lần.
inline void handleKey(Scene& scene, SDL_Keycode key, bool repeat) {
#if LAB_CHECKPOINT >= 1
    if (!repeat && (key == SDLK_R || (key >= SDLK_1 && key <= SDLK_5))) {
        int preset = scene.preset;
        if (key != SDLK_R) {
            preset = static_cast<int>(key - SDLK_0);
        }
        resetScene(scene, preset);
    }
    if (key == SDLK_W) {
        scene.nearPlane = std::min(2.0, scene.nearPlane + 0.05);
        scene.paused = true;
    }
    if (key == SDLK_S) {
        scene.nearPlane = std::max(0.25, scene.nearPlane - 0.05);
        scene.paused = true;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (!repeat && key == SDLK_V) {
        scene.clipping = !scene.clipping;
        scene.paused = true;
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (!repeat && key == SDLK_SPACE) {
        scene.paused = !scene.paused;
    }
    if (!repeat && key == SDLK_N && scene.paused) {
        stepSweep(scene, 0.08);
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (!repeat && key == SDLK_F) {
        scene.debug = !scene.debug;
    }
    if (key == SDLK_J) {
        scene.camera.x = std::max(-1.0, scene.camera.x - 0.1);
        scene.paused = true;
    }
    if (key == SDLK_L) {
        scene.camera.x = std::min(1.0, scene.camera.x + 0.1);
        scene.paused = true;
    }
    if (key == SDLK_I) {
        scene.camera.z = std::min(0.5, scene.camera.z + 0.1);
        scene.paused = true;
    }
    if (key == SDLK_K) {
        scene.camera.z = std::max(-0.5, scene.camera.z - 0.1);
        scene.paused = true;
    }
#endif

    (void)scene;
    (void)key;
    (void)repeat;
}
} // namespace lab
