#pragma once

#include "validation.hpp"
#include "workshop.hpp"

namespace sand {

enum class Action {
    None,
    Sand,
    Wall,
    Water,
    Erase,
    Run,
    Step,
    Speed,
    Reset,
    Clear,
    Preset,
    Seed,
    Order,
    RadiusLess,
    RadiusMore
};

// Chuột và bàn phím gọi chung lệnh thuần; unit test không cần mở SDL window.
inline void applyAction(Action action, Grid& grid, Workshop& state) {
#if LAB_CHECKPOINT >= 2
    if (action == Action::Sand) {
        state.material = Cell::Sand;
    } else if (action == Action::Wall) {
        state.material = Cell::Wall;
    } else if (action == Action::Erase) {
        state.material = Cell::Empty;
    } else if (action == Action::RadiusLess) {
        state.radius = std::max(0, state.radius - 1);
    } else if (action == Action::RadiusMore) {
        state.radius = std::min(24, state.radius + 1);
    } else if (action == Action::Reset || action == Action::Clear) {
        resetScene(grid, state, action == Action::Clear);
    }
#endif
#if LAB_CHECKPOINT >= 3
    if (action == Action::Step) {
        state.pause();
        state.singleStep = true;
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (action == Action::Water) {
        state.material = Cell::Water;
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (action == Action::Run) {
        state.paused = !state.paused;
        state.accumulator = 0;
        state.restartClock = true;
        state.singleStep = false;
        state.message = "Pause does not accumulate a time debt";
    } else if (action == Action::Speed) {
        state.speedIndex = (state.speedIndex + 1) % 5;
        state.accumulator = 0;
        state.restartClock = true;
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (action == Action::Preset) {
        selectScene(grid, state, (state.preset + 1) % 5, state.seed);
    } else if (action == Action::Seed) {
        selectScene(grid, state, state.preset, state.seed + 1U);
        state.message = "SEED CHANGED: only MIXTURE uses seeded placement";
    } else if (action == Action::Order) {
        state.pause();
        const int next = (static_cast<int>(state.order) + 1) % 4;
        state.order = static_cast<ScanOrder>(next);
        grid.order = state.order;
        state.message = "SCAN CHANGED: reset for a controlled comparison";
    }
#endif
    static_cast<void>(action);
    static_cast<void>(grid);
    static_cast<void>(state);
}

} // namespace sand
