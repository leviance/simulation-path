#pragma once
#include "controls.hpp"
#include "diagnostics.hpp"
#include "state.hpp"
#include <SDL3/SDL.h>

namespace slices {
enum class DragKind { None,
                      Cut,
                      Level,
                      Width,
                      Probe,
                      Orbit };

struct Drag {
    DragKind kind = DragKind::None;
    int view = 0;
    double x = 0;
    double y = 0;
};

#if LAB_CHECKPOINT >= 2
inline void keyboard(State& state, SDL_Keycode key, bool repeat, bool control = false) {
    if (key != SDLK_SPACE) {
        state.paused = true;
    }
#if LAB_CHECKPOINT >= 3
    if (control) {
        if (key == SDLK_LEFT) {
            state.camera.yaw -= 0.08;
        }
        if (key == SDLK_RIGHT) {
            state.camera.yaw += 0.08;
        }
        if (key == SDLK_UP) {
            state.camera.pitch += 0.06;
        }
        if (key == SDLK_DOWN) {
            state.camera.pitch -= 0.06;
        }
        limitCamera(state.camera);
        return;
    }
    if (key == SDLK_Q) {
        state.camera.yaw -= 0.08;
    }
    if (key == SDLK_E) {
        state.camera.yaw += 0.08;
    }
    if (key == SDLK_MINUS) {
        state.camera.distance *= 1.1;
    }
    if (key == SDLK_EQUALS || key == SDLK_PLUS) {
        state.camera.distance /= 1.1;
    }
    if (key == SDLK_F && !repeat) {
        state.camera = {};
    }
    if (key == SDLK_O && !repeat) {
        state.cutaway = !state.cutaway;
    }
    if (key >= SDLK_1 && key <= SDLK_3) {
        state.activeView = static_cast<int>(key - SDLK_1);
    }
    limitCamera(state.camera);
#else
    (void)control;
#endif
    if (key == SDLK_R && !repeat) {
        state.reset();
    }
    if (key == SDLK_P && !repeat) {
        const auto next = static_cast<Preset>((static_cast<int>(state.preset) + 1) % 5);
        (void)state.loadDataset(next, state.grid.count[0]);
    }
    if (key == SDLK_N && !repeat) {
        int side = 128;
        if (state.grid.count[0] == 128) {
            side = 64;
        }
        state.setResolution(side);
    }
    const auto axes = axesFor(state.activeView);
    double step = 1;
#if LAB_CHECKPOINT >= 5
    step = 0.1;
#endif
    // [snippet move-cut]
    if (key == SDLK_PAGEUP) {
        state.cursor[axes.cut] += step * state.grid.spacing[axes.cut];
    }
    if (key == SDLK_PAGEDOWN) {
        state.cursor[axes.cut] -= step * state.grid.spacing[axes.cut];
    }
    state.cursor = clampPoint(state.grid, state.cursor);
    // [/snippet move-cut]
#if LAB_CHECKPOINT >= 4
    if (key == SDLK_W) {
        state.windowing.level = std::min(1.0, state.windowing.level + 0.02);
    }
    if (key == SDLK_S) {
        state.windowing.level = std::max(0.0, state.windowing.level - 0.02);
    }
    if (key == SDLK_A) {
        state.windowing.width = std::max(0.05, state.windowing.width - 0.05);
    }
    if (key == SDLK_D) {
        state.windowing.width = std::min(1.5, state.windowing.width + 0.05);
    }
    if (key == SDLK_C && !repeat) {
        state.color = !state.color;
    }
    if (key == SDLK_H && !repeat) {
        state.showHistogram = !state.showHistogram;
    }
#endif
    if (key == SDLK_T && !repeat) {
        state.dark = !state.dark;
    }
#if LAB_CHECKPOINT >= 5
    if (key == SDLK_L && !repeat) {
        state.linear = !state.linear;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_SPACE && !repeat) {
        state.paused = !state.paused;
    }
    if (key == SDLK_LEFT) {
        state.cursor[axes.horizontal] -= state.grid.spacing[axes.horizontal];
    }
    if (key == SDLK_RIGHT) {
        state.cursor[axes.horizontal] += state.grid.spacing[axes.horizontal];
    }
    if (key == SDLK_UP) {
        state.cursor[axes.vertical] += state.grid.spacing[axes.vertical];
    }
    if (key == SDLK_DOWN) {
        state.cursor[axes.vertical] -= state.grid.spacing[axes.vertical];
    }
    state.cursor = clampPoint(state.grid, state.cursor);
#endif
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_V && !repeat) {
        const auto report = auditVolume(state.volume);
        state.audit = "FAIL";
        if (report.failures == 0) {
            state.audit = "PASS";
        }
        state.audit += " | " + std::to_string(report.checks) + " checks";
    }
#endif
}

