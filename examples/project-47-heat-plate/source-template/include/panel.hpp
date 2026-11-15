#pragma once

#include "commands.hpp"
#include "view.hpp"
#include <iomanip>
#include <sstream>

namespace heat {

struct Button {
    Rect rectangle;
    const char* label;
    Action action;
    int introducedAt;
};

// UI scaffold cung cấp sẵn; action thuần được nối dần qua checkpoint.
inline const std::array<Button, 13>& buttons() {
    static const std::array<Button, 13> items{{
        {{24, 82, 92, 28}, "1 HOT", Action::Hot, 2},
        {{124, 82, 92, 28}, "2 COLD", Action::Cold, 2},
        {{224, 82, 116, 28}, "H HEATER", Action::Heater, 5},
        {{348, 82, 116, 28}, "E UNPIN", Action::EraseHeater, 5},
        {{476, 82, 92, 28}, "SPACE RUN", Action::Run, 6},
        {{576, 82, 84, 28}, "N STEP", Action::Step, 3},
        {{668, 82, 76, 28}, "R RESET", Action::Reset, 2},
        {{780, 332, 392, 28}, "U BOUNDED INSTABILITY EXPERIMENT", Action::Experiment, 6},
        {{780, 370, 392, 28}, "B BOUNDARY", Action::Boundary, 5},
        {{780, 408, 188, 28}, "P PRESET", Action::Preset, 6},
        {{984, 408, 188, 28}, "C CLEAR FIELD", Action::Clear, 2},
        {{780, 446, 188, 28}, "G RESOLUTION", Action::Resolution, 7},
        {{984, 446, 188, 28}, "= SPEED", Action::Speed, 6},
    }};
    return items;
}

inline Action hitPanel(float x, float y) {
    for (const Button& button : buttons()) {
        if (taughtStage() >= button.introducedAt && inside(button.rectangle, x, y)) {
            return button.action;
        }
    }
    return Action::None;
}

inline void text(SDL_Renderer* renderer, float x, float y, const std::string& value, Rgba color = {205, 217, 231, 255}) {
    setColor(renderer, color);
    requireSdl(SDL_RenderDebugText(renderer, x, y, value.c_str()), "panel text");
}

inline std::string decimal(double value, int precision = 3) {
    if (!std::isfinite(value)) {
        return "n/a";
    }
    std::ostringstream stream;
    stream << std::fixed << std::setprecision(precision) << value;
    return stream.str();
}

inline void line(SDL_Renderer* renderer, float x0, float y0, float x1, float y1, Rgba color) {
    setColor(renderer, color);
    requireSdl(SDL_RenderLine(renderer, x0, y0, x1, y1), "panel line");
}

inline void drawSlider(SDL_Renderer* renderer, float y, const std::string& label, double fraction) {
    text(renderer, 780, y, label);
    const SDL_FRect track{780, y + 22, 392, 8};
    setColor(renderer, {40, 57, 78, 255});
    requireSdl(SDL_RenderFillRect(renderer, &track), "slider track");
    const float position = 780 + 392 * static_cast<float>(std::clamp(fraction, 0.0, 1.0));
    const SDL_FRect handle{position - 5, y + 17, 10, 18};
    setColor(renderer, {248, 193, 101, 255});
    requireSdl(SDL_RenderFillRect(renderer, &handle), "slider handle");
}

inline void drawHistory(SDL_Renderer* renderer, const Workshop& state) {
    text(renderer, 780, 645, "PROBE HISTORY: theta vs MODEL time (auto y)");
    if (state.historyCount < 2) {
        text(renderer, 780, 676, "L / Shift+click places probe; advance to plot");
        return;
    }
    double minimum = state.history[0].theta;
    double maximum = minimum;
    for (std::size_t index = 0; index < state.historyCount; ++index) {
        minimum = std::min(minimum, state.history[index].theta);
        maximum = std::max(maximum, state.history[index].theta);
    }
    const double span = std::max(0.01, maximum - minimum);
    const double start = state.history[0].time;
    const double duration = std::max(1e-9, state.history[state.historyCount - 1].time - start);
    line(renderer, 780, 696, 780, 798, {70, 88, 112, 255});
    line(renderer, 780, 798, 1172, 798, {70, 88, 112, 255});
    for (std::size_t index = 1; index < state.historyCount; ++index) {
        const auto previous = state.history[index - 1];
        const auto current = state.history[index];
        const float x0 = 784 + static_cast<float>((previous.time - start) / duration * 384);
        const float y0 = 794 - static_cast<float>((previous.theta - minimum) / span * 94);
        const float x1 = 784 + static_cast<float>((current.time - start) / duration * 384);
        const float y1 = 794 - static_cast<float>((current.theta - minimum) / span * 94);
        line(renderer, x0, y0, x1, y1, {104, 211, 199, 255});
    }
    text(renderer, 780, 812, "y " + decimal(minimum) + " .. " + decimal(maximum) + " | t " + decimal(start) + " .. " + decimal(start + duration));
}

inline void drawPanel(SDL_Renderer* renderer, const Field& field, const Workshop& state) {
    text(renderer, 24, 24, "HEAT PLATE / FINITE-DIFFERENCE WORKSHOP", {250, 194, 110, 255});
    text(renderer, 24, 45, "Paint temperature. Let it diffuse. Read theta, not just color.");
#if LAB_CHECKPOINT >= 6
    text(renderer, 780, 24, "D dt / dx^2 + D dt / dy^2 <= 0.5");
#endif
    std::string status = "PAUSED";
    if (!state.paused) {
        status = "RUNNING";
    }
    text(renderer, 780, 45, status + " | " + std::to_string(field.width) + " x " + std::to_string(field.height) + " cells");
#if LAB_CHECKPOINT >= 2
    text(renderer, 780, 82, "Cell (" + std::to_string(state.cursorX) + "," + std::to_string(state.cursorY) + ") theta=" + decimal(sample(field, state.cursorX, state.cursorY), 6));
#endif
#if LAB_CHECKPOINT >= 8
    text(renderer, 780, 103, "Probe (" + std::to_string(state.probeX) + "," + std::to_string(state.probeY) + ") theta=" + decimal(sample(field, state.probeX, state.probeY), 6));
#endif
    for (const Button& button : buttons()) {
        if (taughtStage() < button.introducedAt) {
            continue;
        }
        const Rect r = button.rectangle;
        const SDL_FRect rectangle{r.x, r.y, r.width, r.height};
        setColor(renderer, {28, 42, 61, 255});
        requireSdl(SDL_RenderFillRect(renderer, &rectangle), "panel button");
        std::string label = button.label;
        if (button.action == Action::Run && !state.paused) {
            label = "PAUSE";
        }
        text(renderer, r.x + 7, r.y + 10, label);
    }
#if LAB_CHECKPOINT >= 6
    drawSlider(renderer, 136, "D = " + decimal(state.settings.diffusivity) + " [length^2/model s]", state.settings.diffusivity / 6);
    drawSlider(renderer, 202, "dt = " + decimal(state.settings.dt, 5) + " [model s]", (state.settings.dt - 0.002) / 0.098);
#endif
#if LAB_CHECKPOINT >= 6
    const Stability coefficients = stability(state.settings);
    Rgba statusColor{110, 210, 181, 255};
    if (!coefficients.stable) {
        statusColor = {255, 122, 91, 255};
    }
    text(renderer, 780, 268, "rx+ry = " + decimal(coefficients.sum, 5), statusColor);
    std::string maximumDt = decimal(coefficients.maximumDt, 5);
    if (state.settings.diffusivity == 0) {
        maximumDt = "unbounded (D=0)";
    }
    text(renderer, 780, 286, "h " + decimal(state.settings.dx) + "," + decimal(state.settings.dy) + " | max dt " + maximumDt);
#endif
    std::string boundary = "INSULATED: CLOSED OUTER FACES";
    if (state.settings.boundary == Boundary::ColdRim) {
        boundary = "COLD RIM: STORED OUTER CELLS = 0";
    }
    text(renderer, 780, 485, boundary);
    text(renderer, 780, 503, presetName(state.preset));
    text(renderer, 780, 521, "theta min/max " + decimal(state.stats.minimum) + " / " + decimal(state.stats.maximum));
    text(renderer, 780, 539, "I* " + decimal(state.stats.integral) + " (not J) | heaters " + std::to_string(state.stats.activePins));
#if LAB_CHECKPOINT >= 3
    text(renderer, 780, 557, "tick " + std::to_string(field.tick) + " | time " + decimal(field.time) + " s");
    text(renderer, 780, 575, "visited " + std::to_string(state.lastStep.visited) + " | update " + decimal(state.updateMs) + " ms");
#endif
    text(renderer, 780, 593, "upload " + decimal(state.uploadMs) + " ms CPU | submit " + decimal(state.submitMs));
    text(renderer, 780, 611, "dropped " + decimal(state.dropped) + " model s | speed " + decimal(state.speed));
    std::string brush = "TEMPERATURE";
    if (state.brushMode == BrushMode::Heater) {
        brush = "HEATER";
    } else if (state.brushMode == BrushMode::EraseHeater) {
        brush = "UNPIN";
    }
    text(renderer, 780, 629, "brush " + brush + " theta=" + decimal(state.brushValue, 1) + " r=" + std::to_string(state.radius));
#if LAB_CHECKPOINT >= 8
    drawHistory(renderer, state);
#endif
    const Rect view = sceneRect(field, false);
    const SDL_FRect frame{view.x - 1, view.y - 1, view.width + 2, view.height + 2};
    setColor(renderer, {80, 100, 125, 255});
    requireSdl(SDL_RenderRect(renderer, &frame), "plate frame");
    std::string scale = "FIXED COLOR SCALE: theta 0 -> 1";
    if (state.settings.experiment) {
        scale = "EXPERIMENT COLORS [-1,2]; raw theta may exceed display range";
    }
    for (int index = 0; index < 128; ++index) {
        double theta = static_cast<double>(index) / 127;
        if (state.settings.experiment) {
            theta = -1 + 3 * theta;
        }
        setColor(renderer, heatColor(theta, state.settings.experiment));
        const SDL_FRect swatch{24 + static_cast<float>(index), 116, 1, 8};
        requireSdl(SDL_RenderFillRect(renderer, &swatch), "fixed color legend");
    }
    text(renderer, 164, 115, scale);
#if LAB_CHECKPOINT >= 2
    const float cellWidth = view.width / field.width;
    const float cellHeight = view.height / field.height;
    const SDL_FRect cursor{view.x + state.cursorX * cellWidth, view.y + state.cursorY * cellHeight, cellWidth, cellHeight};
    setColor(renderer, {255, 255, 255, 255});
    requireSdl(SDL_RenderRect(renderer, &cursor), "cell cursor");
#endif
    // Thông báo không che heatmap; giới hạn chiều dài phù hợp panel.
    text(renderer, 780, 830, state.message.substr(0, 49), {238, 196, 112, 255});
    if (state.message.size() > 49) {
        text(renderer, 780, 842, state.message.substr(49, 49), {238, 196, 112, 255});
    }
}

} // namespace heat
