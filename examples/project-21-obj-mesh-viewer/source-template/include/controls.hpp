#pragma once
#include "viewer.hpp"
#include <SDL3/SDL.h>

namespace lab {
// Toggle dùng key-down, chuyển động giữ phím dùng delta time.
inline void handleKey(ViewerState& state, SDL_Keycode key, bool repeat) {
    if (repeat) {
        return;
    }
    if (key == SDLK_R) {
        state = ViewerState{};
    }
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_C) {
        state.cullBackfaces = !state.cullBackfaces;
    }
    if (key == SDLK_N) {
        state.normals = !state.normals;
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_O) {
        state.reverseOrder = !state.reverseOrder;
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_V) {
        state.cameraDrag = !state.cameraDrag;
    }
    if (key == SDLK_W) {
        state.wireframe = !state.wireframe;
    }
#endif
    if (key == SDLK_F) {
        state.debug = !state.debug;
    }
    if (key == SDLK_G) {
        state.grid = !state.grid;
    }
    if (key == SDLK_SPACE) {
        state.paused = !state.paused;
    }
    if (key == SDLK_PERIOD) {
        state.paused = true;
        advanceViewer(state, 1.0 / 60.0, true);
    }
}

inline bool heldInput(ViewerState& state, const bool* keys, double dt) {
#if LAB_CHECKPOINT >= 1
    double horizontal = 0.0;
    double vertical = 0.0;
    if (keys[SDL_SCANCODE_LEFT]) {
        horizontal -= 1.0;
    }
    if (keys[SDL_SCANCODE_RIGHT]) {
        horizontal += 1.0;
    }
    if (keys[SDL_SCANCODE_UP]) {
        vertical -= 1.0;
    }
    if (keys[SDL_SCANCODE_DOWN]) {
        vertical += 1.0;
    }
    if (horizontal != 0.0 || vertical != 0.0) {
        turnViewer(state, horizontal * std::clamp(dt, 0.0, 0.05), vertical * std::clamp(dt, 0.0, 0.05));
        return true;
    }
#else
    (void)state;
    (void)keys;
    (void)dt;
#endif
    return false;
}
} // namespace lab
