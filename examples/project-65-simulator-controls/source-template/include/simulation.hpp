#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include "workbench/colony.hpp"
#include <cstdint>

namespace lab {
// Widget chỉ đọc và sửa mô hình này; không có bản sao radius riêng cho UI.
struct Model {
    bench::Colony colony;
    double accumulator = 0;
    std::uint64_t ticks = 0;
    bool paused = false;
    std::uint64_t clockRevision = 0;
    int scenePresses = 0;
};

#if LAB_CHECKPOINT >= 1
// [snippet fixed-clock]
inline void stepPhysics(Model& model) {
    model.colony.step();
    ++model.ticks;
}

inline int advance(Model& model, double elapsed) {
    if (model.paused || !std::isfinite(elapsed) || elapsed <= 0)
        return 0;
    model.accumulator += std::min(elapsed, 0.1);
    int count = 0;
    while (model.accumulator + 1e-12 >= fixedDt && count < 6) {
        stepPhysics(model);
        model.accumulator = std::max(0.0, model.accumulator - fixedDt);
        ++count;
    }
    return count;
}
// [/snippet fixed-clock]
#endif

#if LAB_CHECKPOINT >= 3
inline void setPaused(Model& model, bool value) {
    if (model.paused == value)
        return;
    model.paused = value;
    model.accumulator = 0;
    ++model.clockRevision;
}

// [snippet reset-flock]
inline void resetSimulation(Model& model) {
    const bool wasPaused = model.paused;
    const auto revision = model.clockRevision + 1;
    model = Model{};
    model.paused = wasPaused;
    model.clockRevision = revision;
}
// [/snippet reset-flock]
#endif
} // namespace lab
