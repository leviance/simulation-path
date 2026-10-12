#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include <algorithm>
#include <cmath>

namespace heat {
#if LAB_CHECKPOINT >= 6
struct StepPlan {
    int steps = 0;
    double remainder = 0;
    double dropped = 0;
};

inline StepPlan planSteps(double accumulator, double elapsed, double dt) {
    // dt là bước của solver; elapsed chỉ quyết định số bước cần thực hiện.
    if (!std::isfinite(dt) || dt <= 0) {
        return {};
    }
    if (!std::isfinite(accumulator) || accumulator < 0 || accumulator >= dt) {
        accumulator = 0;
    }
    if (!std::isfinite(elapsed) || elapsed < 0) {
        elapsed = 0;
    }
    const double accepted = std::min(elapsed, 0.25);
    const double total = accumulator + accepted;
    const double due = std::floor((total + 1e-10) / dt);
    StepPlan plan;
    plan.steps = static_cast<int>(std::min(due, 8.0));
    plan.remainder = std::max(0.0, total - due * dt);
    plan.dropped = elapsed - accepted + (due - plan.steps) * dt;
    return plan;
}
#endif
} // namespace heat
