#pragma once
#include "platform.hpp"
#include "state.hpp"
#include <iomanip>
#include <sstream>

namespace slice53 {
// SDL widgets present existing state. Labels and palette controls never write voxel data.
inline constexpr std::array<SDL_Color, 3> axisColors{{{241, 165, 103, 255}, {109, 174, 224, 255}, {115, 204, 171, 255}}};

inline std::string number(double value, int precision = 1) {
    std::ostringstream text;
    text << std::fixed << std::setprecision(precision) << value;
    return text.str();
}

inline SDL_FRect sdlRect(Rect rect) { return {static_cast<float>(rect.x), static_cast<float>(rect.y), static_cast<float>(rect.width), static_cast<float>(rect.height)}; }
inline void ink(SDL_Renderer* renderer, SDL_Color color) { SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a); }
inline void fill(SDL_Renderer* renderer, Rect rect, SDL_Color color) { ink(renderer, color); const SDL_FRect area = sdlRect(rect); SDL_RenderFillRect(renderer, &area); }
inline void border(SDL_Renderer* renderer, Rect rect, SDL_Color color) { ink(renderer, color); const SDL_FRect area = sdlRect(rect); SDL_RenderRect(renderer, &area); }
inline void text(SDL_Renderer* renderer, double x, double y, const std::string& value, SDL_Color color = {197, 214, 219, 255}) {
    ink(renderer, color);
    SDL_RenderDebugText(renderer, static_cast<float>(x), static_cast<float>(y), value.c_str());
}

struct Button { Rect rect; std::string label; int action; bool enabled; };

inline std::vector<Button> buttons(const State& state) {
    std::string sampling = "NEAREST";
    if (state.linear) sampling = "TRILINEAR";
    std::string scan = "SCAN";
    if (!state.paused) scan = "PAUSE";
    std::string cut = "CUT OPEN";
    if (!state.cut) cut = "WHOLE";
    return {{{18, 47, 238, 27}, std::string(presetName(state.preset)), 0, lessonStage >= 2}, {{264, 47, 100, 27}, std::to_string(state.side) + "^3", 1, lessonStage >= 2}, {{372, 47, 132, 27}, sampling, 2, lessonStage >= 4}, {{512, 47, 112, 27}, "PALETTE", 3, lessonStage >= 5}, {{632, 47, 112, 27}, cut, 4, lessonStage >= 6}, {{752, 47, 112, 27}, scan, 5, lessonStage >= 8}, {{872, 47, 106, 27}, "RESET", 6, lessonStage >= 1}, {{986, 47, 112, 27}, "CHECK", 7, lessonStage >= 9}, {{1106, 47, 196, 27}, "SHOW / HIDE DATA", 8, lessonStage >= 2}};
}

inline void drawImage(SDL_Renderer* renderer, SDL_Texture* texture, Rect area) {
    const SDL_FRect target = sdlRect(area);
    SDL_RenderTexture(renderer, texture, nullptr, &target);
}

inline void crosshair(SDL_Renderer* renderer, const Grid& grid, int view, Rect image, Vec3 probe) {
    const Axes axes = axesFor(view);
    const Vec3 extent = grid.extent();
    const double u = (probe[axes.horizontal] - grid.origin[axes.horizontal]) / extent[axes.horizontal];
    const double v = (probe[axes.vertical] - grid.origin[axes.vertical]) / extent[axes.vertical];
    const float x = static_cast<float>(image.x + u * image.width);
    const float y = static_cast<float>(image.y + (1 - v) * image.height);
    ink(renderer, axisColors[view]);
    SDL_RenderLine(renderer, x, static_cast<float>(image.y), x, static_cast<float>(image.y + image.height));
    SDL_RenderLine(renderer, static_cast<float>(image.x), y, static_cast<float>(image.x + image.width), y);
    SDL_FRect mark{x - 4, y - 4, 8, 8};
    SDL_RenderRect(renderer, &mark);
}

