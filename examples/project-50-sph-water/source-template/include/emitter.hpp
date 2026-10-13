#pragma once
#include "model.hpp"

namespace water {
// An accepted particle adds a fixed mass. Rejected emissions do not change the state.
#if LAB_CHECKPOINT >= 8
inline bool pour(State& state, Vec2 nozzle) {
    if (!std::isfinite(nozzle.x) || !std::isfinite(nozzle.y)) {
        return false;
    }
    Vec2 position{std::clamp(nozzle.x, spacing / 2, 1 - spacing / 2), std::clamp(nozzle.y, spacing / 2, 0.8 - spacing / 2)};

    if (state.particles.size() >= capacity) {
        ++state.rejected;
        return false;
    }
    for (const auto& p : state.particles) {
        if (length(subtract(p.position, position)) < spacing * 0.8) {
            ++state.rejected;
            return false;
        }
    }
    state.particles.push_back({position, {0, -0.4}});
    ++state.emitted;
    return true;
}
#endif
} // namespace water
