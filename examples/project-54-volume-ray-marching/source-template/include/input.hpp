#pragma once
#include "ui.hpp"

namespace volume54 {
struct Drag {
    bool active = false;
};

inline void release(Drag& drag, State& state) {
    drag.active = false;
    state.paused = true;
    SDL_CaptureMouse(false);
}

inline void act(Action action, State& state, Benchmark& benchmark, Renderer& renderer) {
    if (action == Action::Benchmark) {
#if LAB_CHECKPOINT >= 9
        if (benchmark.active)
            benchmark.cancel();
        else {
            state.paused = true;
            benchmark.start(state);
        }
#endif
        return;
    }
    benchmark.invalidate();
    if (action != Action::Pause)
        state.paused = true;
#if LAB_CHECKPOINT >= 4
    if (action == Action::Dataset)
        state.load(renderer, static_cast<Preset>((static_cast<int>(state.preset) + 1) % 6), state.side);
#else
    (void)renderer;
#endif
#if LAB_CHECKPOINT >= 5
    if (action == Action::Mip)
        state.settings.mode = Mode::Mip;
    if (action == Action::Average)
        state.settings.mode = Mode::Average;
    if (action == Action::SmallerStep)
        state.settings.stepLength = std::max(0.008, state.settings.stepLength * 0.5);
    if (action == Action::LargerStep)
        state.settings.stepLength = std::min(0.16, state.settings.stepLength * 2);
#endif
#if LAB_CHECKPOINT >= 6
    if (action == Action::Alpha)
        state.settings.mode = Mode::Alpha;
    if (action == Action::LessSigma)
        state.settings.sigma = std::max(0.0, state.settings.sigma - 0.5);
    if (action == Action::MoreSigma)
        state.settings.sigma = std::min(12.0, state.settings.sigma + 0.5);
#endif
#if LAB_CHECKPOINT >= 7
    if (action == Action::LessCutoff)
        state.settings.cutoff = std::max(0.0, state.settings.cutoff - 0.025);
    if (action == Action::MoreCutoff)
        state.settings.cutoff = std::min(0.8, state.settings.cutoff + 0.025);
    if (action == Action::Palette)
        state.settings.palette = (state.settings.palette + 1) % 3;
    if (action == Action::Lighting)
        state.settings.lighting = !state.settings.lighting;
#endif
#if LAB_CHECKPOINT >= 9
    if (action == Action::Resolution) {
        int next = 128;
        if (state.side == 128)
            next = 64;
        state.load(renderer, state.preset, next);
    }
    if (action == Action::Early)
        state.settings.early = !state.settings.early;
#endif
    if (action == Action::Pause && lessonStage >= 2)
        state.paused = !state.paused;
    if (action == Action::Inside && lessonStage >= 3)
        state.camera.inside = !state.camera.inside;
    if (action == Action::Showcase)
        state.showcase = !state.showcase;
    if (action == Action::Inspector && lessonStage >= 8)
        state.inspect = !state.inspect;
    if (action == Action::Reset)
        state.reset();
    state.invalidate();
}

inline bool handleEvent(SDL_Event event, State& state, Drag& drag, Benchmark& benchmark, Renderer& renderer, int width, [[maybe_unused]] int height) {
    if (event.type == SDL_EVENT_QUIT)
        return false;
    if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
        release(drag, state);
        benchmark.cancel();
    }
    if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
        drag.active = false;
        SDL_CaptureMouse(false);
    }
    if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
        for (const Button& button : buttons(state, benchmark, width)) {
            if (button.bounds.contains(event.button.x, event.button.y)) {
                if (button.enabled) {
                    drag.active = false;
                    SDL_CaptureMouse(false);
                    act(button.action, state, benchmark, renderer);
                }
                return true;
            }
        }
#if LAB_CHECKPOINT >= 5
        if (!state.inspect && !state.showcase) {
            for (const ComparisonPanel& panel : comparisonPanels(sceneWidth(width, false), height)) {
                if (panel.image.contains(event.button.x, event.button.y)) {
                    release(drag, state);
                    Action action = Action::Mip;
                    if (panel.mode == Mode::Average)
                        action = Action::Average;
                    if (panel.mode == Mode::Alpha)
                        action = Action::Alpha;
                    act(action, state, benchmark, renderer);
                    return true;
                }
            }
        }