inline void movePointer(State& state, Drag& drag, double x, double y) {
    bool threeViews = false;
#if LAB_CHECKPOINT >= 3
    threeViews = true;
    if (drag.kind == DragKind::Orbit) {
        state.camera.yaw += (x - drag.x) * 0.008;
        state.camera.pitch += (y - drag.y) * 0.008;
        limitCamera(state.camera);
        drag.x = x;
        drag.y = y;
    }
#endif
    if (drag.kind == DragKind::Cut) {
        const int axis = axesFor(drag.view).cut;
        const auto rect = sliceSlider(drag.view, 1440, 900, threeViews);
        double index = sliderPosition(rect, x) * (state.grid.count[axis] - 1);
#if LAB_CHECKPOINT < 5
        index = std::floor(index + 0.5);
#endif
        state.cursor[axis] = worldCoordinate(state.grid, axis, index);
        state.activeView = drag.view;
    }
#if LAB_CHECKPOINT >= 4
    if (drag.kind == DragKind::Level) {
        state.windowing.level = sliderPosition(levelSlider, x);
    }
    if (drag.kind == DragKind::Width) {
        state.windowing.width = 0.05 + sliderPosition(widthSlider, x) * 1.45;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (drag.kind == DragKind::Probe) {
        const auto rect = fitSlice(state.grid, drag.view, panelRect(drag.view, 1440, 900, true));
        const auto point = pickSlice(state.grid, drag.view, state.cursor, rect, std::clamp(x, rect.x, rect.x + rect.width), std::clamp(y, rect.y, rect.y + rect.height));
        if (point) {
            state.cursor = *point;
        }
    }
#else
    (void)y;
#endif
}

inline Drag pointerDown(State& state, double x, double y) {
    const bool wasPaused = state.paused;
    state.paused = true;
    for (int index = 0; index < 5; ++index) {
        if (contains(presetButton(index), x, y)) {
            (void)state.loadDataset(static_cast<Preset>(index), state.grid.count[0]);
            return {};
        }
    }
    if (contains(resolutionButton, x, y)) {
        keyboard(state, SDLK_N, false);
        return {};
    }
    if (contains(resetButton, x, y)) {
        state.reset();
        return {};
    }
    if (contains(themeButton, x, y)) {
        keyboard(state, SDLK_T, false);
        return {};
    }
#if LAB_CHECKPOINT >= 3
    if (contains(sceneViewport, x, y)) {
        return {DragKind::Orbit, -1, x, y};
    }
    if (contains(cutawayButton, x, y)) {
        keyboard(state, SDLK_O, false);
        return {};
    }
    if (contains(cameraButton, x, y)) {
        keyboard(state, SDLK_F, false);
        return {};
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (contains(paletteButton, x, y)) {
        keyboard(state, SDLK_C, false);
        return {};
    }
    if (contains(histogramButton, x, y)) {
        keyboard(state, SDLK_H, false);
        return {};
    }
    for (const auto kind : {DragKind::Level, DragKind::Width}) {
        Rect rect = levelSlider;
        if (kind == DragKind::Width) {
            rect = widthSlider;
        }
        if (contains(rect, x, y)) {
            Drag drag{kind, 0};
            movePointer(state, drag, x, y);
            return drag;
        }
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (contains(samplerButton, x, y)) {
        keyboard(state, SDLK_L, false);
        return {};
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (contains(scanButton, x, y)) {
        state.paused = !wasPaused;
        return {};
    }
#else
    (void)wasPaused;
#endif
#if LAB_CHECKPOINT >= 7
    if (contains(auditButton, x, y)) {
        keyboard(state, SDLK_V, false);
        return {};
    }
#endif
    int views = 1;
#if LAB_CHECKPOINT >= 3
    views = 3;
#endif
    for (int view = 0; view < views; ++view) {
        if (contains(sliceSlider(view, 1440, 900, views == 3), x, y)) {
            Drag drag{DragKind::Cut, view};
            movePointer(state, drag, x, y);
            return drag;
        }
#if LAB_CHECKPOINT >= 6
        const auto rect = fitSlice(state.grid, view, panelRect(view, 1440, 900, true));
        if (contains(rect, x, y)) {
            state.activeView = view;
            Drag drag{DragKind::Probe, view};
            movePointer(state, drag, x, y);
            return drag;
        }
#endif
    }
    return {};
}
#endif
} // namespace slices