inline void drawUi(Platform& platform, const State& state) {
    SDL_Renderer* renderer = platform.renderer;
    ink(renderer, {12, 20, 27, 255});
    SDL_RenderClear(renderer);
    text(renderer, 20, 17, "SCALAR / SLICE WORKBENCH", {236, 231, 211, 255});
    text(renderer, 432, 17, "X / Y / Z IN mm    |    SYNTHETIC DATA - NOT A MEDICAL TOOL", {125, 157, 167, 255});
    text(renderer, 1172, 17, "LESSON " + std::to_string(lessonStage) + " / 9");
    for (const Button& button : buttons(state)) {
        SDL_Color color{190, 211, 219, 255};
        if (!button.enabled) color = {74, 91, 100, 255};
        fill(renderer, button.rect, {26, 42, 51, 255});
        border(renderer, button.rect, {43, 66, 77, 255});
        text(renderer, button.rect.x + 10, button.rect.y + 9, button.label, color);
    }
    fill(renderer, sceneArea, {19, 30, 40, 255});
#if LAB_CHECKPOINT >= 6
    if (state.scene) {
        const SDL_FRect area = sdlRect(sceneArea);
        SDL_RenderTexture(renderer, platform.scene, nullptr, &area);
    }
#elif LAB_CHECKPOINT >= 1
    drawImage(renderer, platform.slices[state.activeView], sliceRect(state.grid(), state.activeView, {125, 125, 600, 535}));
#endif
    border(renderer, sceneArea, {46, 70, 80, 255});
#if LAB_CHECKPOINT >= 6
    text(renderer, 35, 109, "SPECIMEN / 3D CONTEXT", {174, 203, 208, 255});
    text(renderer, 35, 664, "REFERENCE SHELL: iso 0.12 / stride 2.  SLICES READ ALL VOXELS.", {117, 150, 160, 255});
#else
    text(renderer, 35, 109, "ACTIVE SLICE / PHYSICAL ASPECT", {174, 203, 208, 255});
#endif
    text(renderer, 35, 684, "DRAG: ORBIT   WHEEL: ZOOM   CTRL+ARROWS: CAMERA   HOME: VIEW RESET", {133, 161, 171, 255});
#if LAB_CHECKPOINT >= 4
    if (state.debug && state.volume) {
        fill(renderer, {34, 137, 234, 196}, {18, 34, 43, 255});
        text(renderer, 44, 149, "8 CORNERS / ADDRESS VALUE W", {144, 176, 187, 255});
        const auto stencil = linearStencil(*state.volume, state.probe);
        if (stencil) {
            double weightSum = 0;
            for (std::size_t row = 0; row < stencil->size(); ++row) {
                const Contribution& entry = (*stencil)[row];
                text(renderer, 44, 172 + static_cast<double>(row) * 16, std::to_string(entry.address) + "  " + number(entry.value, 3) + "  " + number(entry.weight, 3));
                weightSum += entry.weight;
            }
            text(renderer, 44, 311, "WEIGHT SUM = " + number(weightSum, 6), {241, 188, 129, 255});
        }
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (state.debug && state.volume) {
        fill(renderer, {605, 133, 215, 100}, {18, 34, 43, 255});
        text(renderer, 615, 145, "RAW HISTOGRAM / log(1+n)", {144, 176, 187, 255});
        const auto peak = *std::max_element(state.statistics.bins.begin(), state.statistics.bins.end());
        const double scale = 52.0 / std::log1p(static_cast<double>(std::max(peak, std::size_t{1})));
        for (std::size_t bin = 0; bin < state.statistics.bins.size(); ++bin) {
            const double bar = scale * std::log1p(static_cast<double>(state.statistics.bins[bin]));
            fill(renderer, {615 + bin * 3.0, 220 - bar, 2, bar}, {116, 171, 179, 255});
        }
    }
#endif
    int views = 1;
#if LAB_CHECKPOINT >= 3
    views = 3;
#endif
    const Grid grid = state.grid();
    constexpr std::array<const char*, 3> names{"XY", "XZ", "YZ"};
    constexpr std::array<const char*, 3> held{"z", "y", "x"};
    constexpr std::array<const char*, 3> orientation{"x right / y up", "x right / z up", "y right / z up"};
    for (int view = 0; view < views; ++view) {
        const Rect panel = slicePanel(view);
        fill(renderer, panel, {19, 32, 41, 255});
        SDL_Color frame{41, 61, 72, 255};
        if (state.activeView == view) frame = axisColors[view];
        border(renderer, panel, frame);
        text(renderer, panel.x + 15, panel.y + 13, names[view], axisColors[view]);
        text(renderer, panel.x + 65, panel.y + 13, orientation[view], {123, 155, 166, 255});
        const Rect image = smallImage(grid, view);
        drawImage(renderer, platform.slices[view], image);
        crosshair(renderer, grid, view, image, state.probe);
        const int axis = axesFor(view).fixed;
        text(renderer, panel.x + 279, panel.y + 61, std::string(held[view]) + " = " + number(state.probe[axis]) + " mm", axisColors[view]);
        text(renderer, panel.x + 279, panel.y + 85, "q = " + number(grid.coordinate(state.probe[axis], axis), 2));
        text(renderer, panel.x + 279, panel.y + 109, "256 x 256 px");
        text(renderer, panel.x + 279, panel.y + 133, "NO PROJECTION", {108, 137, 149, 255});
        text(renderer, panel.x + 279, panel.y + 153, "NO RECONSTRUCT", {108, 137, 149, 255});
    }
    fill(renderer, {18, 728, 820, 190}, {19, 32, 41, 255});
    text(renderer, 32, 741, "VOXEL / PROBE", {164, 191, 198, 255});
    text(renderer, 32, 764, "p mm  " + number(state.probe.x, 2) + " / " + number(state.probe.y, 2) + " / " + number(state.probe.z, 2));
#if LAB_CHECKPOINT >= 5
    text(renderer, 437, 741, "DISPLAY / J K: LEVEL   U I: WIDTH", {123, 155, 166, 255});
    text(renderer, 437, 759, "LEVEL");
    text(renderer, 437, 788, "WIDTH");
    fill(renderer, {500, 755, 296, 10}, {31, 49, 59, 255});
    fill(renderer, {500, 784, 296, 10}, {31, 49, 59, 255});
    fill(renderer, {500 + state.window.level * 296 - 3, 752, 6, 16}, {241, 188, 129, 255});
    fill(renderer, {500 + (state.window.width - 0.05) / 1.45 * 296 - 3, 781, 6, 16}, {241, 188, 129, 255});
#endif
#if LAB_CHECKPOINT >= 3
    if (state.volume) {
        const double nearest = sampleNearest(*state.volume, state.probe).value_or(0);
        text(renderer, 32, 784, "nearest  " + number(nearest, 6), {153, 188, 199, 255});
#if LAB_CHECKPOINT >= 4
        const double linear = sampleLinear(*state.volume, state.probe).value_or(0);
        text(renderer, 255, 784, "linear " + number(linear, 6), {241, 188, 129, 255});
#endif
    }
#endif
    for (int view = 0; view < views; ++view) {
        const Rect slider = sliderRect(view);
        const int axis = axesFor(view).fixed;
        const double fraction = (state.probe[axis] - grid.origin[axis]) / grid.extent()[axis];
        text(renderer, 32, slider.y + 3, std::string(names[view]) + " / " + held[view], axisColors[view]);
        fill(renderer, slider, {31, 49, 59, 255});
        fill(renderer, {slider.x, slider.y, fraction * slider.width, slider.height}, axisColors[view]);
        fill(renderer, {slider.x + fraction * slider.width - 3, slider.y - 3, 6, slider.height + 6}, {223, 231, 229, 255});
        text(renderer, 692, slider.y + 3, number(state.probe[axis], 1) + " mm");
    }
    fill(renderer, {856, 832, 446, 86}, {19, 32, 41, 255});
#if LAB_CHECKPOINT >= 2
    if (state.volume) {
        text(renderer, 871, 846, "ACTUAL: " + std::to_string(state.volume->values().size()) + " VOXELS / " + number(state.volume->values().size() * sizeof(float) / 1048576.0, 1) + " MiB");
        text(renderer, 871, 866, "SPACING: " + number(grid.spacing.x, 2) + " / " + number(grid.spacing.y, 2) + " / " + number(grid.spacing.z, 2) + " mm");
        text(renderer, 871, 886, "FILL: " + number(state.buildMs) + " ms  SCENE: " + number(state.sceneMs) + " ms");
    }
#endif
    text(renderer, 20, 925, state.status, {134, 164, 174, 255});
}
} // namespace slice53
