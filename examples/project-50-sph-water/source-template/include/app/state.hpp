#pragma once
#include "sph/emitter.hpp"
#include "sph/reference.hpp"
#include "sph/surface.hpp"
#include <chrono>

namespace tank {
enum class View {
    Surface,
    Particles,
    Density,
    Pressure,
    Speed
};
enum class Tool {
    Pour,
    Paddle,
    Inspect
};

struct App {
    water::Preset preset = water::Preset::Dam;
    std::size_t requested = 1000;
    water::State state;
    water::Settings settings;
    water::Metrics metrics;
    water::Surface surface;
    water::Vec2 nozzle{8.6, 6.5};
    View view = View::Particles;
    Tool tool = Tool::Inspect;
    bool paused = true;
    bool running = true;
    bool debug = false;
    bool pouring = false;
    bool dragging = false;
    bool dirty = true;
    bool inspectionDirty = true;
    int slider = -1;
    std::size_t selected = 0;
    double accumulator = 0;
    double dropped = 0;
    double emitClock = 0;
    double stepMs = 0;
    std::string error;
    std::string report = "NOT RUN";

    App() {
#if LAB_CHECKPOINT >= 9
        requested = 5000;
        view = View::Surface;
#endif
#if LAB_CHECKPOINT >= 10
        tool = Tool::Pour;
#endif
        rebuild();
    }

    void pause() {
        paused = true;
        accumulator = 0;
    }

    void refresh() {
        if (inspectionDirty) {
            water::inspectCurrent(state, settings);
            metrics = water::measure(state);
            inspectionDirty = false;
        }
        dirty = true;
    }

    void requestInspection() {
        inspectionDirty = true;
        dirty = true;
    }

    void rebuild() {
        pause();
        pouring = false;
        dragging = false;
        slider = -1;
        state = water::makeState(preset, requested);
        selected = 0;
        dropped = 0;
        emitClock = 0;
        error.clear();
        report = "NOT RUN";
        inspectionDirty = true;
        refresh();
    }

    bool oneStep() {
#if LAB_CHECKPOINT >= 2
        try {
            const auto start = std::chrono::steady_clock::now();
            water::step(state, settings);
            stepMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start).count();
#if LAB_CHECKPOINT >= 10
            emitClock += state.dt;
            if (pouring && emitClock >= 0.025) {
                water::emitBurst(state, nozzle);
                emitClock = 0;
            }
#endif
            requestInspection();
            return true;
        } catch (const std::exception& problem) {
            pause();
            pouring = false;
            error = problem.what();
        }
#endif
        return false;
    }

#if LAB_CHECKPOINT >= 8
    // [snippet frame]
    void advance(double elapsed) {
        if (paused || !error.empty()) {
            return;
        }
        dropped += std::max(0.0, elapsed - 0.05);
        accumulator += std::min(elapsed, 0.05);
        const auto start = std::chrono::steady_clock::now();
        int steps = 0;
        while (accumulator >= water::maxDt && steps < 24) {
            if (!oneStep()) {
                break;
            }
            accumulator -= state.dt;
            ++steps;
            if (std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start).count() >= 12) {
                break;
            }
        }
        if (steps == 24 || accumulator >= water::maxDt) {
            dropped += accumulator;
            accumulator = 0;
        }
    }

    // [/snippet frame]
#endif
};
} // namespace tank
