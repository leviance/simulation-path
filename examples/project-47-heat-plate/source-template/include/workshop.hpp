#pragma once

#include "diffusion.hpp"
#include "metrics.hpp"
#include "presets.hpp"
#include <array>
#include <string>

namespace heat {

enum class Slider {
    None,
    Diffusivity,
    Timestep
};

struct ProbeSample {
    double time = 0;
    double theta = 0;
};

struct Workshop {
    Settings settings;
    Preset preset = Preset::Hotspot;
    int size = 32;
    int radius = 2;
    double brushValue = 1;
    BrushMode brushMode = BrushMode::Temperature;
    int cursorX = 16;
    int cursorY = 16;
    int probeX = 16;
    int probeY = 16;
    bool paused = true;
    bool singleStep = false;
    bool restartClock = true;
    bool drawing = false;
    bool erasing = false;
    bool previousValid = false;
    int previousX = 0;
    int previousY = 0;
    Slider dragging = Slider::None;
    bool showcase = false;
    bool showPins = true;
    bool dirty = true;
    double speed = 1;
    double accumulator = 0;
    double dropped = 0;
    double updateMs = 0;
    double uploadMs = 0;
    double submitMs = 0;
    Stats stats;
    StepResult lastStep;
    std::array<ProbeSample, 120> history{};
    std::size_t historyCount = 0;
    std::string message = "PAUSED: paint or advance one timestep";

    Workshop() {
#if LAB_CHECKPOINT >= 7
        size = 192;
        radius = 8;
        cursorX = size / 2;
        cursorY = size / 2;
        probeX = cursorX;
        probeY = cursorY;
#endif
    }

    void endPointer() {
        drawing = false;
        erasing = false;
        previousValid = false;
        dragging = Slider::None;
    }

    void pause() {
        paused = true;
        singleStep = false;
        accumulator = 0;
        restartClock = true;
        endPointer();
    }
};

inline void selectProbe(const Field& field, Workshop& state, int x, int y) {
    if (!field.contains(x, y)) {
        return;
    }
    state.probeX = x;
    state.probeY = y;
    state.historyCount = 0;
}

inline void recordProbe(const Field& field, Workshop& state) {
#if LAB_CHECKPOINT >= 8
    if (state.historyCount == state.history.size()) {
        std::move(state.history.begin() + 1, state.history.end(), state.history.begin());
        --state.historyCount;
    }
    state.history[state.historyCount] = {field.time, sample(field, state.probeX, state.probeY)};
    ++state.historyCount;
#endif
    static_cast<void>(field);
    static_cast<void>(state);
}

#if LAB_CHECKPOINT >= 2
inline void stamp(Field& field, Workshop& state, int x, int y, bool join) {
    double value = state.brushValue;
    if (state.erasing) {
        value = 0;
    }
    if (join && state.previousValid) {
        paintStroke(field, state.settings, state.previousX, state.previousY, x, y, state.radius, value, state.brushMode);
    } else {
        paintDisk(field, state.settings, x, y, state.radius, value, state.brushMode);
    }
    state.cursorX = x;
    state.cursorY = y;
    state.previousX = x;
    state.previousY = y;
    state.previousValid = true;
    state.dirty = true;
}
#endif

inline void selectScene(Field& field, Workshop& state, Preset preset, int size, bool clear = false) {
    Preset candidatePreset = preset;
    if (clear) {
        candidatePreset = Preset::Empty;
    }
    Field candidate = makeField(candidatePreset, size);
    Settings candidateSettings = state.settings;
#if LAB_CHECKPOINT >= 7
    candidateSettings.dx = 96.0 / size;
    candidateSettings.dy = candidateSettings.dx;
#endif
#if LAB_CHECKPOINT >= 5
    applyBoundary(candidate, candidateSettings);
#endif
    // Chỉ thay cấu hình sau khi candidate đã cấp phát/tạo xong.
    field = std::move(candidate);
    state.settings = candidateSettings;
    state.size = size;
    state.preset = preset;
    state.pause();
    state.dropped = 0;
    state.updateMs = 0;
    state.lastStep = {};
    state.cursorX = size / 2;
    state.cursorY = size / 2;
    selectProbe(field, state, state.cursorX, state.cursorY);
    state.dirty = true;
    state.message = "RESET: same preset/settings, model time zero";
    if (clear) {
        state.message = "CLEARED: reset restores the selected preset";
    }
}

inline void setSlider(Workshop& state, Slider slider, double fraction) {
    if (!std::isfinite(fraction)) {
        return;
    }
    fraction = std::clamp(fraction, 0.0, 1.0);
    state.paused = true;
    state.singleStep = false;
    state.accumulator = 0;
    state.restartClock = true;
    if (slider == Slider::Diffusivity) {
        state.settings.diffusivity = std::round(6 * fraction * 20) / 20;
    } else if (slider == Slider::Timestep) {
        state.settings.dt = std::clamp(std::round((0.002 + 0.098 * fraction) * 600) / 600, 0.002, 0.1);
    }
    state.message = "PARAMETER CHANGED: no hidden step or automatic CFL repair";
}

} // namespace heat
