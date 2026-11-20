#pragma once
#include "ui.hpp"

namespace slice53 {
// Camera, probe and sliders have distinct drag modes and share a single capture lifetime.
enum class DragKind { None, Camera, Probe, Slice, Level, Width };
struct Drag { DragKind kind = DragKind::None; int view = 0; double x = 0; double y = 0; };

inline void release(Drag& drag, State& state) {
    drag.kind = DragKind::None;
    state.paused = true;
    SDL_CaptureMouse(false);
}

inline void applyButton(State& state, int action) {
#if LAB_CHECKPOINT >= 2
    if (action == 0) state.load(static_cast<Preset>((static_cast<int>(state.preset) + 1) % 5), state.side);
    if (action == 1) {
        int next = 128;
        if (state.side == 128) next = 64;
        state.load(state.preset, next);
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (action == 2) state.linear = !state.linear;
#endif
#if LAB_CHECKPOINT >= 5
    if (action == 3) state.colored = !state.colored;
#endif
#if LAB_CHECKPOINT >= 6
    if (action == 4) state.cut = !state.cut;
#endif
#if LAB_CHECKPOINT >= 8
    if (action == 5) {
        const int axis = axesFor(state.activeView).fixed;
        if (state.probe[axis] >= (state.grid().origin + state.grid().extent())[axis])
            state.probe[axis] = state.grid().origin[axis];
        state.paused = !state.paused;
    }
#endif
    if (action == 6) state.reset();
#if LAB_CHECKPOINT >= 9
    if (action == 7 && state.volume) {
        const Audit report = audit(*state.volume);
        state.status = "CHECK: " + std::to_string(report.checks) + " checks / " + std::to_string(report.failures) + " failures; affine residual " + number(report.residual, 12);
        state.paused = true;
    }
#endif
    if (action == 8) state.debug = !state.debug;
    state.dirty = true;
}

inline void dragTo(State& state, Drag& drag, double x, double y) {
    const Grid grid = state.grid();
    if (drag.kind == DragKind::Camera) {
        state.camera.yaw += (x - drag.x) * 0.008;
        state.camera.pitch += (y - drag.y) * 0.008;
        state.camera.limit();
    }
    if (drag.kind == DragKind::Slice) {
        const Rect slider = sliderRect(drag.view);
        const int axis = axesFor(drag.view).fixed;
        const double fraction = std::clamp((x - slider.x) / slider.width, 0.0, 1.0);
        state.probe[axis] = grid.origin[axis] + fraction * grid.extent()[axis];
    }
#if LAB_CHECKPOINT >= 7
    if (drag.kind == DragKind::Probe) {
        const Rect image = smallImage(grid, drag.view);
        const double insideX = std::clamp(x, image.x, std::nextafter(image.x + image.width, image.x));
        const double insideY = std::clamp(y, image.y, std::nextafter(image.y + image.height, image.y));
        const auto point = pickSlice(grid, drag.view, image, insideX, insideY, state.probe);
        if (point) state.probe = *point;
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (drag.kind == DragKind::Level) state.window.level = std::clamp((x - 500) / 296, 0.0, 1.0);
    if (drag.kind == DragKind::Width) state.window.width = 0.05 + 1.45 * std::clamp((x - 500) / 296, 0.0, 1.0);
#endif
    drag.x = x;
    drag.y = y;
    state.dirty = true;
}

inline bool handleEvent(State& state, Drag& drag, SDL_Event event, SDL_Renderer* renderer) {
    if (event.type == SDL_EVENT_QUIT) return false;
    if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) release(drag, state);
    if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
        drag.kind = DragKind::None;
        SDL_CaptureMouse(false);
    }
    // [snippet logical-input]
    if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN || event.type == SDL_EVENT_MOUSE_MOTION)
        SDL_ConvertEventToRenderCoordinates(renderer, &event);
    if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
        const double x = event.button.x;
        const double y = event.button.y;
        for (const Button& button : buttons(state)) {
            if (button.enabled && contains(button.rect, x, y)) {
                if (button.action == 0 || button.action == 1 || button.action == 6) release(drag, state);
                applyButton(state, button.action);
                return true;
            }
        }
        state.paused = true;
        drag = {};
        drag.x = x;
        drag.y = y;
#if LAB_CHECKPOINT >= 6
        if (contains(sceneArea, x, y)) drag.kind = DragKind::Camera;
#endif
        int views = 1;
#if LAB_CHECKPOINT >= 3
        views = 3;
#endif
        for (int view = 0; view < views; ++view) {
            if (contains(slicePanel(view), x, y)) state.activeView = view;
            if (contains(sliderRect(view), x, y)) { drag.kind = DragKind::Slice; drag.view = view; }
#if LAB_CHECKPOINT >= 7
            if (contains(smallImage(state.grid(), view), x, y)) { drag.kind = DragKind::Probe; drag.view = view; }
#endif
        }
#if LAB_CHECKPOINT >= 5
        if (contains({500, 750, 296, 24}, x, y)) drag.kind = DragKind::Level;
        if (contains({500, 778, 296, 24}, x, y)) drag.kind = DragKind::Width;
#endif
        if (drag.kind != DragKind::None) {
            if (!SDL_CaptureMouse(true))
                state.status = "Mouse capture unavailable; release or blur cancels dragging.";
            dragTo(state, drag, x, y);
        }
        state.dirty = true;
    }
    // [/snippet logical-input]
    // [snippet drag-motion]
    if (event.type == SDL_EVENT_MOUSE_MOTION && drag.kind != DragKind::None) {
        // Recover even when a platform failed to capture the mouse-up outside its window.
        if ((event.motion.state & SDL_BUTTON_LMASK) == 0) {
            release(drag, state);
        } else {
            dragTo(state, drag, event.motion.x, event.motion.y);
        }
    }
    // [/snippet drag-motion]
