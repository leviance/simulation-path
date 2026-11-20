#pragma once
#include "benchmark.hpp"
#include "cloud-context.hpp"
#include "comparison.hpp"
#include "overlay.hpp"
#include <iomanip>
#include <sstream>

namespace volume54 {
inline std::string number(double value, int digits = 3) {
    std::ostringstream stream;
    stream << std::fixed << std::setprecision(digits) << value;
    return stream.str();
}
enum class Action {
    Dataset,
    Mip,
    Average,
    Alpha,
    SmallerStep,
    LargerStep,
    LessSigma,
    MoreSigma,
    LessCutoff,
    MoreCutoff,
    Palette,
    Lighting,
    Pause,
    Reset,
    Inside,
    Resolution,
    Early,
    Benchmark,
    Inspector,
    Showcase
};

struct Button {
    Rect bounds;
    std::string title;
    Action action;
    bool enabled = true;
    bool selected = false;
};

inline int sceneWidth(int windowWidth, bool showcase) {
    if (showcase)
        return windowWidth;
    return std::max(1, windowWidth - 320);
}

// Shared hit rectangles: the event code never duplicates the drawing coordinates.
inline std::vector<Button> buttons(const State& state, const Benchmark& benchmark, int width) {
    if (state.showcase)
        return {};
    const float x = static_cast<float>(width - 300);
    std::string pause = "PLAY ORBIT [SPACE]";
    if (!state.paused)
        pause = "PAUSE [SPACE]";
    std::string camera = "GO INSIDE [I]";
    if (state.camera.inside)
        camera = "GO OUTSIDE [I]";
    std::string measure = "MEASURE [B]";
    if (benchmark.active)
        measure = "CANCEL [B]";
    std::string palette = "PALETTE: NATURAL CLOUD [C]";
    if (state.settings.palette == 1)
        palette = "PALETTE: DENSITY COLORS [C]";
    if (state.settings.palette == 2)
        palette = "TRANSFER: WHITE [C]";
    std::string lighting = "L: GRADIENT LIGHT OFF";
    if (state.settings.lighting)
        lighting = "L: GRADIENT LIGHT ON";
    return {
        {{x, 104, 280, 30}, presetName(state.preset), Action::Dataset, lessonStage >= 4},
        {{x, 154, 88, 32}, "MIP [1]", Action::Mip, lessonStage >= 5, state.settings.mode == Mode::Mip},
        {{x + 96, 154, 88, 32}, "MEAN [2]", Action::Average, lessonStage >= 5, state.settings.mode == Mode::Average},
        {{x + 192, 154, 88, 32}, "ALPHA [3]", Action::Alpha, lessonStage >= 6, state.settings.mode == Mode::Alpha},
        {{x, 211, 32, 28}, "-", Action::SmallerStep, lessonStage >= 5},
        {{x + 248, 211, 32, 28}, "+", Action::LargerStep, lessonStage >= 5},
        {{x, 261, 32, 28}, "-", Action::LessSigma, lessonStage >= 6},
        {{x + 248, 261, 32, 28}, "+", Action::MoreSigma, lessonStage >= 6},
        {{x, 311, 32, 28}, "-", Action::LessCutoff, lessonStage >= 7},
        {{x + 248, 311, 32, 28}, "+", Action::MoreCutoff, lessonStage >= 7},
        {{x, 355, 280, 30}, palette, Action::Palette, lessonStage >= 7},
        {{x, 386, 280, 14}, lighting, Action::Lighting, lessonStage >= 7, state.settings.lighting},
        {{x, 402, 166, 30}, pause, Action::Pause, lessonStage >= 2},
        {{x + 174, 402, 106, 30}, "RESET [R]", Action::Reset},
        {{x, 447, 170, 30}, camera, Action::Inside, lessonStage >= 3, state.camera.inside},
        {{x + 178, 447, 102, 30}, "N: 64/128", Action::Resolution, lessonStage >= 9},
        {{x, 492, 132, 30}, "EARLY [E]", Action::Early, lessonStage >= 9, state.settings.early},
        {{x + 140, 492, 140, 30}, measure, Action::Benchmark, lessonStage >= 9},
        {{x, 536, 132, 28}, "RAY [V]", Action::Inspector, lessonStage >= 8, state.inspect},
        {{x + 140, 536, 140, 28}, "CLEAN [TAB]", Action::Showcase}};
}

inline void drawProfile(Overlay& ui, const State& state, int width, int height) {
#if LAB_CHECKPOINT >= 8
    const float x = 24;
    const float y = static_cast<float>(height - 168);
    const float w = static_cast<float>(width - 48);
    ui.rectangle({x - 10, y - 12, w + 20, 148}, {0.025F, 0.055F, 0.073F, 0.93F});
    ui.text(x, y, "RAY / CPU REFERENCE", ink, 1.6F);
    ui.text(x + 260, y, "SHIFT+CLICK PICKS  |  , / . STEP", muted, 1.2F);
    const auto& profile = state.trace.profile;
    const float graphY = y + 24;
    ui.line(x, graphY + 62, x + w, graphY + 62, muted);
    if (!profile.empty()) {
        const double entry = profile.front().distance - 0.5 * profile.front().ds;
        for (std::size_t i = 1; i < profile.size(); ++i) {
            const float x0 = x + static_cast<float>((profile[i - 1].distance - entry) / state.trace.length) * w;
            const float x1 = x + static_cast<float>((profile[i].distance - entry) / state.trace.length) * w;
            ui.line(x0, graphY + 62 - static_cast<float>(profile[i - 1].density) * 60, x1, graphY + 62 - static_cast<float>(profile[i].density) * 60, amber, 1.5F);
            if (state.settings.mode == Mode::Alpha)
                ui.line(x0, graphY + 62 - static_cast<float>(profile[i - 1].transmittance) * 60, x1, graphY + 62 - static_cast<float>(profile[i].transmittance) * 60, teal, 1.5F);
        }
        if (state.shown > 0) {
            const Sample& sample = profile[static_cast<std::size_t>(state.shown - 1)];
            const float position = x + static_cast<float>((sample.distance - entry) / state.trace.length) * w;
            ui.line(position, graphY, position, graphY + 62, teal, 1.5F);
        }
    }
    std::string text = "SAMPLES " + std::to_string(state.shown) + "/" + std::to_string(state.trace.samples) + "   L=" + number(state.trace.length);
    if (state.settings.mode == Mode::Alpha)
        text += "   T=" + number(state.trace.transmittance, 6);
    if (state.settings.mode == Mode::Mip)
        text += "   MAX=" + number(state.trace.maximum, 6);
    if (state.settings.mode == Mode::Average)
        text += "   MEAN=" + number(state.trace.mean, 6);
    ui.text(x, y + 100, text, ink, 1.45F);
    if (state.shown > 0 && !profile.empty()) {
        const Sample& sample = profile[static_cast<std::size_t>(state.shown - 1)];
        std::string values = "t=" + number(sample.distance, 4) + "  ds=" + number(sample.ds, 4) + "  RAW=" + number(sample.raw, 5) + "  RHO'=" + number(sample.density, 5);
        if (state.settings.mode == Mode::Alpha)
            values += "  T=" + number(sample.transmittance, 6);
        ui.text(x, y + 120, values, ink, 1.3F);
    } else
        ui.text(x, y + 120, "AMBER: CLASSIFIED RHO  /  TEAL: T (ALPHA ONLY)  /  PRESS . TO INSPECT", muted, 1.15F);
#else
    (void)ui;
    (void)state;
    (void)width;
    (void)height;
#endif
}

inline void drawUi(Overlay& ui, const State& state, const Benchmark& benchmark, const Renderer& renderer, int width, int height) {
    const int viewWidth = sceneWidth(width, state.showcase);
    ui.begin();
    ui.text(24, 24, "CLOUD / SEE THROUGH", ink, 2.8F);
    ui.text(26, 54, "PROJECT 54  /  FRAGMENT SHADER  /  LESSON " + std::to_string(lessonStage), teal, 1.4F);
    std::string explanation = "MAXIMUM DENSITY ALONG THE RAY";
    if (state.settings.mode == Mode::Average)
        explanation = "LENGTH-WEIGHTED MEAN - NOT X-RAY ATTENUATION";
    if (state.settings.mode == Mode::Alpha)
        explanation = "FRONT LAYERS HIDE FAR LAYERS";
#if LAB_CHECKPOINT == 0
    explanation = "STARTER WINDOW / NO VOLUME ALLOCATED";
#endif
#if LAB_CHECKPOINT == 1
    explanation = "FIRST FULLSCREEN FRAGMENT / UV IMAGE";
#endif
#if LAB_CHECKPOINT == 2
    explanation = "PERSPECTIVE RAY DIRECTIONS / NO DENSITY";
#endif
#if LAB_CHECKPOINT == 3
    explanation = "RAY-BOX LENGTH / NO DENSITY";
#endif
#if LAB_CHECKPOINT == 4
    explanation = "ONE MIDPOINT SAMPLE / NOT FULL INTEGRATION";
#endif
    ui.text(26, 82, std::string(modeName(state.settings.mode)) + "  |  " + explanation, muted, 1.35F);
    ui.text(26, 105, "DRAG / ARROWS ORBIT   WHEEL ZOOM   I INSIDE   TAB TOOLS", muted, 1.2F);
#if LAB_CHECKPOINT >= 7
    ui.text(26, 133, "STATIC SYNTHETIC CLOUD  /  DENSITY IS NOT TEMPERATURE  /  NO FLUID SOLVER", teal, 1.2F);
#endif

    if (state.showcase) {
#if LAB_CHECKPOINT >= 4
        ui.text(24, static_cast<float>(height - 28), std::to_string(state.side) + "^3 ACTUAL VOXELS  |  TAB RESTORES CONTROLS  |  STATIC SYNTHETIC DENSITY", muted, 1.4F);
#else
        ui.text(24, static_cast<float>(height - 28), "SHADER SCAFFOLD / NO VOLUME ALLOCATED / TAB RESTORES CONTROLS", muted, 1.4F);
#endif
        return;
    }
    const float x = static_cast<float>(width - 300);
    ui.rectangle({static_cast<float>(viewWidth), 0, 320, static_cast<float>(height)}, {0.035F, 0.065F, 0.083F});
    ui.line(static_cast<float>(viewWidth), 0, static_cast<float>(viewWidth), static_cast<float>(height), {0.16F, 0.27F, 0.32F});
    ui.text(x, 26, "DATA / TRANSFER", ink, 2);
#if LAB_CHECKPOINT >= 4
    ui.text(x, 54, std::to_string(state.side) + "^3 / " + std::to_string(state.side * state.side * state.side) + " VOXELS", teal, 1.5F);
    ui.text(x, 76, "R32F / " + number(state.side * state.side * state.side * 4.0 / 1048576, 1) + " MIB / NO MESH", muted, 1.4F);
#else
    ui.text(x, 54, "NO VOLUME ALLOCATED", teal, 1.5F);
    ui.text(x, 76, "WINDOW / SHADER SCAFFOLD", muted, 1.4F);
#endif
    for (const Button& button : buttons(state, benchmark, width)) {
        Tint background{0.075F, 0.14F, 0.18F};
        Tint text = ink;
        if (button.selected && button.enabled)
            background = {0.12F, 0.35F, 0.38F};
        if (!button.enabled)
            text = {0.24F, 0.34F, 0.39F};
        ui.rectangle(button.bounds, background);
        ui.text(button.bounds.x + 8, button.bounds.y + (button.bounds.height - 9.45F) / 2, button.title, text, 1.35F);
    }
#if LAB_CHECKPOINT >= 5
    std::string probe = "CPU RAY MAX=" + number(state.trace.maximum, 6);
    if (state.settings.mode == Mode::Average)
        probe = "CPU RAY MEAN=" + number(state.trace.mean, 6);
    if (state.settings.mode == Mode::Alpha)
        probe = "CPU RAY T=" + number(state.trace.transmittance, 6);
    ui.text(x, 139, probe, teal, 1.2F);
#endif
    ui.text(x, 194, "STEP / WORLD UNITS", muted, 1.25F);
    ui.text(x + 64, 219, number(state.settings.stepLength, 3), amber, 1.6F);
    ui.text(x, 245, "SIGMA / PER WORLD UNIT (ALPHA ONLY)", muted, 1.15F);
    ui.text(x + 64, 269, number(state.settings.sigma, 2), amber, 1.6F);
    ui.text(x, 295, "CUTOFF / CLASSIFY DENSITY", muted, 1.25F);
    ui.text(x + 64, 319, number(state.settings.cutoff, 2), amber, 1.6F);
    ui.text(x, 583, "STEP   ERROR   MEDIAN / IQR MS", muted, 1.25F);
    ui.text(x, 570, "BENCH " + std::to_string(benchmark.results.size()) + "/4  /  FIXED 320X240", muted, 1.1F);
    float row = 606;
    for (const Measurement& result : benchmark.results) {
        ui.text(x, row, number(result.step, 3), amber, 1.35F);
        ui.text(x + 52, row, number(result.maximumError, 5), ink, 1.15F);
        ui.text(x + 116, row, number(result.medianMs, 3), teal, 1.35F);
        ui.text(x + 174, row, number(result.lowerMs, 3) + "-" + number(result.upperMs, 3), muted, 1.1F);
        row += 23;
    }
    if (benchmark.results.empty()) {
        ui.text(x, 610, "B: FIXED 320X240 GPU KERNEL", ink, 1.2F);
        ui.text(x, 632, "1 WARM-UP + 5 TIMED REPEATS", muted, 1.2F);
        ui.text(x, 654, "48 RAYS VS CPU STEP 0.002", muted, 1.2F);
    }
    if (height >= 800) {
        ui.text(x, 711, "ERROR IS AN ESTIMATE, NOT PROOF", muted, 1.15F);
        ui.text(x, 732, "MEDIAN TIME EXCLUDES READBACK", muted, 1.15F);
    } else
        ui.text(x, 700, "ERROR VS CPU FINE / GPU MEDIAN", muted, 1.15F);

#if LAB_CHECKPOINT >= 4
    if (height >= 880) {
        ui.text(x, 770, "FULL-VOLUME HISTOGRAM / LOG(1+N)", muted, 1.15F);
        const auto maximum = *std::max_element(state.bins.begin(), state.bins.end());
        for (int i = 0; i < 32; ++i) {
            const float h = static_cast<float>(std::log1p(state.bins[i]) / std::log1p(maximum)) * 55;
            ui.rectangle({x + i * 8.5F, 840 - h, 6.5F, h}, {0.25F, 0.64F, 0.66F});
        }
    }
#endif
    ui.text(x, static_cast<float>(height - 36), "MARCH GPU " + number(renderer.gpuMilliseconds, 2) + " MS", teal, 1.3F);
    ui.text(x, static_cast<float>(height - 18), std::to_string(renderer.width) + " X " + std::to_string(renderer.height) + " ACTUAL RAY TARGET", muted, 1.1F);
    if (state.inspect)
        drawProfile(ui, state, viewWidth, height);
    else {
        drawCloudContext(ui, state, viewWidth, height);
        drawComparisonFrames(ui, viewWidth, height, benchmark.active);
    }
    ui.text(24, static_cast<float>(height - 16), state.status.substr(0, static_cast<std::size_t>(std::max(1, viewWidth / 8))), muted, 1.15F);
    const float px = static_cast<float>(state.selectedU * viewWidth);
    const float py = static_cast<float>(state.selectedV * height);
#if LAB_CHECKPOINT >= 8
    ui.line(px - 6, py, px + 6, py, teal, 1.3F);
    ui.line(px, py - 6, px, py + 6, teal, 1.3F);
#else
    (void)px;
    (void)py;
#endif
}
} // namespace volume54
