#pragma once
#include "view.hpp"

namespace ct {
struct Controls {
    Settings settings;
    int column = 64;
    int row = 0;
    bool paused = true;
    bool dragging = false;
    bool step = false;
    double displayRange = 2;
    bool invert = false;
    bool trace = false;
};

#if LAB_CHECKPOINT >= 2
// One key press performs one action; repeat never starts another scan.
inline void keyDown(SDL_Keycode key, Controls& controls) {
    if (key == SDLK_LEFT || key == SDLK_RIGHT || key == SDLK_UP || key == SDLK_DOWN) {
        controls.paused = true;
    }
    if (key == SDLK_LEFT) {
        controls.column = std::max(0, controls.column - 1);
    }
    if (key == SDLK_RIGHT) {
        controls.column = std::min(detectorCount - 1, controls.column + 1);
    }
    if (key == SDLK_UP) {
        controls.row = std::max(0, controls.row - 1);
    }
    if (key == SDLK_DOWN) {
        controls.row = std::min(controls.settings.views - 1, controls.row + 1);
    }
#if LAB_CHECKPOINT >= 4
    if (key == SDLK_P) {
        controls.settings.preset = (controls.settings.preset + 1) % 3;
    }
    if (key == SDLK_W) {
        controls.settings.strength = std::min(2.0, controls.settings.strength + 0.1);
    }
    if (key == SDLK_S) {
        controls.settings.strength = std::max(0.0, controls.settings.strength - 0.1);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_N) {
        controls.paused = true;
        controls.step = true;
    }
    if (key == SDLK_I) {
        controls.invert = !controls.invert;
    }
    if (key == SDLK_L) {
        controls.displayRange += 1;
        if (controls.displayRange > 4) {
            controls.displayRange = 1;
        }
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_SPACE) {
        controls.paused = !controls.paused;
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_T) {
        controls.trace = !controls.trace;
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_Q) {
        controls.settings.views *= 2;
        if (controls.settings.views > 120) {
            controls.settings.views = 30;
        }
        controls.row = 0;
    }
#endif
    if (key == SDLK_R) {
        controls = {};
        SDL_CaptureMouse(false);
    }
}
#endif
} // namespace ct
