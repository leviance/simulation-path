#pragma once
#include "geometry.hpp"
#include <cstdint>

namespace lab {
// Nền vật lý của Project 65 được giữ độc lập với cấu trúc cây UI.
inline constexpr double fixedDt = 1.0 / 120.0;

struct Model {
    double y = 90;
    double velocity = 0;
    double gravity = 480;
    double accumulator = 0;
    std::uint64_t ticks = 0;
    std::uint64_t clockRevision = 0;
    int scenePresses = 0;
    bool paused = true;
};

inline void stepPhysics(Model& model) {
    model.velocity += model.gravity * fixedDt;
    model.y += model.velocity * fixedDt;
    if (model.y < 48) {
        model.y = 48;
        model.velocity = std::abs(model.velocity) * 0.72;
    }
    if (model.y > 446) {
        model.y = 446;
        model.velocity = -model.velocity * 0.72;
        if (std::abs(model.velocity) < 8)
            model.velocity = 0;
    }
    ++model.ticks;
}

inline void setPaused(Model& model, bool paused) {
    if (model.paused == paused)
        return;
    model.paused = paused;
    model.accumulator = 0;
    ++model.clockRevision;
}

inline void resetSimulation(Model& model) {
    model.y = 90;
    model.velocity = 0;
    model.accumulator = 0;
    model.ticks = 0;
    model.scenePresses = 0;
    ++model.clockRevision;
}

inline int advance(Model& model, double elapsed) {
    if (model.paused) {
        model.accumulator = 0;
        return 0;
    }
    if (!std::isfinite(elapsed) || elapsed < 0)
        return 0;
    model.accumulator += std::min(elapsed, 0.1);
    int steps = 0;
    while (steps < 12 && model.accumulator + 1e-12 >= fixedDt) {
        stepPhysics(model);
        model.accumulator = std::max(0.0, model.accumulator - fixedDt);
        ++steps;
    }
    return steps;
}

inline void setGravity(Model& model, double value) {
    if (std::isfinite(value))
        model.gravity = std::clamp(value, 0.0, 1200.0);
}
} // namespace lab
