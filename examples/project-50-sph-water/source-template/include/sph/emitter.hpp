#pragma once
#include "model.hpp"

namespace water {
#if LAB_CHECKPOINT >= 10
// [snippet emit]
inline std::size_t emitBurst(State& state, Vec2 nozzle) {
    if (!std::isfinite(nozzle.x) || !std::isfinite(nozzle.y)) {
        throw std::invalid_argument("Invalid nozzle coordinates");
    }
    std::size_t added = 0;
    for (int k = -3; k <= 3; ++k) {
        const double x = nozzle.x + k * spacing;
        const double y = nozzle.y;
        bool allowed = state.particles.size() < capacity && x >= spacing && x <= width - spacing && y >= spacing && y <= height - spacing;
        if (state.paddle.enabled && std::hypot(x - state.paddle.x, y - state.paddle.y) < state.paddle.radius + spacing) {
            allowed = false;
        }
        for (const auto& p : state.particles) {
            const double dx = p.x - x;
            const double dy = p.y - y;
            if (dx * dx + dy * dy < 0.81 * spacing * spacing) {
                allowed = false;
                break;
            }
        }
        if (allowed) {
            state.particles.push_back({x, y, 0, -1.2});
            ++added;
            ++state.emitted;
        } else {
            ++state.rejected;
        }
    }
    return added;
}

// [/snippet emit]
#endif
} // namespace water
