#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#if LAB_CHECKPOINT >= 6
#include <algorithm>
#include <cmath>

namespace sand {
constexpr double kTickSeconds = 1.0 / 30.0;

struct StepPlan {
    int steps = 0;
    double remainder = 0;
    double dropped = 0;
};

inline StepPlan planSteps(double accumulator, double elapsed) {
    // Dữ liệu thời gian bất thường không được tạo một vòng cập nhật vô hạn.
    if (!std::isfinite(accumulator) || accumulator < 0 || accumulator >= kTickSeconds) {
        accumulator = 0;
    }
    if (!std::isfinite(elapsed) || elapsed < 0) {
        elapsed = 0;
    }
    const double accepted = std::min(elapsed, 0.25);
    const double total = accumulator + accepted;
    const int due = static_cast<int>(std::floor((total + 1e-9) / kTickSeconds));
    StepPlan plan;
    plan.steps = std::min(due, 4);
    // Bỏ luôn các tick quá budget; chỉ giữ phần lẻ chưa đủ một tick.
    plan.remainder = std::max(0.0, total - due * kTickSeconds);
    plan.dropped = elapsed - accepted + (due - plan.steps) * kTickSeconds;
    return plan;
}
} // namespace sand
#endif
