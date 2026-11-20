#pragma once
#if LAB_CHECKPOINT >= 5901
#include "field-scene.hpp"
#include <SDL3/SDL.h>

namespace trail {

// Một lần nhấn chỉ đổi đúng công cụ đang thử; nhìn bằng chuột vẫn xử lý trong vòng lặp SDL.
inline void fieldKey(Scene& scene, SDL_Keycode key) {
    if (key == SDLK_F2)
        scene.toggleMesher();
#if LAB_CHECKPOINT >= 5903
    // [snippet shelter-key]
    if (key == SDLK_5) {
        scene.preset = 4;
        scene.generate();
    }
    if (key == SDLK_M)
        scene.weather.wire = !scene.weather.wire;
    // [/snippet shelter-key]
#endif
#if LAB_CHECKPOINT >= 6001
    // [snippet sight-key]
    if (key == SDLK_F3)
        scene.showProbe = !scene.showProbe;
    // [/snippet sight-key]
#endif
#if LAB_CHECKPOINT >= 6003
    // [snippet freeze-key]
    if (key == SDLK_I)
        scene.holdHit = !scene.holdHit;
    // [/snippet freeze-key]
#endif
#if LAB_CHECKPOINT >= 6102
    // [snippet wind-keys]
    if (key == SDLK_LEFTBRACKET)
        scene.weather.windSpeed = std::max(0.0, scene.weather.windSpeed - 0.25);
    if (key == SDLK_RIGHTBRACKET)
        scene.weather.windSpeed = std::min(3.0, scene.weather.windSpeed + 0.25);
    if (key == SDLK_G)
        scene.weather.windAngle += pi / 4;
    // [/snippet wind-keys]
#endif
#if LAB_CHECKPOINT >= 6202
    // [snippet budget-key]
    if (key == SDLK_J)
        scene.stream.budget = 3 - scene.stream.budget;
    // [/snippet budget-key]
#endif
#if LAB_CHECKPOINT >= 6203
    // [snippet cloud-key]
    if (key == SDLK_C)
        scene.weather.clouds = !scene.weather.clouds;
    // [/snippet cloud-key]
#endif
#if LAB_CHECKPOINT >= 6204
    // [snippet ready-key]
    if (key == SDLK_L) {
        scene.auditResult = "Loading or repairing borders";
        if (scene.stream.complete(scene.region))
            scene.auditResult = "PASS: 5x5 resident, queue empty, all borders ready";
        scene.debug = true;
    }
    // [/snippet ready-key]
#endif
#if LAB_CHECKPOINT >= 6302
    // [snippet seed-key]
    if (key == SDLK_N) {
        ++scene.region.seed;
        scene.generate();
    }
    // [/snippet seed-key]
#endif
#if LAB_CHECKPOINT >= 6305
    // [snippet landmark-keys]
    if (key >= SDLK_F5 && key <= SDLK_F9) {
        scene.landmark = int(key - SDLK_F5);
        scene.preset = 2;
        scene.resetPose();
    }
    // [/snippet landmark-keys]
#endif
#if LAB_CHECKPOINT >= 6401
    if (key == SDLK_T)
        scene.snowEnabled = !scene.snowEnabled;
#endif
#if LAB_CHECKPOINT >= 6402
    if (key == SDLK_MINUS)
        scene.startHour = std::fmod(scene.startHour + 22, 24.0);
    if (key == SDLK_EQUALS)
        scene.startHour = std::fmod(scene.startHour + 2, 24.0);
#endif
#if LAB_CHECKPOINT >= 6403
    if (key == SDLK_F) {
        scene.flying = !scene.flying;
        scene.rise = 0;
    }
    // [snippet jump-key]
    if (key == SDLK_SPACE && scene.grounded && !scene.flying) {
        scene.rise = 6.5;
        scene.grounded = false;
    }
    // [/snippet jump-key]
#endif
}
} // namespace trail
#endif
