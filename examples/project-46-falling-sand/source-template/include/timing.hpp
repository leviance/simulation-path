#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <algorithm>
#include <cmath>

namespace sand {

constexpr double kTickSeconds = 1.0 / 30.0;

struct StepPlan {
    int steps = 0;
    double remainder = 0;
    double dropped = 0;
};

#if LAB_CHECKPOINT >= 6
inline StepPlan planSteps(double accumulator, double elapsed, double speed = 1.0) {
    if (!std::isfinite(accumulator) || accumulator < 0 || accumulator >= kTickSeconds) {
        accumulator = 0;
    }
    if (!std::isfinite(elapsed) || elapsed < 0) {
        elapsed = 0;
    }
    if (!std::isfinite(speed)) {
        speed = 1.0;
    }
    speed = std::clamp(speed, 0.25, 4.0);
    // Clamp thời gian thực trước khi nhân speed, tránh overflow từ input bất thường.
    const double accepted = std::min(elapsed, 0.25);
    const double total = accumulator + accepted * speed;
    const int due = static_cast<int>(std::floor((total + 1e-9) / kTickSeconds));
    StepPlan plan;
    plan.steps = std::min(due, 4);
    plan.remainder = std::clamp(total - due * kTickSeconds, 0.0, kTickSeconds - 1e-12);
    plan.dropped = (elapsed - accepted) * speed + (due - plan.steps) * kTickSeconds;
    return plan;
}
#endif

} // namespace sand
