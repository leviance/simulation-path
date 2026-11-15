#pragma once

#include "panel.hpp"
#include "validation.hpp"
#include <iostream>

namespace heat {

inline Action keyAction(SDL_Keycode key) {
    if (key == SDLK_1) {
        return Action::Hot;
    }
    if (key == SDLK_2) {
        return Action::Cold;
    }
    if (key == SDLK_SPACE) {
        return Action::Run;
    }
    if (key == SDLK_N) {
        return Action::Step;
    }
    if (key == SDLK_R) {
        return Action::Reset;
    }
    if (key == SDLK_C) {
        return Action::Clear;
    }
    if (key == SDLK_H) {
        return Action::Heater;
    }
    if (key == SDLK_E) {
        return Action::EraseHeater;
    }
    if (key == SDLK_B) {
        return Action::Boundary;
    }
    if (key == SDLK_U) {
        return Action::Experiment;
    }
    if (key == SDLK_P) {
        return Action::Preset;
    }
    if (key == SDLK_G) {
        return Action::Resolution;
    }
    if (key == SDLK_LEFTBRACKET) {
        return Action::RadiusLess;
    }
    if (key == SDLK_RIGHTBRACKET) {
        return Action::RadiusMore;
    }
    if (key == SDLK_EQUALS) {
        return Action::Speed;
    }
    return Action::None;
}

inline void dispatch(SDL_Renderer* renderer, Action action, Field& field, Workshop& state) {
    state.endPointer();
    applyAction(action, field, state);
    setPresentation(renderer, field, state.showcase);
}

// Input sửa state; chỉ main được tiến solver, nên kéo slider không tạo tick ẩn.
inline void pollInput(SDL_Renderer* renderer, Field& field, Workshop& state, bool& running) {
    SDL_Event event{};
    while (SDL_PollEvent(&event)) {
        try {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                state.pause();
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_WINDOW_RESIZED || event.type == SDL_EVENT_WINDOW_MOUSE_LEAVE || event.type == SDL_EVENT_MOUSE_BUTTON_UP) {
                state.endPointer();
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                const SDL_Keycode key = event.key.key;
                if (key == SDLK_ESCAPE) {
                    running = false;
                }
                if (!event.key.repeat) {
                    dispatch(renderer, keyAction(key), field, state);
                }
#if LAB_CHECKPOINT >= 2
                const int stride = 1 + 15 * ((event.key.mod & SDL_KMOD_SHIFT) != 0);
                if (key == SDLK_LEFT) {
                    state.cursorX = std::max(0, state.cursorX - stride);
                }
                if (key == SDLK_RIGHT) {
                    state.cursorX = std::min(field.width - 1, state.cursorX + stride);
                }
                if (key == SDLK_UP) {
                    state.cursorY = std::max(0, state.cursorY - stride);
                }
                if (key == SDLK_DOWN) {
                    state.cursorY = std::min(field.height - 1, state.cursorY + stride);
                }
                if (key == SDLK_RETURN && !event.key.repeat) {
                    stamp(field, state, state.cursorX, state.cursorY, false);
                }
#endif
#if LAB_CHECKPOINT >= 6
                if (!event.key.repeat && key == SDLK_A) {
                    double delta = 0.25;
                    if ((event.key.mod & SDL_KMOD_SHIFT) != 0) {
                        delta = -delta;
                    }
                    setSlider(state, Slider::Diffusivity, (state.settings.diffusivity + delta) / 6);
                }
                if (!event.key.repeat && key == SDLK_T) {
                    const std::array<double, 6> values{1.0 / 120, 1.0 / 60, 1.0 / 30, 0.05, 0.075, 0.1};
                    int closest = 0;
                    for (int index = 1; index < static_cast<int>(values.size()); ++index) {
                        if (std::abs(values[static_cast<std::size_t>(index)] - state.settings.dt) < std::abs(values[static_cast<std::size_t>(closest)] - state.settings.dt)) {
                            closest = index;
                        }
                    }
                    int direction = 1;
                    if ((event.key.mod & SDL_KMOD_SHIFT) != 0) {
                        direction = -1;
                    }
                    const int next = (closest + direction + 6) % 6;
                    setSlider(state, Slider::Timestep, (values[static_cast<std::size_t>(next)] - 0.002) / 0.098);
                }
#endif
#if LAB_CHECKPOINT >= 7
                if (key == SDLK_F1 && !event.key.repeat) {
                    state.endPointer();
                    state.showcase = !state.showcase;
                    setPresentation(renderer, field, state.showcase);
                }
                if (key == SDLK_F2 && !event.key.repeat) {
                    state.showPins = !state.showPins;
                    state.dirty = true;
                }
#endif
#if LAB_CHECKPOINT >= 8
                if (key == SDLK_L && !event.key.repeat) {
                    selectProbe(field, state, state.cursorX, state.cursorY);
                    recordProbe(field, state);
                }
#endif
#if LAB_CHECKPOINT >= 9
                if (key == SDLK_V && !event.key.repeat) {
                    state.pause();
                    state.message = "SMALL CPU FIXTURES FAILED: inspect terminal";
                    if (validatePlate(std::cout)) {
                        state.message = "SMALL CPU FIXTURES PASS; scale/UI are separate checks";
                    }
                }
#endif
            }
#if LAB_CHECKPOINT >= 2
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION) {
                float windowX = 0;
                float windowY = 0;
                // SDL_Event là union: chỉ đọc nhánh đúng với event.type.
                if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
                    windowX = event.button.x;
                    windowY = event.button.y;
                } else {
                    windowX = event.motion.x;
                    windowY = event.motion.y;
                }
                float x = 0;
                float y = 0;
                // Đổi window sang logical đúng một lần, sau đó mới hit-test panel/tấm.
                requireSdl(SDL_RenderCoordinatesFromWindow(renderer, windowX, windowY, &x, &y), "pointer coordinates");
                const bool pressed = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN;
                if (pressed) {
                    state.endPointer();
                    if (event.button.button != SDL_BUTTON_LEFT && event.button.button != SDL_BUTTON_RIGHT) {
                        continue;
                    }
#if LAB_CHECKPOINT >= 6
                    if (!state.showcase && event.button.button == SDL_BUTTON_LEFT) {
                        if (inside({774, 146, 404, 28}, x, y)) {
                            state.dragging = Slider::Diffusivity;
                        } else if (inside({774, 212, 404, 28}, x, y)) {
                            state.dragging = Slider::Timestep;
                        }
                        if (state.dragging != Slider::None) {
                            SDL_CaptureMouse(true);
                        }
                    }
#endif
                    if (!state.showcase && state.dragging == Slider::None) {
                        const Action action = hitPanel(x, y);
                        if (action != Action::None) {
                            dispatch(renderer, action, field, state);
                            continue;
                        }
                    }
                }
#if LAB_CHECKPOINT >= 6
                if (state.dragging != Slider::None) {
                    setSlider(state, state.dragging, (x - 780) / 392);
                    continue;
                }
#endif
                int cellX = 0;
                int cellY = 0;
                if (!logicalCell(field, x, y, cellX, cellY, state.showcase)) {
                    state.previousValid = false;
                    continue;
                }
                state.cursorX = cellX;
                state.cursorY = cellY;
                if (pressed) {
#if LAB_CHECKPOINT >= 8
                    if ((SDL_GetModState() & SDL_KMOD_SHIFT) != 0) {
                        selectProbe(field, state, cellX, cellY);
                        recordProbe(field, state);
                        continue;
                    }
#endif
                    state.drawing = true;
                    state.erasing = event.button.button == SDL_BUTTON_RIGHT;
                    SDL_CaptureMouse(true);
                }
                if (state.drawing) {
                    stamp(field, state, cellX, cellY, !pressed);
                }
            }
#endif
        } catch (const std::exception& error) {
            state.pause();
            SDL_CaptureMouse(false);
            state.message = error.what();
            std::cerr << "Input rejected: " << error.what() << '\n';
        }
    }
}

} // namespace heat
