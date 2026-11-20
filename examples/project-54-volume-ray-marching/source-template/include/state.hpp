#pragma once
#include "renderer.hpp"
#include <memory>

namespace volume54 {
struct State {
    Camera camera;
    Settings settings;
    Preset preset = Preset::Cloud;
    int side = 64;
    bool paused = true;
    bool showcase = false;
    bool inspect = false;
    bool dirty = true;
    double selectedU = 0.5;
    double selectedV = 0.5;
    int shown = 0;
    Result trace;
    double traceAspect = 0;
    std::string status = "Static density. Drag to orbit; Shift+click to inspect a ray.";
#if LAB_CHECKPOINT >= 4
    std::unique_ptr<Volume> volume;
    std::array<std::size_t, 32> bins{};
#endif

    State() {
#if LAB_CHECKPOINT < 6
        settings.mode = Mode::Mip;
#endif
#if LAB_CHECKPOINT < 7
        settings.palette = 2;
        settings.lighting = false;
#endif
#if LAB_CHECKPOINT >= 9
        side = 128;
#endif
    }

    void invalidate() {
        dirty = true;
        shown = 0;
    }

#if LAB_CHECKPOINT >= 4
    // [snippet load-dataset]
    void load(Renderer& renderer, Preset nextPreset, int nextSide) {
        auto next = std::make_unique<Volume>(buildVolume(nextPreset, nextSide));
        const auto nextBins = histogram(*next);
        renderer.upload(*next);
        volume = std::move(next);
        bins = nextBins;
        preset = nextPreset;
        side = nextSide;
        paused = true;
        invalidate();
    }

    // [/snippet load-dataset]
#endif

    void reset() {
        State defaults;
        camera = defaults.camera;
        settings = defaults.settings;
        selectedU = 0.5;
        selectedV = 0.5;
        paused = true;
        inspect = false;
        invalidate();
        status = "View and transfer reset. Dataset and resolution retained.";
    }

#if LAB_CHECKPOINT >= 5
    // [snippet inspect-ray]
    void refreshTrace(double aspect) {
        if (!dirty && aspect == traceAspect)
            return;
        const Ray ray = cameraRay(camera, selectedU, selectedV, aspect);
#if LAB_CHECKPOINT >= 8
        const bool record = true;
#else
        const bool record = false;
#endif
        trace = march(ray, *volume, settings, record);
        traceAspect = aspect;
        dirty = false;
        shown = std::min(shown, trace.samples);
    }

    // [/snippet inspect-ray]
#endif
};
} // namespace volume54
