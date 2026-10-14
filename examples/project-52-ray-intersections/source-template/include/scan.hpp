#pragma once
#include <algorithm>
#include <cmath>

namespace picking {
#if LAB_CHECKPOINT >= 7
// A paused scan preserves its phase. Uptime never determines the next aim point.
struct Scan {
    double phase = 0;

    double advance(double dt) {
        phase += 0.8 * std::clamp(dt, 0.0, 0.1);
        return 0.5 + 0.35 * std::sin(phase);
    }

    void reset() {
        phase = 0;
    }
};
#endif
} // namespace picking
