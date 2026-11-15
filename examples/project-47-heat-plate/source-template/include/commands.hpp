#pragma once

#include "workshop.hpp"

namespace heat {

enum class Action {
    None,
    Hot,
    Cold,
    Run,
    Step,
    Reset,
    Clear,
    Heater,
    EraseHeater,
    Boundary,
    Experiment,
    Preset,
    Resolution,
    RadiusLess,
    RadiusMore,
    Speed
};

// Nút và phím dùng chung action: không duy trì hai đường sửa dữ liệu khác nhau.
inline void applyAction(Action action, Field& field, Workshop& state) {
#if LAB_CHECKPOINT >= 2
    if (action == Action::Hot) {
        state.brushValue = 1;
        if (state.brushMode == BrushMode::EraseHeater) {
            state.brushMode = BrushMode::Temperature;
        }
    } else if (action == Action::Cold) {
        state.brushValue = 0;
        if (state.brushMode == BrushMode::EraseHeater) {
            state.brushMode = BrushMode::Temperature;
        }
    } else if (action == Action::RadiusLess) {
        state.radius = std::max(0, state.radius - 1);
    } else if (action == Action::RadiusMore) {
        state.radius = std::min(24, state.radius + 1);
    } else if (action == Action::Reset || action == Action::Clear) {
        selectScene(field, state, state.preset, state.size, action == Action::Clear);
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (action == Action::Step) {
        state.pause();
        state.singleStep = true;
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (action == Action::Heater) {
        if (state.brushMode == BrushMode::Heater) {
            state.brushMode = BrushMode::Temperature;
            state.message = "TEMPERATURE BRUSH: one-time change per input sample";
        } else {
            state.brushMode = BrushMode::Heater;
            state.message = "HEATER BRUSH: holds theta, not a fixed power";
        }
    } else if (action == Action::EraseHeater) {
        state.brushMode = BrushMode::EraseHeater;
        state.message = "ERASE HEATER: stored temperature is not erased";
    } else if (action == Action::Boundary) {
        state.pause();
        if (state.settings.boundary == Boundary::Insulated) {
            state.settings.boundary = Boundary::ColdRim;
        } else {
            state.settings.boundary = Boundary::Insulated;
        }
        applyBoundary(field, state.settings);
        state.dirty = true;
        state.lastStep = {};
        state.updateMs = 0;
        state.historyCount = 0;
        state.message = "BOUNDARY CHANGED: cold rim removes stored theta at the edge";
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (action == Action::Run) {
        const bool wasPaused = state.paused;
        state.pause();
        state.paused = !wasPaused;
        state.message = "PAUSED: no accumulated time debt";
        if (!state.paused) {
            state.message = "RUNNING: bounded work per frame";
        }
    } else if (action == Action::Experiment) {
        state.pause();
        state.settings.experiment = !state.settings.experiment;
        state.dirty = true;
        state.historyCount = 0;
        state.message = "EXPERIMENT: use checker, dt 0.05; step with N; no solver clamping";
    } else if (action == Action::Speed) {
        state.pause();
        state.speed *= 2;
        if (state.speed > 4) {
            state.speed = 0.25;
        }
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (action == Action::Resolution) {
        int size = 128;
        if (state.size == 128) {
            size = 192;
        } else if (state.size == 192) {
            size = 256;
        }
        selectScene(field, state, state.preset, size);
        state.message = "RESOLUTION CHANGED: fixed L=96, h and CFL changed; no silent dt repair";
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (action == Action::Preset) {
        Preset preset = Preset::Checker;
        if (state.preset == Preset::Checker) {
            preset = Preset::Hotspot;
        }
#if LAB_CHECKPOINT >= 8
        preset = static_cast<Preset>((static_cast<int>(state.preset) + 1) % 6);
#endif
        selectScene(field, state, preset, state.size);
    }
#endif
    static_cast<void>(action);
    static_cast<void>(field);
    static_cast<void>(state);
}

} // namespace heat
