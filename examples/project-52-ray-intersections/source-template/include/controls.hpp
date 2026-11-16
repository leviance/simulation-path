#pragma once
#include "workshop.hpp"
#include <SDL3/SDL.h>

namespace picking {
enum class Action { select,
                    moveObject,
                    moveSource,
                    aim,
                    preset,
                    pause,
                    reset,
                    debug,
                    range,
                    orbit,
                    zoom,
                    pan };

// Mouse buttons and keys share this dispatcher; neither reimplements geometry.
inline void perform(Workshop& state, Action action, int value = 0, Vec3 delta = {}) {
    if (action == Action::select) {
        state.selected = std::clamp(value, 0, 3);
    } else if (action == Action::moveObject) {
        translateObject(state.scene, state.selected, delta);
    } else if (action == Action::reset) {
        state = {};
    } else if (action == Action::debug) {
        state.debug = !state.debug;
    } else if (action == Action::orbit) {
        state.observer.rotate(delta.x, delta.y);
    } else if (action == Action::pan) {
        state.observer.pan(delta.x, delta.y);
    } else if (action == Action::zoom) {
        state.observer.zoom(delta.x);
    }
#if LAB_CHECKPOINT >= 2
    else if (action == Action::moveSource) {
        state.moveSource(delta);
    } else if (action == Action::aim) {
        state.aimAtSelected();
    } else if (action == Action::range) {
        state.tMax = std::clamp(state.tMax + value, 0.1, 30.0);
    }
#endif
#if LAB_CHECKPOINT >= 7
    else if (action == Action::pause) {
        state.paused = !state.paused;
    } else if (action == Action::preset) {
        state.preset(value);
    }
    if (action == Action::moveObject || action == Action::moveSource || action == Action::aim || action == Action::range) {
        state.paused = true;
    }
#endif
}

inline void keyInput(Workshop& state, const SDL_KeyboardEvent& key) {
    const bool ctrl = (key.mod & SDL_KMOD_CTRL) != 0;
    const bool shift = (key.mod & SDL_KMOD_SHIFT) != 0;
    Vec3 arrow{};
    if (key.key == SDLK_LEFT) {
        arrow.x = -8;
    } else if (key.key == SDLK_RIGHT) {
        arrow.x = 8;
    } else if (key.key == SDLK_UP) {
        arrow.y = -8;
    } else if (key.key == SDLK_DOWN) {
        arrow.y = 8;
    }
    if (ctrl) {
        if (shift) {
            perform(state, Action::pan, 0, arrow);
        } else {
            perform(state, Action::orbit, 0, arrow);
        }
        return;
    }
    if (key.key >= SDLK_1 && key.key <= SDLK_4) {
        perform(state, Action::select, static_cast<int>(key.key - SDLK_1));
    }
    if (key.key == SDLK_A)
        perform(state, Action::moveObject, 0, {-0.1, 0, 0});
    if (key.key == SDLK_D)
        perform(state, Action::moveObject, 0, {0.1, 0, 0});
    if (key.key == SDLK_W)
        perform(state, Action::moveObject, 0, {0, 0, 0.1});
    if (key.key == SDLK_S)
        perform(state, Action::moveObject, 0, {0, 0, -0.1});
    if (key.key == SDLK_Q)
        perform(state, Action::moveObject, 0, {0, -0.1, 0});
    if (key.key == SDLK_E)
        perform(state, Action::moveObject, 0, {0, 0.1, 0});
    if (key.key == SDLK_PAGEUP)
        perform(state, Action::zoom, 0, {1, 0, 0});
    if (key.key == SDLK_PAGEDOWN)
        perform(state, Action::zoom, 0, {-1, 0, 0});
#if LAB_CHECKPOINT >= 2
    if (arrow.x != 0 || arrow.y != 0) {
        state.u = std::clamp(state.u + arrow.x * 0.0025, 0.0, 1.0);
        state.v = std::clamp(state.v + arrow.y * 0.0025, 0.0, 1.0);
#if LAB_CHECKPOINT >= 7
        state.paused = true;
#endif
    }
    if (key.key == SDLK_J)
        perform(state, Action::moveSource, 0, {-0.1, 0, 0});
    if (key.key == SDLK_L)
        perform(state, Action::moveSource, 0, {0.1, 0, 0});
    if (key.key == SDLK_I)
        perform(state, Action::moveSource, 0, {0, 0, 0.1});
    if (key.key == SDLK_K)
        perform(state, Action::moveSource, 0, {0, 0, -0.1});
    if (key.key == SDLK_U)
        perform(state, Action::moveSource, 0, {0, -0.1, 0});
    if (key.key == SDLK_O)
        perform(state, Action::moveSource, 0, {0, 0.1, 0});
    if (key.key == SDLK_F)
        perform(state, Action::aim);
    if (key.key == SDLK_EQUALS || key.key == SDLK_PLUS)
        perform(state, Action::range, 1);
    if (key.key == SDLK_MINUS)
        perform(state, Action::range, -1);
#endif
    if (!key.repeat) {
        if (key.key == SDLK_R)
            perform(state, Action::reset);
        if (key.key == SDLK_B)
            perform(state, Action::debug);
#if LAB_CHECKPOINT >= 7
        if (key.key == SDLK_SPACE)
            perform(state, Action::pause);
        if (key.key >= SDLK_5 && key.key <= SDLK_8)
            perform(state, Action::preset, static_cast<int>(key.key - SDLK_5));
#endif
    }
}
} // namespace picking
