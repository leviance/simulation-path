#pragma once
#include "scene.hpp"
#include <SDL3/SDL_keycode.h>

namespace lab {
// main hủy capture trước khi gọi các lệnh thay Scene.
inline void handleKey(Scene& scene, SDL_Keycode key, bool repeat) {
#if LAB_CHECKPOINT >= 1
    if (!repeat && (key == SDLK_R || (key >= SDLK_1 && key <= SDLK_3))) {
        int preset = 1;
        if (key != SDLK_R) {
            preset = static_cast<int>(key - SDLK_0);
        }
        resetScene(scene, preset);
    }
    if (key == SDLK_LEFT) {
        scene.angleY -= 0.08;
        scene.paused = true;
    }
    if (key == SDLK_RIGHT) {
        scene.angleY += 0.08;
        scene.paused = true;
    }
    if (key == SDLK_UP) {
        scene.angleX -= 0.08;
        scene.paused = true;
    }
    if (key == SDLK_DOWN) {
        scene.angleX += 0.08;
        scene.paused = true;
    }
#endif
#if LAB_CHECKPOINT >= 2
    if (!repeat && key == SDLK_O) {
        scene.reverseOrder = !scene.reverseOrder;
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (!repeat && key == SDLK_D) {
        scene.depthEnabled = !scene.depthEnabled;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (!repeat && key == SDLK_SPACE) {
        scene.paused = !scene.paused;
    }
    if (!repeat && key == SDLK_N && scene.paused) {
        scene.angleY += 0.08;
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (!repeat && key == SDLK_V && scene.debug) {
        scene.depthView = !scene.depthView;
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (!repeat && key == SDLK_C) {
        scene.cullEnabled = !scene.cullEnabled;
    }
#endif
#if LAB_CHECKPOINT >= 9
    if (!repeat && key == SDLK_F) {
        scene.debug = !scene.debug;
        scene.depthView = false;
    }
    if (key == SDLK_J) {
        scene.camera.x = std::max(-1.0, scene.camera.x - 0.1);
    }
    if (key == SDLK_L) {
        scene.camera.x = std::min(1.0, scene.camera.x + 0.1);
    }
    if (key == SDLK_I) {
        scene.camera.z = std::min(0.5, scene.camera.z + 0.1);
    }
    if (key == SDLK_K) {
        scene.camera.z = std::max(-0.5, scene.camera.z - 0.1);
    }
#endif

    (void)scene;
    (void)key;
    (void)repeat;
}
} // namespace lab
