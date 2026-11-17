#pragma once
#include "controls.hpp"
#include "cutaway-render.hpp"
#include "state.hpp"
#include "ui.hpp"
#include <cstring>
#include <limits>

namespace slices {
constexpr int viewWidth = 1440;
constexpr int viewHeight = 900;

#if LAB_CHECKPOINT >= 1
// [snippet upload]
inline bool upload(SDL_Texture* texture, const Image& image) {
    void* pixels = nullptr;
    int pitch = 0;
    if (!SDL_LockTexture(texture, nullptr, &pixels, &pitch)) {
        return false;
    }
    for (int row = 0; row < Image::side; ++row) {
        auto* destination = static_cast<std::uint8_t*>(pixels) + row * pitch;
        const auto* source = image.rgba.data() + row * Image::side * 4;
        std::memcpy(destination, source, Image::side * 4);
    }
    SDL_UnlockTexture(texture);
    return true;
}

// [/snippet upload]

struct SliceCache {
    ScalarImage scalars;
    Image image;
    int revision = -1;
    double cut = std::numeric_limits<double>::quiet_NaN();
    bool linear = false;
    Window windowing{-1, -1};
    bool color = false;

    bool refresh(SDL_Texture* texture, const State& state, int view) {
        const int axis = axesFor(view).cut;
        const bool resample = revision != state.dataRevision || cut != state.cursor[axis] || linear != state.linear;
        if (resample) {
#if LAB_CHECKPOINT <= 1
            scalars = sampleImage(state.grid, view, state.cursor, state.linear);
#endif
#if LAB_CHECKPOINT >= 2
            scalars = sampleImage(state.grid, view, state.cursor, state.linear, state.volume);
#endif
            revision = state.dataRevision;
            cut = state.cursor[axis];
            linear = state.linear;
        }
        if (resample || windowing.level != state.windowing.level || windowing.width != state.windowing.width || color != state.color) {
            windowing = state.windowing;
            color = state.color;
            image = colorImage(scalars, windowing, color);
            return upload(texture, image);
        }
        return true;
    }
};

inline void drawSlice(Painter& paint, SDL_Texture* texture, const State& state, int view, bool threeViews) {
    const Rect panel = panelRect(view, viewWidth, viewHeight, threeViews);
    const Rect rect = fitSlice(state.grid, view, panel);
    Color background{233, 239, 243, 255};
    if (state.dark) {
        background = {29, 48, 64, 255};
    }
    double header = 92;
    if (threeViews) {
        header = panel.y - 34;
    }
    paint.box({panel.x - 12, header, panel.width + 24, panel.height + 72}, background);
    const SDL_FRect destination{static_cast<float>(rect.x), static_cast<float>(rect.y), static_cast<float>(rect.width), static_cast<float>(rect.height)};
    paint.ok = SDL_RenderTexture(paint.renderer, texture, nullptr, &destination) && paint.ok;
    const Axes axes = axesFor(view);
    std::string name = "XY / z";
    if (view == 1) {
        name = "XZ / y";
    }
    if (view == 2) {
        name = "YZ / x";
    }
    paint.text(panel.x + 2, header + 10, name + " = " + number(state.cursor[axes.cut]), ink, 1.25f);
#if LAB_CHECKPOINT >= 2
    const auto slider = sliceSlider(view, viewWidth, viewHeight, threeViews);
    const double cut = gridCoordinate(state.grid, axes.cut, state.cursor[axes.cut]);
    paint.slider(slider, cut / (state.grid.count[axes.cut] - 1), planeColors[view]);
#endif
#if LAB_CHECKPOINT >= 6
    const double u = (state.cursor[axes.horizontal] - lower(state.grid, axes.horizontal)) / (state.grid.count[axes.horizontal] * state.grid.spacing[axes.horizontal]);
    const double v = 1 - (state.cursor[axes.vertical] - lower(state.grid, axes.vertical)) / (state.grid.count[axes.vertical] * state.grid.spacing[axes.vertical]);
    paint.line(rect.x + u * rect.width, rect.y, rect.x + u * rect.width, rect.y + rect.height, planeColors[view]);
    paint.line(rect.x, rect.y + v * rect.height, rect.x + rect.width, rect.y + v * rect.height, planeColors[view]);
#endif
}
#endif

#if LAB_CHECKPOINT >= 3
struct SceneCache {
    std::array<double, 14> previous{};
    bool valid = false;

