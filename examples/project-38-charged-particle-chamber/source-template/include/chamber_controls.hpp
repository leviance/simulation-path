#pragma once
#include "chamber_camera.hpp"
#include "gl_api.hpp"

namespace chamber {

struct Controls {
    // Input edits STAGED settings; the application validates and publishes them separately.
    Camera camera{};
    bool running{true};
    bool paused{};
    bool singleStep{};
    bool debug{true};
    bool showTrails{true};
    bool bySpeed{};
#if LAB_CHECKPOINT >= 12
    bool showcase{true};
#else
    bool showcase{};
#endif
    bool apply{};
    bool reset{};
    bool validate{};
    bool benchmark{};
    bool cancel{};
    bool focus{};
    bool picking{};
    bool dragging{};
    bool panning{};
    float dragDistance{};
    float pickX{}, pickY{};
    int selectedControl{};
    std::uint32_t selectedParticle{};
#if LAB_CHECKPOINT >= 2
    Settings staged{};
    bool stagedChanged{};

    void edit(int direction, bool coarse, std::size_t activeCount) {
        if (selectedControl == 13) {
            const int increment = direction * (1 + 99 * static_cast<int>(coarse));
            const auto id = std::clamp(static_cast<std::int64_t>(selectedParticle) + increment, std::int64_t{0}, static_cast<std::int64_t>(activeCount - 1U));
            selectedParticle = static_cast<std::uint32_t>(id);
            return;
        }
        stagedChanged = true;
        if (selectedControl == 0) {
            const std::array<std::size_t, 4> counts{256U, 10'000U, 1'000'000U, 5'000'000U};
            const auto found = std::lower_bound(counts.begin(), counts.end(), staged.count);
            int index = static_cast<int>(std::distance(counts.begin(), found));
            index = std::clamp(index + direction, 0, 3);
            staged.count = counts[static_cast<std::size_t>(index)];
        } else if (selectedControl == 1)
            staged.seed += static_cast<std::uint32_t>(direction);
        else if (selectedControl == 2) {
            float factor = 2.0F;
            if (direction < 0)
                factor = 0.5F;
            staged.dt = std::clamp(staged.dt * factor, 1.0F / 960.0F, 1.0F / 30.0F);
        } else if (selectedControl == 3) {
            staged.fields.chargeScale = std::clamp(staged.fields.chargeScale + direction * 0.25F, -4.0F, 4.0F);
        } else {
            std::array<float*, 9> fields{&staged.fields.electric.x, &staged.fields.electric.y, &staged.fields.electric.z, &staged.fields.magnetic.x, &staged.fields.magnetic.y, &staged.fields.magnetic.z, &staged.initialVelocity.x, &staged.initialVelocity.y, &staged.initialVelocity.z};
            const int component = selectedControl - 4;
            if (component >= 0 && component < static_cast<int>(fields.size())) {
                float& value = *fields[static_cast<std::size_t>(component)];
                value = std::clamp(value + direction * 0.25F, -4.0F, 4.0F);
            }
        }
    }
#endif

    void cancelDrag() {
        dragging = false;
        panning = false;
        SDL_CaptureMouse(false);
    }

    void event(const SDL_Event& event, int logicalWidth, std::size_t activeCount) {
        if (event.type == SDL_EVENT_QUIT)
            running = false;
        if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST)
            cancelDrag();
        if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
            if (event.button.x >= logicalWidth - 190 && event.button.y < 64 && event.button.button == SDL_BUTTON_LEFT) {
                showcase = !showcase;
                return;
            }
            if (!showcase && event.button.x >= logicalWidth - 384) {
                if (event.button.button != SDL_BUTTON_LEFT)
                    return;
#if LAB_CHECKPOINT >= 2
                const int row = static_cast<int>((event.button.y - 224.0F) / 18.0F);
                if (event.button.y >= 224.0F && row >= 0 && row <= 13) {
                    selectedControl = row;
                    if (event.button.x > logicalWidth - 90)
                        edit(1, false, activeCount);
                    else if (event.button.x > logicalWidth - 140)
                        edit(-1, false, activeCount);
                }
                if (event.button.y >= 484.0F && event.button.y < 508.0F)
                    apply = true;
#endif
                return;
            }
            if (event.button.button == SDL_BUTTON_LEFT || event.button.button == SDL_BUTTON_RIGHT) {
                dragging = true;
                panning = event.button.button == SDL_BUTTON_RIGHT;
                dragDistance = 0;
                SDL_CaptureMouse(true);
            }
        }
        if (event.type == SDL_EVENT_MOUSE_MOTION && dragging) {
            dragDistance += std::abs(event.motion.xrel) + std::abs(event.motion.yrel);
            if (panning)
                camera.pan(event.motion.xrel, event.motion.yrel);
            else
                camera.orbit(event.motion.xrel, event.motion.yrel);
        }
        if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && dragging) {
            if (!panning && dragDistance < 4.0F) {
                picking = true;
                pickX = event.button.x;
                pickY = event.button.y;
            }
            cancelDrag();
        }
        if (event.type == SDL_EVENT_MOUSE_WHEEL)
            camera.zoom(event.wheel.y);
        if (event.type != SDL_EVENT_KEY_DOWN)
            return;
        const SDL_Keycode key = event.key.key;
        const bool shift = (event.key.mod & SDL_KMOD_SHIFT) != 0;
        if (event.key.repeat && key != SDLK_LEFT && key != SDLK_RIGHT && key != SDLK_I && key != SDLK_J && key != SDLK_K && key != SDLK_L)
            return;
        if (key == SDLK_ESCAPE) {
            cancel = true;
            cancelDrag();
        }
        if (key == SDLK_Q)
            running = false;
        if (key == SDLK_SPACE)
            paused = !paused;
        if (key == SDLK_N)
            singleStep = true;
        if (key == SDLK_D)
            debug = !debug;
        if (key == SDLK_H)
            showcase = !showcase;
        if (key == SDLK_T)
            showTrails = !showTrails;
        if (key == SDLK_M)
            bySpeed = !bySpeed;
        if (key == SDLK_RETURN)
            apply = true;
        if (key == SDLK_R)
            reset = true;
        if (key == SDLK_V)
            validate = true;
        if (key == SDLK_B)
            benchmark = true;
        if (key == SDLK_F)
            focus = true;
        if (key == SDLK_BACKSPACE)
            camera.reset();
        if (key == SDLK_PAGEUP)
            camera.zoom(1);
        if (key == SDLK_PAGEDOWN)
            camera.zoom(-1);
        if (key == SDLK_J) {
            if (shift)
                camera.pan(12, 0);
            else
                camera.orbit(12, 0);
        }
        if (key == SDLK_L) {
            if (shift)
                camera.pan(-12, 0);
            else
                camera.orbit(-12, 0);
        }
        if (key == SDLK_I) {
            if (shift)
                camera.pan(0, 12);
            else
                camera.orbit(0, 12);
        }
        if (key == SDLK_K) {
            if (shift)
                camera.pan(0, -12);
            else
                camera.orbit(0, -12);
        }
#if LAB_CHECKPOINT >= 2
#if LAB_CHECKPOINT >= 6
        if (key == SDLK_P) {
            if (staged.phaseSpan == 0)
                staged.phaseSpan = 6;
            else
                staged.phaseSpan = 0;
            stagedChanged = true;
            apply = true;
        }
#endif
        if (key >= SDLK_1 && key <= SDLK_4) {
            const std::size_t count = staged.count;
            const std::uint32_t seed = staged.seed;
            staged = presetSettings(static_cast<Preset>(key - SDLK_1));
            staged.count = count;
            staged.seed = seed;
            stagedChanged = true;
            apply = true;
        }
        if (key == SDLK_TAB) {
            int direction = 1;
            if (shift)
                direction = -1;
            selectedControl = (selectedControl + direction + 14) % 14;
        }
        if (key == SDLK_LEFT)
            edit(-1, shift, activeCount);
        if (key == SDLK_RIGHT)
            edit(1, shift, activeCount);
        if (key == SDLK_LEFTBRACKET || key == SDLK_RIGHTBRACKET) {
            const int previousControl = selectedControl;
            selectedControl = 13;
            int direction = 1;
            if (key == SDLK_LEFTBRACKET)
                direction = -1;
            edit(direction, shift, activeCount);
            selectedControl = previousControl;
        }
#else
        (void)activeCount;
#endif
    }
};

} // namespace chamber
