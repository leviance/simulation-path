#pragma once
#include "camera.hpp"
#include "display.hpp"
#include "statistics.hpp"
#include "surface.hpp"
#include <string>

namespace slices {
struct State {
    Grid grid = makeGrid(64);
    Point cursor{0, 0, 0};
    Window windowing{};
    SliceCamera camera{};
    int activeView = 0;
    bool linear = false;
    bool color = false;
    bool cutaway = true;
    bool dark = false;
    bool showHistogram = false;
    bool paused = true;
    bool ready = true;
    int dataRevision = 0;
    std::string audit = "Not checked";
    std::string error;
#if LAB_CHECKPOINT >= 1
    Preset preset = Preset::Phantom;
#endif
#if LAB_CHECKPOINT >= 2
    Volume volume{grid};
#endif
#if LAB_CHECKPOINT >= 3
    Surface mesh;
#endif
#if LAB_CHECKPOINT >= 4
    Statistics statistics{};
#endif

    State() {
#if LAB_CHECKPOINT >= 4
        color = true;
#endif
#if LAB_CHECKPOINT >= 5
        linear = true;
#endif
#if LAB_CHECKPOINT >= 2
        int side = 64;
#if LAB_CHECKPOINT >= 7
        side = 128;
#endif
        ready = loadDataset(Preset::Phantom, side);
#endif
    }

#if LAB_CHECKPOINT >= 2
    // Build a candidate first. A budget/allocation error leaves the previous dataset intact.
    bool loadDataset(Preset nextPreset, int side) {
        try {
            Volume next(makeGrid(side));
            fillVolume(next, nextPreset);
#if LAB_CHECKPOINT >= 3
            Surface nextMesh = extractSurface(next);
#endif
#if LAB_CHECKPOINT >= 4
            Statistics nextStatistics = histogram(next);
#endif
            grid = next.grid;
            volume = std::move(next);
            preset = nextPreset;
#if LAB_CHECKPOINT >= 3
            mesh = std::move(nextMesh);
#endif
#if LAB_CHECKPOINT >= 4
            statistics = nextStatistics;
#endif
            cursor = clampPoint(grid, cursor);
            ++dataRevision;
            paused = true;
            audit = "Not checked";
            error.clear();
            return true;
        } catch (const std::exception& exception) {
            paused = true;
            error = exception.what();
            return false;
        }
    }

    void rebuild() {
        (void)loadDataset(preset, grid.count[0]);
    }

    void setResolution(int side) {
        (void)loadDataset(preset, side);
    }
#endif

    // Reset camera and cut, but keep the selected dataset and resolution.
    void reset() {
        cursor = initialPoint(grid);
        windowing = {};
        camera = {};
        activeView = 0;
        linear = false;
        color = false;
#if LAB_CHECKPOINT >= 4
        color = true;
#endif
#if LAB_CHECKPOINT >= 5
        linear = true;
#endif
        cutaway = true;
        paused = true;
        audit = "Not checked";
        error.clear();
    }
};
} // namespace slices
