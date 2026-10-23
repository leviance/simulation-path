#pragma once
#include "simulation.hpp"
#include <SDL3/SDL.h>

namespace lab {
// Phím sửa cấu hình NEXT; chỉ fire mới chụp nó vào một Shot độc lập.
inline bool handleKey(Experiment& experiment, SDL_Keycode key, bool repeat) {
    Settings& settings = experiment.settings;

    if (key == SDLK_LEFT) {
        settings.speed = std::max(4.0, settings.speed - 1.0);
    } else if (key == SDLK_RIGHT) {
        settings.speed = std::min(32.0, settings.speed + 1.0);
    } else if (key == SDLK_UP) {
        settings.angle = std::min(85.0 * kPi / 180.0, settings.angle + kPi / 180.0);
    } else if (key == SDLK_DOWN) {
        settings.angle = std::max(5.0 * kPi / 180.0, settings.angle - kPi / 180.0);
    } else if (!repeat && key == SDLK_R) {
        experiment = {};
    } else if (!repeat && key == SDLK_F) {
        experiment.debug = !experiment.debug;
#if LAB_CHECKPOINT >= 3
    } else if (key == SDLK_G) {
        settings.gravity = std::max(2.5, settings.gravity - 0.5);
    } else if (key == SDLK_H) {
        settings.gravity = std::min(25.0, settings.gravity + 0.5);
#endif
#if LAB_CHECKPOINT >= 4
    } else if (!repeat && key == SDLK_RETURN) {
        fire(experiment);
    } else if (!repeat && key == SDLK_SPACE) {
        experiment.paused = !experiment.paused;
    } else if (!repeat && key == SDLK_N) {
        singleStep(experiment);
    } else if (!repeat && key >= SDLK_1 && key <= SDLK_3) {
        settings = {};
        settings.speed = 24.0;
        if (key == SDLK_1) {
            settings.angle = 18.0 * kPi / 180.0;
        } else if (key == SDLK_2) {
            settings.angle = 75.0 * kPi / 180.0;
        } else {
            settings.gravity = 3.0;
            settings.fixedDt = 1.0 / 15.0;
        }
#endif
#if LAB_CHECKPOINT >= 5
    } else if (!repeat && key == SDLK_LEFTBRACKET) {
        settings.fixedDt = std::min(1.0 / 15.0, settings.fixedDt * 2.0);
    } else if (!repeat && key == SDLK_RIGHTBRACKET) {
        settings.fixedDt = std::max(1.0 / 240.0, settings.fixedDt * 0.5);
#endif
    } else {
        return false;
    }

    return true;
}
} // namespace lab
