#pragma once
#include "analysis.hpp"
#include "raster.hpp"
#include "stage.hpp"
#include <chrono>
#include <memory>
#include <string>

namespace slice53 {
// Own datasets and derived images here; camera/display changes do not rebuild scalar storage.
inline Vec3 initialProbe() {
#if LAB_CHECKPOINT >= 2
    return {-8, -4, -8};
#else
    return {0, 0, 0};
#endif
}

struct State {
    int side = 64;
    Preset preset = Preset::Specimen;
    Vec3 probe = initialProbe();
    Camera camera;
    Window window;
    bool linear = false;
    bool colored = false;
    bool cut = true;
    bool paused = true;
    bool debug = true;
    int activeView = 0;
    bool dirty = true;
    std::string status = "Synthetic scalar data. Not CT reconstruction.";
    double buildMs = 0;
    double sceneMs = 0;
    std::size_t sampledPixels = 0;
    std::array<SliceImage, 3> slices;
    std::array<std::vector<std::uint32_t>, 3> colors;
    std::array<bool, 3> colorDirty{};
#if LAB_CHECKPOINT >= 2
    std::unique_ptr<Volume> volume;
    Statistics statistics;
#endif
#if LAB_CHECKPOINT >= 6
    Mesh mesh;
    std::unique_ptr<Raster> scene;
#endif
    std::array<double, 3> previousCut{1e30, 1e30, 1e30};
    bool previousLinear = false;
    Window previousWindow{-1, -1};
    bool previousColored = false;

    State() {
#if LAB_CHECKPOINT < 2
        preset = Preset::Sphere;
#endif
#if LAB_CHECKPOINT >= 9
        side = 128;
#endif
#if LAB_CHECKPOINT >= 4
        linear = true;
#endif
#if LAB_CHECKPOINT >= 5
        colored = true;
#endif
#if LAB_CHECKPOINT >= 2
        if (!load(Preset::Specimen, side)) throw std::runtime_error(status);
#endif
    }

#if LAB_CHECKPOINT >= 2
    // [snippet transactional-load]
    bool load(Preset nextPreset, int nextSide) {
        paused = true;
        const auto started = std::chrono::steady_clock::now();
        try {
            auto nextVolume = std::make_unique<Volume>(buildVolume(nextPreset, nextSide));
            Statistics nextStatistics = measure(*nextVolume);
#if LAB_CHECKPOINT >= 6
            Mesh nextMesh = buildContextMesh(*nextVolume);
            mesh = std::move(nextMesh);
#endif
            volume = std::move(nextVolume);
            statistics = nextStatistics;
            preset = nextPreset;
            side = nextSide;
            previousCut.fill(1e30);
            previousWindow = {-1, -1};
            buildMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - started).count();
            status = "Dataset ready. Measurements use the full scalar array.";
            dirty = true;
            return true;
        } catch (const std::exception& error) {
            status = std::string("Dataset unchanged: ") + error.what();
            return false;
        }
    }
    // [/snippet transactional-load]
#endif

    Grid grid() const {
#if LAB_CHECKPOINT >= 2
        if (volume) return volume->grid();
#endif
        return makeGrid(side);
    }

    // [snippet reset-view]
    void reset() {
        paused = true;
        probe = initialProbe();
        camera = {};
        window = {};
        activeView = 0;
        dirty = true;
    }
    // [/snippet reset-view]

#if LAB_CHECKPOINT >= 8
    // [snippet scan-clock]
    void advance(double elapsedSeconds) {
        if (paused) return;
        const int axis = axesFor(activeView).fixed;
        const Grid geometry = grid();
        const double end = (geometry.origin + geometry.extent())[axis];
        const double elapsed = std::clamp(elapsedSeconds, 0.0, 0.05);
        probe[axis] = std::min(end, probe[axis] + 12.0 * elapsed);
        if (probe[axis] >= end) paused = true;
        dirty = true;
    }
    // [/snippet scan-clock]
#endif

    void refresh() {
        sampledPixels = 0;
        colorDirty.fill(false);
        int views = 1;
#if LAB_CHECKPOINT >= 3
        views = 3;
#endif
        for (int view = 0; view < views; ++view) {
            const double coordinate = probe[axesFor(view).fixed];
            bool resample = true;
            // [snippet slice-cache]
#if LAB_CHECKPOINT >= 8
            resample = coordinate != previousCut[view] || linear != previousLinear;
#endif
            if (resample) {
#if LAB_CHECKPOINT >= 2
                if (volume) renderSlice(*volume, slices[view], view, probe, linear);
#elif LAB_CHECKPOINT >= 1
                renderFirstSlice(slices[view], probe.z);
#endif
                sampledPixels += slices[view].scalar.size();
            }
            if (resample || window.level != previousWindow.level || window.width != previousWindow.width || colored != previousColored) {
                colorImage(slices[view], colors[view], window, colored);
                colorDirty[view] = true;
            }
            previousCut[view] = coordinate;
        }
        previousLinear = linear;
        previousWindow = window;
        previousColored = colored;
        // [/snippet slice-cache]
#if LAB_CHECKPOINT >= 6
        // [snippet refresh-context]
        if (!scene) scene = std::make_unique<Raster>(820, 620);
        const auto started = std::chrono::steady_clock::now();
        drawContext(*scene, cameraFrame(camera, 820, 620), mesh, grid(), probe, slices, window, colored, cut);
        sceneMs = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - started).count();
        // [/snippet refresh-context]
#endif
        dirty = false;
    }
};
} // namespace slice53
