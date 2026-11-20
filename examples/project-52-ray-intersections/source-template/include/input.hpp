#pragma once
#include "panel.hpp"

namespace picking {
struct Interaction {
    bool running = true;
    bool aimDrag = false;
    bool orbitDrag = false;
    bool redraw = true;
};

inline void releasePointer(Interaction& input) {
    input.aimDrag = false;
    input.orbitDrag = false;
    SDL_CaptureMouse(false);
}

#if LAB_CHECKPOINT >= 2
// [snippet aim-input]
inline void aimInput(Workshop& state, float x, float y) {
    state.u = std::clamp((x - aimRect.x) / aimRect.w, 0.0f, 1.0f);
    state.v = std::clamp((y - aimRect.y) / aimRect.h, 0.0f, 1.0f);
#if LAB_CHECKPOINT >= 7
    state.paused = true;
#endif
}

// [/snippet aim-input]
#endif

inline bool readInput(SDL_Renderer* renderer, Workshop& state, Interaction& input) {
    SDL_Event event{};
    while (SDL_PollEvent(&event)) {
        if (event.type != SDL_EVENT_MOUSE_MOTION || input.aimDrag || input.orbitDrag) {
            input.redraw = true;
        }
        if (event.type == SDL_EVENT_QUIT) {
            input.running = false;
        }
        if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
            releasePointer(input);
#if LAB_CHECKPOINT >= 7
            state.paused = true;
#endif
        }
        if (event.type == SDL_EVENT_KEY_DOWN) {
            if (event.key.key == SDLK_ESCAPE) {
                input.running = false;
            }
#if LAB_CHECKPOINT >= 1
            if (event.key.key == SDLK_R && !event.key.repeat) {
                releasePointer(input);
            }
            keyInput(state, event.key);
#endif
        }
#if LAB_CHECKPOINT >= 1
        // Convert once, before UI hit testing or normalizing the aim view.
        // [snippet event-coordinates]
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_BUTTON_UP || event.type == SDL_EVENT_MOUSE_MOTION) {
            if (!SDL_ConvertEventToRenderCoordinates(renderer, &event)) {
                return false;
            }
        }
        // [/snippet event-coordinates]
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
            if (input.aimDrag || input.orbitDrag) {
                continue;
            }
            const float x = event.button.x;
            const float y = event.button.y;
            if (event.button.button == SDL_BUTTON_LEFT && panelClick(state, x, y)) {
                continue;
            }
            if (event.button.button == SDL_BUTTON_RIGHT && x >= 0 && x < sceneWidth && y >= 0 && y < viewHeight) {
                input.orbitDrag = true;
                SDL_CaptureMouse(true);
            }
#if LAB_CHECKPOINT >= 2
            if (event.button.button == SDL_BUTTON_LEFT && inside(aimRect, x, y)) {
                input.aimDrag = true;
                SDL_CaptureMouse(true);
                aimInput(state, x, y);
            }
#endif
#if LAB_CHECKPOINT >= 7
            if (event.button.button == SDL_BUTTON_LEFT && (inside(stripRect, x, y) || inside(aimHeading, x, y))) {
                continue;
            }
            // Screen picking uses the OBSERVER camera, not the emitter camera.
            // [snippet observer-picking]
            if (event.button.button == SDL_BUTTON_LEFT && !inside(aimRect, x, y) && x >= 0 && x < sceneWidth && y >= 0 && y < viewHeight) {
                const auto pickRay = cameraRay(state.observer.camera(), x / sceneWidth, y / viewHeight, static_cast<double>(sceneWidth) / viewHeight);
                const auto hit = nearestHit(candidates(pickRay, state.scene));
                if (hit) {
                    state.selected = hit->objectId;
                }
            }
            // [/snippet observer-picking]
#endif
        }
        if (event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
            if ((event.button.button == SDL_BUTTON_LEFT && input.aimDrag) || (event.button.button == SDL_BUTTON_RIGHT && input.orbitDrag)) {
                releasePointer(input);
            }
        }
        if (event.type == SDL_EVENT_MOUSE_WHEEL) {
            state.observer.zoom(event.wheel.y);
        }
        if (event.type == SDL_EVENT_MOUSE_MOTION) {
            if (input.orbitDrag) {
                const bool shift = (SDL_GetModState() & SDL_KMOD_SHIFT) != 0;
                if (shift) {
                    state.observer.pan(event.motion.xrel, event.motion.yrel);
                } else {
                    state.observer.rotate(event.motion.xrel, event.motion.yrel);
                }
            }
#if LAB_CHECKPOINT >= 2
            if (input.aimDrag) {
                aimInput(state, event.motion.x, event.motion.y);
            }
#endif
        }
#else
        (void)renderer;
        (void)state;
#endif
    }
    return true;
}
} // namespace picking
