#pragma once
#include "panel.hpp"
#include <iostream>

namespace wind {
// [snippet actions]
inline void act(Workshop& app, Action action) {
    if (action == Action::Reset) {
        SDL_CaptureMouse(false);
        app = Workshop{};
    }
    if (action == Action::Clean) {
        app.clean = !app.clean;
    }
#if LAB_CHECKPOINT >= 2
    if (action == Action::Preset) {
        // [snippet next-preset]
        int count = 5;
#if LAB_CHECKPOINT >= 3
        count = 6;
#endif
        app.scene.preset = static_cast<Preset>((static_cast<int>(app.scene.preset) + 1) % count);
        app.rebuild();
        // [/snippet next-preset]
    }
#endif
}

// [/snippet actions]

inline void applyAction(Workshop& app, Action action) {
#if LAB_CHECKPOINT >= 3
    if (action == Action::Potential) {
        if (app.scene.potential == Potential::Bowl) {
            app.scene.potential = Potential::Hill;
        } else {
            app.scene.potential = Potential::Bowl;
        }
        app.rebuild();
        return;
    }
    if (action == Action::Overlay) {
        int count = 3;
#if LAB_CHECKPOINT >= 4
        count = 4;
#endif
#if LAB_CHECKPOINT >= 5
        count = 5;
#endif
        app.layer = static_cast<Layer>((static_cast<int>(app.layer) + 1) % count);
        return;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (action == Action::Resolution) {
        // [snippet resolution]
        int columns = 65;
        if (app.field.width == 65) {
            columns = 129;
        }
        if (app.field.width == 129) {
            columns = 33;
        }
        app.field = Field(columns, 1 + (columns - 1) * 3 / 4);
        app.cursorX = app.field.width / 2;
        app.cursorY = app.field.height / 2;
        app.rebuild();
        // [/snippet resolution]
        return;
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (action == Action::Pause && app.tracers) {
        app.paused = !app.paused;
        app.accumulator = 0;
    }
    if (action == Action::Step) {
        app.pause();
        app.step();
    }
    if (action == Action::Tracers) {
        app.pause();
        app.tracers = !app.tracers;
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (action == Action::Edit) {
        app.editVortex = !app.editVortex;
    }
    if (action == Action::Vortex) {
        app.scene.vortex = !app.scene.vortex;
        app.rebuild();
    }
    if (action == Action::Reverse) {
        app.scene.strength = -app.scene.strength;
        app.rebuild();
    }
#endif
#if LAB_CHECKPOINT >= 9
    if (action == Action::Verify) {
        app.pause();
        const auto result = validateMap();
        app.report = "FAIL";
        if (result.passed) {
            app.report = "PASS";
        }
        std::cout << app.report << " derivative_error=" << result.derivativeError << " curl_grad=" << result.gradientCurl << " interior=" << result.coarse.interior << " -> " << result.refined.interior << " boundary=" << result.coarse.boundary << " -> " << result.refined.boundary << '\n';
    }
#endif
    act(app, action);
}

#if LAB_CHECKPOINT >= 2
// [snippet probe-input]
inline void selectPoint(Workshop& app, Vec2 p, bool place) {
    app.cursorX = std::clamp(static_cast<int>(std::lround((p.x + 2) / app.field.dx)), 0, app.field.width - 1);
    app.cursorY = std::clamp(static_cast<int>(std::lround((p.y + 1.5) / app.field.dy)), 0, app.field.height - 1);
#if LAB_CHECKPOINT >= 8
    if (place) {
        // [snippet place-vortex]
        app.scene.center = p;
        app.scene.vortex = true;
        app.rebuild();
        // [/snippet place-vortex]
    }
#else
    static_cast<void>(place);
#endif
}

// [/snippet probe-input]
#endif

inline void handleInput(SDL_Renderer* renderer, Workshop& app, const SDL_Event& event) {
    if (event.type == SDL_EVENT_QUIT) {
        app.running = false;
    }
    if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
        app.pause();
        app.dragging = false;
        SDL_CaptureMouse(false);
    }
    const bool arrowKey = event.type == SDL_EVENT_KEY_DOWN && (event.key.key == SDLK_LEFT || event.key.key == SDLK_RIGHT || event.key.key == SDLK_UP || event.key.key == SDLK_DOWN);
    if (event.type == SDL_EVENT_KEY_DOWN && (!event.key.repeat || arrowKey)) {
        const auto key = event.key.key;
        if (key == SDLK_ESCAPE)
            app.running = false;
        if (key == SDLK_R)
            applyAction(app, Action::Reset);
        if (key == SDLK_F1)
            applyAction(app, Action::Clean);
#if LAB_CHECKPOINT >= 2
        if (key == SDLK_P)
            applyAction(app, Action::Preset);
        if (key == SDLK_LEFT)
            app.cursorX = std::max(0, app.cursorX - 1);
        if (key == SDLK_RIGHT)
            app.cursorX = std::min(app.field.width - 1, app.cursorX + 1);
        if (key == SDLK_UP)
            app.cursorY = std::min(app.field.height - 1, app.cursorY + 1);
        if (key == SDLK_DOWN)
            app.cursorY = std::max(0, app.cursorY - 1);
#endif
#if LAB_CHECKPOINT >= 3
        if (key == SDLK_H)
            applyAction(app, Action::Potential);
        if (key == SDLK_L)
            applyAction(app, Action::Overlay);
#endif
#if LAB_CHECKPOINT >= 6
        if (key == SDLK_G)
            applyAction(app, Action::Resolution);
#endif
#if LAB_CHECKPOINT >= 7
        if (key == SDLK_SPACE)
            applyAction(app, Action::Pause);
        if (key == SDLK_N)
            applyAction(app, Action::Step);
        if (key == SDLK_T)
            applyAction(app, Action::Tracers);
#endif
#if LAB_CHECKPOINT >= 8
        if (key == SDLK_M)
            applyAction(app, Action::Edit);
        if (key == SDLK_B)
            applyAction(app, Action::Vortex);
        if (key == SDLK_S)
            applyAction(app, Action::Reverse);
        if (key == SDLK_RETURN)
            selectPoint(app, world(app.field, app.cursorX, app.cursorY), true);
#endif
#if LAB_CHECKPOINT >= 9
        if (key == SDLK_V)
            applyAction(app, Action::Verify);
#endif
    }
    if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
        app.dragging = false;
        SDL_CaptureMouse(false);
    }
    if (event.type != SDL_EVENT_MOUSE_BUTTON_DOWN && event.type != SDL_EVENT_MOUSE_MOTION) {
        return;
    }
    float windowX = 0;
    float windowY = 0;
    bool pressed = false;
    if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN) {
        if (event.button.button != SDL_BUTTON_LEFT)
            return;
        windowX = event.button.x;
        windowY = event.button.y;
        pressed = true;
    } else {
        windowX = event.motion.x;
        windowY = event.motion.y;
    }
    if (pressed) {
        float x = 0;
        float y = 0;
        if (!SDL_RenderCoordinatesFromWindow(renderer, windowX, windowY, &x, &y))
            return;
        for (const auto& button : buttons()) {
            if (contains(button.bounds, x, y)) {
                applyAction(app, button.action);
                return;
            }
        }
    }
#if LAB_CHECKPOINT >= 2
    Vec2 p;
    if (mouseWorld(renderer, windowX, windowY, p)) {
        if (pressed) {
            app.dragging = true;
            if (!SDL_CaptureMouse(true)) {
                std::cerr << "Mouse capture unavailable: " << SDL_GetError() << '\n';
                app.dragging = false;
            }
        }
        selectPoint(app, p, (pressed || app.dragging) && app.editVortex);
    }
#endif
}
} // namespace wind
