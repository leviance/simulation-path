#pragma once
#include "rectangles.hpp"
#include <algorithm>
#if LAB_CHECKPOINT >= 7
namespace voxel {
struct Stepper {
    int count = 0;
    bool paused = true;
    double elapsed = 0;
};

inline void next(Stepper& stepper, int total) {
    stepper.count = std::min(stepper.count + 1, total);
    if (stepper.count == total) {
        stepper.paused = true;
    }
}

inline void tick(Stepper& stepper, double dt, int total) {
    // Một tick chỉ tiến tối đa một rectangle, không bù thời gian bằng while.
    if (stepper.paused) {
        return;
    }
    stepper.elapsed += std::clamp(dt, 0.0, 0.1);
    if (stepper.elapsed >= 0.15) {
        stepper.elapsed = 0;
        next(stepper, total);
    }
}
} // namespace voxel
#endif
