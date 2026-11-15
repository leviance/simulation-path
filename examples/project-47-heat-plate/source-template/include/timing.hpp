#pragma once

#include <algorithm>
#include <cmath>

namespace heat {

// dropped tính bằng giây mô hình đã nhân speed, không để thành nợ bù bước.
struct StepPlan {
    int steps = 0;
    double remainder = 0;
    double dropped = 0;
};

// [snippet step-plan]
inline StepPlan planSteps(double accumulator, double elapsed, double dt, double speed = 1) {
    StepPlan plan;
    if (!std::isfinite(dt) || dt <= 0 || !std::isfinite(elapsed) || elapsed < 0 || !std::isfinite(speed) || speed <= 0) {
        return plan;
    }
    speed = std::clamp(speed, 0.25, 4.0);
    if (!std::isfinite(elapsed * speed)) {
        return plan;
    }
    if (!std::isfinite(accumulator) || accumulator < 0 || accumulator >= dt) {
        accumulator = 0;
    }
    const double accepted = std::min(elapsed, 0.25);
    const double total = accumulator + accepted * speed;
    if (!std::isfinite(total)) {
        return plan;
    }
    const double ratio = total / dt;
    if (!std::isfinite(ratio)) {
        // dt cực nhỏ không được làm phép đếm tick overflow hoặc tạo vòng bù vô hạn.
        plan.steps = 8;
        plan.remainder = std::fmod(total, dt);
        plan.dropped = (elapsed - accepted) * speed + total - plan.steps * dt - plan.remainder;
        return plan;
    }
    const double due = std::floor(ratio + 1e-9);
    plan.steps = static_cast<int>(std::min(due, 8.0));
    plan.remainder = std::clamp(total - due * dt, 0.0, std::nextafter(dt, 0.0));
    plan.dropped = (elapsed - accepted) * speed + (due - plan.steps) * dt;
    return plan;
}

// [/snippet step-plan]

} // namespace heat