#endif
        if (event.button.x < sceneWidth(width, state.showcase) && lessonStage >= 2) {
            release(drag, state);
            benchmark.invalidate();
#if LAB_CHECKPOINT >= 8
            // [snippet pick-ray]
            if (SDL_GetModState() & SDL_KMOD_SHIFT) {
                state.inspect = true;
                state.selectedU = std::clamp(static_cast<double>(event.button.x) / sceneWidth(width, state.showcase), 0.0, 1.0);
                state.selectedV = std::clamp(static_cast<double>(event.button.y) / height, 0.0, 1.0);
                state.invalidate();
                return true;
            }
            // [/snippet pick-ray]
#endif
            drag.active = true;
            if (!SDL_CaptureMouse(true))
                state.status = "Capture unavailable; drag still stops when left button is released.";
        }
    }
    // [snippet drag-guard]
    if (event.type == SDL_EVENT_MOUSE_MOTION && drag.active) {
        if (!(event.motion.state & SDL_BUTTON_LMASK))
            release(drag, state);
        else {
            state.camera.yaw += event.motion.xrel * 0.006;
            state.camera.pitch += event.motion.yrel * 0.006;
            state.camera.limit();
            state.invalidate();
        }
    }
    // [/snippet drag-guard]
    if (event.type == SDL_EVENT_MOUSE_WHEEL && lessonStage >= 2) {
        release(drag, state);
        benchmark.invalidate();
        state.camera.distance *= std::exp(-event.wheel.y * 0.12);
        state.camera.limit();
        state.invalidate();
    }
    if (event.type != SDL_EVENT_KEY_DOWN || event.key.repeat)
        return true;
    const SDL_Keycode key = event.key.key;
#if LAB_CHECKPOINT >= 2
    if (key == SDLK_F) {
        release(drag, state);
        benchmark.invalidate();
        state.camera.yaw = 0;
        state.camera.pitch = 0;
        state.camera.inside = false;
        state.invalidate();
    }
#endif
    if (key == SDLK_ESCAPE) {
        if (benchmark.active) {
            benchmark.cancel();
            return true;
        }
        return false;
    }
    if (key == SDLK_LEFT || key == SDLK_RIGHT || key == SDLK_UP || key == SDLK_DOWN) {
#if LAB_CHECKPOINT >= 2
        release(drag, state);
        benchmark.invalidate();
        if (key == SDLK_LEFT)
            state.camera.yaw -= 0.1;
        if (key == SDLK_RIGHT)
            state.camera.yaw += 0.1;
        if (key == SDLK_UP)
            state.camera.pitch += 0.1;
        if (key == SDLK_DOWN)
            state.camera.pitch -= 0.1;
        state.camera.limit();
        state.invalidate();
#endif
        return true;
    }
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_PERIOD) {
        state.inspect = true;
        state.shown = std::min(state.trace.samples, state.shown + 1);
    }
    if (key == SDLK_COMMA) {
        state.inspect = true;
        state.shown = std::max(0, state.shown - 1);
    }
#endif
    for (const auto& mapping : {std::pair{SDLK_1, Action::Mip}, {SDLK_2, Action::Average}, {SDLK_3, Action::Alpha}, {SDLK_P, Action::Dataset}, {SDLK_C, Action::Palette}, {SDLK_L, Action::Lighting}, {SDLK_R, Action::Reset}, {SDLK_I, Action::Inside}, {SDLK_N, Action::Resolution}, {SDLK_E, Action::Early}, {SDLK_B, Action::Benchmark}, {SDLK_SPACE, Action::Pause}, {SDLK_TAB, Action::Showcase}, {SDLK_MINUS, Action::LessSigma}, {SDLK_EQUALS, Action::MoreSigma}, {SDLK_LEFTBRACKET, Action::LessCutoff}, {SDLK_RIGHTBRACKET, Action::MoreCutoff}}) {
        if (key == mapping.first) {
            drag.active = false;
            SDL_CaptureMouse(false);
            act(mapping.second, state, benchmark, renderer);
        }
    }
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_V)
        act(Action::Inspector, state, benchmark, renderer);
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_Q) {
        release(drag, state);
        benchmark.invalidate();
        if (state.settings.stepLength > 0.04)
            state.settings.stepLength = 0.04;
        else if (state.settings.stepLength > 0.02)
            state.settings.stepLength = 0.02;
        else if (state.settings.stepLength > 0.008)
            state.settings.stepLength = 0.008;
        else
            state.settings.stepLength = 0.08;
        state.invalidate();
    }
#endif
    return true;
}
} // namespace volume54
