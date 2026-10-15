#pragma once
#include "view.hpp"

namespace photon {
struct Controls {
    Settings settings;
    int id = 0;
    int visible = maximumEvents + 1;
    int requested = 0;
#if LAB_CHECKPOINT >= 5
    int preset = 2;
#else
    int preset = 1;
#endif
    bool paused = true;
    bool dragging = false;
};

#if LAB_CHECKPOINT >= 2
// Mọi lệnh xem lại đều dừng chạy tự động; key repeat được lọc trong main.
inline void keyDown(SDL_Keycode key, Controls& controls, [[maybe_unused]] int vertices) {
    if (key != SDLK_SPACE) {
        controls.paused = true;
    }
    if (key == SDLK_B) {
        if (controls.settings.seed == 42) {
            controls.settings.seed = 2026;
        } else if (controls.settings.seed == 2026) {
            controls.settings.seed = 1;
        } else {
            controls.settings.seed = 42;
        }
    }
    if (key == SDLK_P) {
#if LAB_CHECKPOINT >= 5
        constexpr int presetCount = 4;
#else
        constexpr int presetCount = 2;
#endif
        controls.preset = (controls.preset + 1) % presetCount;
        controls.settings.muA = 0;
        controls.settings.muS = 0;
        if (controls.preset == 1 || controls.preset == 2) {
            controls.settings.muA = 0.4;
        }
#if LAB_CHECKPOINT >= 5
        if (controls.preset == 2) {
            controls.settings.muS = 0.9;
        }
        if (controls.preset == 3) {
            controls.settings.muS = 2;
        }
#endif
    }
    if (key == SDLK_A) {
        controls.settings.muA = std::max(0.0, controls.settings.muA - 0.1);
    }
    if (key == SDLK_D) {
        controls.settings.muA = std::min(3.0, controls.settings.muA + 0.1);
    }
    if (key == SDLK_UP) {
        controls.id = std::min(controls.settings.count - 1, controls.id + 1);
        controls.visible = maximumEvents + 1;
    }
    if (key == SDLK_DOWN) {
        controls.id = std::max(0, controls.id - 1);
        controls.visible = maximumEvents + 1;
    }
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_J) {
        controls.settings.muS = std::max(0.0, controls.settings.muS - 0.1);
    }
    if (key == SDLK_K) {
        controls.settings.muS = std::min(3.0, controls.settings.muS + 0.1);
    }
    if (key == SDLK_L) {
        controls.settings.eventLimit *= 8;
        if (controls.settings.eventLimit > 64) {
            controls.settings.eventLimit = 1;
        }
    }
    if (key == SDLK_LEFT) {
        controls.visible = std::max(0, std::min(controls.visible, vertices - 1) - 1);
    }
    if (key == SDLK_RIGHT) {
        controls.visible = std::min(vertices - 1, controls.visible + 1);
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_N) {
        controls.requested = 1;
    }
    if (key == SDLK_M) {
        controls.requested = 32;
    }
    if (key == SDLK_Q) {
        controls.settings.count *= 4;
        if (controls.settings.count > maximumPhotons) {
            controls.settings.count = 512;
        }
        controls.id = 0;
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_SPACE) {
        controls.paused = !controls.paused;
    }
#endif
    if (key == SDLK_R) {
        controls = {};
        SDL_CaptureMouse(false);
    }
}
#endif
} // namespace photon
