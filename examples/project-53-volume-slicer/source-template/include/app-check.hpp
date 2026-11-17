#pragma once
#include "input.hpp"
#include <iostream>

namespace slices {
#if LAB_CHECKPOINT >= 7
// A bounded test of this app's own SDL queue. It does not emulate OS keyboard drivers.
struct AppCheck {
    int step = 0;
    int checks = 0;
    int failures = 0;
    std::vector<double> savedValues;
    Point before{};

    void expect(bool passed, const char* message) {
        ++checks;
        if (!passed) {
            ++failures;
            std::cerr << "SDL check failed: " << message << '\n';
        }
    }

    void key(SDL_Keycode code, SDL_Keymod modifiers = SDL_KMOD_NONE) {
        SDL_Event event{};
        event.type = SDL_EVENT_KEY_DOWN;
        event.key.key = code;
        event.key.down = true;
        event.key.mod = modifiers;
        expect(SDL_PushEvent(&event), "enqueue key");
    }

    void click(SDL_Renderer* renderer, Rect rect, double u = 0.5, double v = 0.5) {
        float x = 0;
        float y = 0;
        const bool converted = SDL_RenderCoordinatesToWindow(renderer, static_cast<float>(rect.x + u * rect.width), static_cast<float>(rect.y + v * rect.height), &x, &y);
        expect(converted, "render-to-window conversion");
        SDL_Event event{};
        event.type = SDL_EVENT_MOUSE_BUTTON_DOWN;
        event.button.button = SDL_BUTTON_LEFT;
        event.button.down = true;
        event.button.x = x;
        event.button.y = y;
        expect(SDL_PushEvent(&event), "enqueue pointer down");
        event.type = SDL_EVENT_MOUSE_BUTTON_UP;
        event.button.down = false;
        expect(SDL_PushEvent(&event), "enqueue pointer up");
    }

    void beforeFrame(SDL_Renderer* renderer, const State& state) {
        before = state.cursor;
        switch (step) {
        case 0:
            key(SDLK_O);
            break;
        case 1:
            key(SDLK_O);
            break;
        case 2:
            key(SDLK_RIGHT, SDL_KMOD_CTRL);
            break;
        case 3:
            click(renderer, cameraButton);
            break;
        case 4:
            click(renderer, sliceSlider(0, 1440, 900, true), 0.75);
            break;
        case 5:
            click(renderer, fitSlice(state.grid, 1, panelRect(1, 1440, 900, true)), 0.7, 0.3);
            break;
        case 6:
            savedValues = state.volume.values;
            key(SDLK_W);
            key(SDLK_C);
            key(SDLK_L);
            key(SDLK_H);
            key(SDLK_T);
            break;
        case 7:
            key(SDLK_N);
            break;
        case 8:
            key(SDLK_P);
            break;
        case 9:
            key(SDLK_P);
            break;
        case 10:
            key(SDLK_P);
            break;
        case 11:
            key(SDLK_P);
            break;
        case 12:
            key(SDLK_N);
            break;
        case 13:
            key(SDLK_R);
            break;
        case 14:
            key(SDLK_V);
            break;
        case 15:
            key(SDLK_SPACE);
            break;
        case 16: {
            SDL_Event event{};
            event.type = SDL_EVENT_WINDOW_FOCUS_LOST;
            expect(SDL_PushEvent(&event), "enqueue focus loss");
            break;
        }
        }
    }

    void afterFrame(const State& state, const Drag& drag) {
        const auto near = [](double a, double b) {
            return std::abs(a - b) < 1e-6;
        };
        switch (step) {
        case 0:
            expect(!state.cutaway && state.cursor == before, "whole object keeps probe");
            break;
        case 1:
            expect(state.cutaway, "cut mode");
            break;
        case 2:
            expect(state.camera.yaw > 0.72 && state.cursor == before, "Ctrl+arrow changes only camera");
            break;
        case 3:
            expect(near(state.camera.yaw, 0.72), "camera home click");
            break;
        case 4:
            expect(near(state.cursor[2], worldCoordinate(state.grid, 2, 127 * 0.75)) && state.cursor[0] == before[0] && state.cursor[1] == before[1], "XY slider changes z only");
            break;
        case 5:
            expect(state.activeView == 1 && state.cursor[0] > 0 && state.cursor[2] > 0 && state.cursor[1] == before[1], "XZ pick keeps y");
            break;
        case 6:
            expect(state.windowing.level > 0.5 && !state.color && !state.linear && state.showHistogram && state.dark, "display controls");
            expect(state.volume.values == savedValues, "display never modifies stored scalar");
            savedValues.clear();
            break;
        case 7:
            expect(state.volume.values.size() == 64 * 64 * 64, "real 64 cubed");
            break;
        case 8:
            expect(state.preset == Preset::Sphere && state.statistics.maximum == 1, "Sphere dataset");
            break;
        case 9:
            expect(state.preset == Preset::Gaussian && state.statistics.maximum > 0.9, "Gaussian dataset");
            break;
        case 10:
            expect(state.preset == Preset::Layers && near(state.statistics.minimum, 0.15), "Layers dataset");
            break;
        case 11:
            expect(state.preset == Preset::Ramp && state.statistics.maximum == 1, "Ramp dataset");
            break;
        case 12:
            expect(state.volume.values.size() == 128 * 128 * 128, "real 128 cubed");
            break;
        case 13:
            expect(state.preset == Preset::Ramp && state.grid.count[0] == 128 && state.cursor == Point{} && state.linear && state.color && state.paused && state.cutaway, "reset keeps dataset and resolution");
            break;
        case 14:
            expect(state.audit.starts_with("PASS"), "finite independent audit");
            break;
        case 15:
            expect(!state.paused && state.cursor[2] > before[2], "scan advances cut");
            break;
        case 16:
            expect(state.paused && drag.kind == DragKind::None, "focus loss stops scan and capture");
            break;
        }
        ++step;
    }

    bool complete() const {
        return step >= 17;
    }
};
#endif
} // namespace slices
