#pragma once

#include "presets.hpp"
#include "rules.hpp"
#include <string>

namespace sand {

struct Workshop {
    Cell material = Cell::Sand;
    int radius = 2;
    int cursorX = 48;
    int cursorY = 10;
    bool drawing = false;
    bool erasing = false;
    bool previousValid = false;
    int previousX = 0;
    int previousY = 0;
    bool paused = true;
    bool singleStep = false;
    bool showcase = false;
    bool plain = false;
    bool dirty = true;
    bool restartClock = true;
    double accumulator = 0;
    double dropped = 0;
    int speedIndex = 2;
    int preset = 0;
    std::uint32_t seed = 46;
    ScanOrder order = ScanOrder::Alternating;
    StepStats stats;
    double updateMs = 0;
    double uploadMs = 0;
    double submitMs = 0;
    std::string message = "Draw / erase; SPACE toggles run, N advances one tick";

    double speed() const {
        constexpr std::array<double, 5> speeds{0.25, 0.5, 1, 2, 4};
        return speeds[static_cast<std::size_t>(speedIndex)];
    }

    void endStroke() {
        drawing = false;
        erasing = false;
        previousValid = false;
    }

    void pause() {
        paused = true;
        singleStep = false;
        accumulator = 0;
        restartClock = true;
        endStroke();
    }
};

inline const char* orderName(ScanOrder order) {
    if (order == ScanOrder::LeftToRight) {
        return "BOTTOM-UP / LEFT";
    }
    if (order == ScanOrder::RightToLeft) {
        return "BOTTOM-UP / RIGHT";
    }
    if (order == ScanOrder::TopDown) {
        return "TOP-DOWN / ALTERNATE";
    }
    return "BOTTOM-UP / ALTERNATE";
}

#if LAB_CHECKPOINT >= 2
inline void stamp(Grid& grid, Workshop& state, int x, int y, bool join) {
    Cell material = state.material;
    if (state.erasing) {
        material = Cell::Empty;
    }
    if (join && state.previousValid) {
        paintStroke(grid, state.previousX, state.previousY, x, y, state.radius, material);
    } else {
        paintDisk(grid, x, y, state.radius, material);
    }
    state.cursorX = x;
    state.cursorY = y;
    state.previousX = x;
    state.previousY = y;
    state.previousValid = true;
    state.dirty = true;
}
#endif

#if LAB_CHECKPOINT >= 1
inline void resetScene(Grid& grid, Workshop& state, bool clear) {
    // Tạo candidate trước; nếu allocation thất bại, hộp cát cũ còn nguyên.
#if LAB_CHECKPOINT >= 7
    int preset = state.preset;
    if (clear) {
        preset = 4;
    }
    Grid candidate = makeWorkshopScene(preset, state.seed);
#else
    Grid candidate = makeScene();
    if (clear) {
        candidate = Grid();
    }
#endif
#if LAB_CHECKPOINT >= 8
    candidate.order = state.order;
#endif
    grid = std::move(candidate);
    state.pause();
    state.singleStep = false;
    state.dropped = 0;
    state.stats = {};
    state.updateMs = 0;
    state.dirty = true;
    state.cursorX = std::clamp(state.cursorX, 0, grid.width - 1);
    state.cursorY = std::clamp(state.cursorY, 0, grid.height - 1);
    state.message = "RESET: same preset / seed, tick zero";
    if (clear) {
        state.message = "CLEARED: reset restores the selected preset";
    }
}

#if LAB_CHECKPOINT >= 8
inline void selectScene(Grid& grid, Workshop& state, int preset, std::uint32_t seed) {
    Grid candidate = makeWorkshopScene(preset, seed);
    candidate.order = state.order;
    grid = std::move(candidate);
    state.preset = preset;
    state.seed = seed;
    state.pause();
    state.singleStep = false;
    state.dropped = 0;
    state.stats = {};
    state.updateMs = 0;
    state.dirty = true;
    state.message = "NEW SCENE: paused, tick zero";
}
#endif
#endif

} // namespace sand