#if LAB_CHECKPOINT >= 6
    if (event.type == SDL_EVENT_MOUSE_WHEEL) {
        state.camera.distance *= std::exp(-event.wheel.y * 0.08);
        state.camera.limit();
        state.dirty = true;
    }
#endif
    if (event.type != SDL_EVENT_KEY_DOWN) return true;
    const SDL_Keycode key = event.key.key;
    if (key == SDLK_ESCAPE) return false;
    if (key == SDLK_R) { release(drag, state); state.reset(); }
    if (key == SDLK_HOME) { state.camera = {}; state.dirty = true; }
#if LAB_CHECKPOINT >= 2
    if (key >= SDLK_1 && key <= SDLK_5 && !event.key.repeat) {
        release(drag, state);
        state.load(static_cast<Preset>(key - SDLK_1), state.side);
    }
    if (key == SDLK_N && !event.key.repeat) { release(drag, state); applyButton(state, 1); }
#endif
#if LAB_CHECKPOINT >= 3
    if (key == SDLK_TAB) state.activeView = (state.activeView + 1) % 3;
#endif
#if LAB_CHECKPOINT >= 4
    if (key == SDLK_T && !event.key.repeat) applyButton(state, 2);
#endif
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_C && !event.key.repeat) applyButton(state, 3);
    if (key == SDLK_J) state.window.level = std::max(0.0, state.window.level - 0.02);
    if (key == SDLK_K) state.window.level = std::min(1.0, state.window.level + 0.02);
    if (key == SDLK_U) state.window.width = std::max(0.05, state.window.width - 0.02);
    if (key == SDLK_I) state.window.width = std::min(1.5, state.window.width + 0.02);
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_O && !event.key.repeat) applyButton(state, 4);
    if (key == SDLK_EQUALS || key == SDLK_KP_PLUS) state.camera.distance *= 0.9;
    if (key == SDLK_MINUS || key == SDLK_KP_MINUS) state.camera.distance /= 0.9;
    if (event.key.mod & SDL_KMOD_CTRL) {
        if (key == SDLK_LEFT) state.camera.yaw -= 0.08;
        if (key == SDLK_RIGHT) state.camera.yaw += 0.08;
        if (key == SDLK_UP) state.camera.pitch += 0.08;
        if (key == SDLK_DOWN) state.camera.pitch -= 0.08;
        state.camera.limit();
        state.dirty = true;
        return true;
    }
#endif
#if LAB_CHECKPOINT >= 7
    // [snippet linked-keyboard]
    const Grid grid = state.grid();
    const Axes axes = axesFor(state.activeView);
    if (key == SDLK_LEFT) state.probe[axes.horizontal] -= grid.spacing[axes.horizontal];
    if (key == SDLK_RIGHT) state.probe[axes.horizontal] += grid.spacing[axes.horizontal];
    if (key == SDLK_UP) state.probe[axes.vertical] += grid.spacing[axes.vertical];
    if (key == SDLK_DOWN) state.probe[axes.vertical] -= grid.spacing[axes.vertical];
    if (key == SDLK_PAGEUP) state.probe[axes.fixed] += grid.spacing[axes.fixed];
    if (key == SDLK_PAGEDOWN) state.probe[axes.fixed] -= grid.spacing[axes.fixed];
    state.probe = grid.clamp(state.probe);
    // [/snippet linked-keyboard]
#endif
#if LAB_CHECKPOINT >= 8
    if ((key == SDLK_SPACE || key == SDLK_Q) && !event.key.repeat) applyButton(state, 5);
#endif
#if LAB_CHECKPOINT >= 9
    if (key == SDLK_V && !event.key.repeat) applyButton(state, 7);
#endif
    state.dirty = true;
    return true;
}
} // namespace slice53
