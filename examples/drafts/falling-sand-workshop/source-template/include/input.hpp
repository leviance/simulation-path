#pragma once

#include "panel.hpp"
#include "validation.hpp"

namespace sand {

inline void keyInput(SDL_Keycode key, Grid& grid, Workshop& state) {
    Action action = Action::None;
    switch (key) {
    case SDLK_1:
        action = Action::Sand;
        break;
    case SDLK_2:
        action = Action::Wall;
        break;
    case SDLK_3:
        action = Action::Water;
        break;
    case SDLK_4:
        action = Action::Erase;
        break;
    case SDLK_LEFTBRACKET:
        action = Action::RadiusLess;
        break;
    case SDLK_RIGHTBRACKET:
        action = Action::RadiusMore;
        break;
    case SDLK_SPACE:
        action = Action::Run;
        break;
    case SDLK_N:
        action = Action::Step;
        break;
    case SDLK_EQUALS:
        action = Action::Speed;
        break;
    case SDLK_R:
        action = Action::Reset;
        break;
    case SDLK_K:
        action = Action::Clear;
        break;
    case SDLK_P:
        action = Action::Preset;
        break;
    case SDLK_B:
        action = Action::Seed;
        break;
    case SDLK_O:
        action = Action::Order;
        break;
    default:
        break;
    }
    applyAction(action, grid, state);
#if LAB_CHECKPOINT >= 2
    if (key == SDLK_RETURN) {
        stamp(grid, state, state.cursorX, state.cursorY, false);
        state.previousValid = false;
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_F2) {
        state.plain = !state.plain;
        state.dirty = true;
    }
#endif
#if LAB_CHECKPOINT >= 9
    if (key == SDLK_V) {
        state.pause();
        const Validation result = validateScene();
        state.message = "SMALL RULE FIXTURES: FAIL";
        if (result.passed()) {
            state.message = "SMALL RULE FIXTURES: PASS (large-scale benchmark is separate)";
        }
    }
#endif
}

inline void setPresentation(SDL_Renderer* renderer, const Grid& grid, bool showcase) {
#if LAB_CHECKPOINT >= 7
    if (!showcase) {
        requireSdl(SDL_SetRenderLogicalPresentation(renderer, 1120, 760, SDL_LOGICAL_PRESENTATION_LETTERBOX), "workshop presentation");
        return;
    }
#else
    static_cast<void>(showcase);
#endif
    requireSdl(SDL_SetRenderLogicalPresentation(renderer, grid.width, grid.height, SDL_LOGICAL_PRESENTATION_LETTERBOX), "grid presentation");
}

inline void pollInput(SDL_Renderer* renderer, Grid& grid, Workshop& state, bool& running) {
    static_cast<void>(renderer);
    SDL_Event event{};
    while (SDL_PollEvent(&event)) {
        if (event.type == SDL_EVENT_QUIT) {
            running = false;
        } else if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
            state.pause();
        } else if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_MOUSE_LEAVE) {
            state.endStroke();
        } else if (event.type == SDL_EVENT_KEY_DOWN) {
            const SDL_Keycode key = event.key.key;
            if (key == SDLK_ESCAPE || key == SDLK_Q) {
                running = false;
            }
#if LAB_CHECKPOINT >= 2
            int stride = 1;
            if ((event.key.mod & SDL_KMOD_SHIFT) != 0) {
                stride = 16;
            }
            if (key == SDLK_LEFT) {
                state.cursorX = std::max(0, state.cursorX - stride);
            } else if (key == SDLK_RIGHT) {
                state.cursorX = std::min(grid.width - 1, state.cursorX + stride);
            } else if (key == SDLK_UP) {
                state.cursorY = std::max(0, state.cursorY - stride);
            } else if (key == SDLK_DOWN) {
                state.cursorY = std::min(grid.height - 1, state.cursorY + stride);
            }
#endif
            if (!event.key.repeat) {
                try {
                    keyInput(key, grid, state);
#if LAB_CHECKPOINT >= 7
                    if (key == SDLK_F1) {
                        state.showcase = !state.showcase;
                        state.endStroke();
                        setPresentation(renderer, grid, state.showcase);
                    }
#endif
                } catch (const std::exception& error) {
                    state.pause();
                    state.message = error.what();
                }
            }
        }
#if LAB_CHECKPOINT >= 2
        else if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
            if (event.button.button != SDL_BUTTON_LEFT && event.button.button != SDL_BUTTON_RIGHT) {
                continue;
            }
            state.endStroke();
#if LAB_CHECKPOINT >= 8
            if (!state.showcase && event.button.button == SDL_BUTTON_LEFT) {
                float logicalX = 0;
                float logicalY = 0;
                requireSdl(SDL_RenderCoordinatesFromWindow(renderer, event.button.x, event.button.y, &logicalX, &logicalY), "panel pointer");
                const Action action = hitPanel(logicalX, logicalY);
                if (action != Action::None) {
                    try {
                        applyAction(action, grid, state);
                    } catch (const std::exception& error) {
                        state.pause();
                        state.message = error.what();
                    }
                    continue;
                }
            }
#endif
            int x = 0;
            int y = 0;
            if (mouseCell(renderer, grid, event.button.x, event.button.y, x, y, state.showcase)) {
                state.drawing = true;
                state.erasing = event.button.button == SDL_BUTTON_RIGHT;
                stamp(grid, state, x, y, false);
            }
        } else if (event.type == SDL_EVENT_MOUSE_MOTION) {
            int x = 0;
            int y = 0;
            if (mouseCell(renderer, grid, event.motion.x, event.motion.y, x, y, state.showcase)) {
                state.cursorX = x;
                state.cursorY = y;
                if (state.drawing) {
                    stamp(grid, state, x, y, true);
                }
            } else {
                state.previousValid = false;
            }
        } else if (event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
            state.endStroke();
        }
#endif
    }
}

} // namespace sand