    bool refresh(SDL_Texture* texture, const State& state, const std::array<SliceCache, 3>& slices) {
        const std::array<double, 14> signature{static_cast<double>(state.dataRevision), state.cursor[0], state.cursor[1], state.cursor[2], state.camera.yaw, state.camera.pitch, state.camera.distance, state.windowing.level, state.windowing.width, static_cast<double>(state.linear), static_cast<double>(state.color), static_cast<double>(state.cutaway), static_cast<double>(state.dark), 0};
        if (valid && signature == previous) {
            return true;
        }
        // [snippet scene-inputs]
        const std::array<const ScalarImage*, 3> raw{&slices[0].scalars, &slices[1].scalars, &slices[2].scalars};
        const std::array<const Image*, 3> images{&slices[0].image, &slices[1].image, &slices[2].image};
        const auto frame = renderCutaway(state.grid, state.mesh, state.cursor, state.camera, state.cutaway, raw, images, state.dark);
        // [/snippet scene-inputs]
        void* pixels = nullptr;
        int pitch = 0;
        if (!SDL_LockTexture(texture, nullptr, &pixels, &pitch)) {
            return false;
        }
        for (int row = 0; row < SceneFrame::height; ++row) {
            std::memcpy(static_cast<std::uint8_t*>(pixels) + row * pitch, frame.rgba.data() + row * SceneFrame::width * 4, SceneFrame::width * 4);
        }
        SDL_UnlockTexture(texture);
        previous = signature;
        valid = true;
        return true;
    }
};
#endif

#if LAB_CHECKPOINT >= 4
inline void drawHistogram(Painter& paint, const State& state) {
    const Rect area{52, 178, 584, 282};
    Color background{233, 239, 243, 255};
    if (state.dark) {
        background = {29, 48, 64, 255};
    }
    paint.box(area, background);
    paint.text(area.x + 16, area.y + 16, "RAW SCALAR HISTOGRAM / log1p(count)");
    const auto maximum = *std::max_element(state.statistics.bins.begin(), state.statistics.bins.end());
    const double barWidth = (area.width - 40) / 64;
    for (std::size_t i = 0; i < state.statistics.bins.size(); ++i) {
        const double height = 160 * std::log1p(static_cast<double>(state.statistics.bins[i])) / std::log1p(static_cast<double>(maximum));
        paint.box({area.x + 20 + i * barWidth, area.y + 208 - height, barWidth - 1, height}, {55, 142, 160, 255});
    }
    for (double value : {state.windowing.level - state.windowing.width / 2, state.windowing.level + state.windowing.width / 2}) {
        const double x = area.x + 20 + (area.width - 40) * std::clamp(value, 0.0, 1.0);
        paint.line(x, area.y + 45, x, area.y + 208, {210, 158, 70, 255});
    }
    paint.text(area.x + 20, area.y + 226, "0                 scalar [0,1]                  1", muted, 1.25f);
    paint.text(area.x + 20, area.y + 252, std::to_string(state.statistics.samples) + " real samples | H to close", muted, 1.25f);
}
#endif

inline bool drawDashboard(SDL_Renderer* renderer, [[maybe_unused]] const std::array<SDL_Texture*, 3>& textures, [[maybe_unused]] SDL_Texture* sceneTexture, const State& state) {
    Painter paint{renderer, true, state.dark};
    Color background{245, 248, 250, 255};
    Color panelColor{233, 239, 243, 255};
    if (state.dark) {
        background = {20, 33, 45, 255};
        panelColor = {29, 48, 64, 255};
    }
    paint.color(background);
    paint.ok = SDL_RenderClear(renderer) && paint.ok;
    paint.text(20, 22, "CUTAWAY MATERIAL / VOLUME SLICER", ink, 2);
    paint.text(20, 60, "Synthetic scalar | world units | not CT reconstruction / not HU", muted, 1.25f);
    paint.box({1032, 92, 392, 752}, panelColor);
    paint.text(1048, 110, "DATASET / INSPECTOR");
#if LAB_CHECKPOINT >= 1
    int views = 1;
#if LAB_CHECKPOINT >= 3
    views = 3;
#endif
    for (int view = 0; view < views; ++view) {
        drawSlice(paint, textures[view], state, view, views == 3);
    }
#endif
#if LAB_CHECKPOINT >= 3
    const SDL_FRect scene{static_cast<float>(sceneViewport.x), static_cast<float>(sceneViewport.y), static_cast<float>(sceneViewport.width), static_cast<float>(sceneViewport.height)};
    paint.ok = SDL_RenderTexture(renderer, sceneTexture, nullptr, &scene) && paint.ok;
    std::string mode = "Corner removed: inspect the material inside";
    if (!state.cutaway) {
        mode = "Whole object: context surface s=0.18";
    }
    paint.text(24, 96, mode, ink, 1.25f);
    paint.text(24, 770, "Drag orbit | Wheel zoom | Ctrl+arrows camera | O whole/cut", muted, 1.25f);
    paint.text(24, 796, "Context mesh stride 3 / " + std::to_string(state.mesh.size()) + " triangles", muted, 1.25f);
    paint.text(24, 820, "Three 256x256 slices sample the full volume; mesh is context only.", muted, 1.25f);
    paint.button(cutawayButton, "O  Whole / Cut", state.cutaway);
    paint.button(cameraButton, "F  Camera home");
#endif
#if LAB_CHECKPOINT >= 2
    for (int index = 0; index < 5; ++index) {
        paint.button(presetButton(index), presetNames[index], static_cast<int>(state.preset) == index);
    }
    paint.button(resolutionButton, "N " + std::to_string(state.grid.count[0]) + "^3");
    paint.text(1048, 636, std::to_string(state.volume.values.size()) + " voxels / " + number(state.volume.values.size() * sizeof(double) / 1048576.0, 1) + " MiB", ink, 1.25f);
    paint.text(1048, 660, "world: " + number(state.cursor[0]) + ", " + number(state.cursor[1]) + ", " + number(state.cursor[2]), muted, 1.25f);
    std::array<int, 3> index{};
    std::string gridText = "grid: ";
    for (int axis = 0; axis < 3; ++axis) {
        const double coordinate = gridCoordinate(state.grid, axis, state.cursor[axis]);
        index[axis] = std::clamp(static_cast<int>(std::floor(coordinate + 0.5)), 0, state.grid.count[axis] - 1);
        gridText += number(coordinate, 2) + " ";
    }
    paint.text(1048, 684, gridText, muted, 1.25f);
    paint.text(1048, 708, "voxel: " + std::to_string(index[0]) + "," + std::to_string(index[1]) + "," + std::to_string(index[2]) + " | #" + std::to_string(state.volume.index(index[0], index[1], index[2])), muted, 1.25f);
    paint.text(1048, 732, "nearest: " + number(sampleNearest(state.volume, state.cursor).value_or(0), 7), ink, 1.25f);
#endif
#if LAB_CHECKPOINT >= 4
    paint.button(paletteButton, "C  Color", state.color);
    paint.text(1048, 360, "Level " + number(state.windowing.level, 2), muted, 1.25f);
    paint.slider(levelSlider, state.windowing.level, planeColors[0]);
    paint.text(1048, 426, "Window " + number(state.windowing.width, 2), muted, 1.25f);
    paint.slider(widthSlider, (state.windowing.width - 0.05) / 1.45, planeColors[1]);
    paint.button(histogramButton, "H  Histogram", state.showHistogram);
    if (state.showHistogram) {
        drawHistogram(paint, state);
    }
#endif
    paint.button(themeButton, "T  Light/Dark", state.dark);
#if LAB_CHECKPOINT >= 5
    std::string sampler = "L  Nearest";
    if (state.linear) {
        sampler = "L  Trilinear";
    }
    paint.button(samplerButton, sampler, state.linear);
    paint.text(1048, 756, "trilinear: " + number(sampleLinear(state.volume, state.cursor).value_or(0), 7), ink, 1.25f);
#endif
#if LAB_CHECKPOINT >= 6
    std::string scan = "Space  Scan";
    if (!state.paused) {
        scan = "Space  Pause";
    }
    paint.button(scanButton, scan, !state.paused);
#endif
    paint.button(resetButton, "R  Reset view");
#if LAB_CHECKPOINT >= 7
    paint.button(auditButton, "V  Check volume");
    paint.text(1048, 790, state.audit, muted, 1.1f);
#endif
    if (!state.error.empty()) {
        paint.text(1048, 816, state.error.substr(0, 38), {190, 70, 55, 255}, 1.0f);
    }
    paint.text(20, 858, "1/2/3 plane | PgUp/Dn slice | arrows probe | P dataset | N 64/128 | L sampler | C color | R reset", muted, 1.25f);
    paint.text(20, 880, "W/S level | A/D width | Space scan/pause | V audit | Q/E orbit | +/- zoom | H histogram | T theme | Esc quit", muted, 1.25f);
    return paint.ok;
}
} // namespace slices
