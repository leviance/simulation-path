#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 3
#include "lab.hpp"
#include <algorithm>
#include <cmath>

namespace lab {

// Một phép đo 5 giây độc lập với player và biên cửa sổ.
struct Measurement {
    bool running = false;
    double elapsed = 0.0;
    double distance = 0.0;
    double discarded = 0.0;
    double frames = 0.0;

    void start() {
        running = true;
        elapsed = 0.0;
        distance = 0.0;
        discarded = 0.0;
        frames = 0.0;
    }
};

inline void advanceMeasurement(Measurement& measurement, double rawDt) {
    if (!measurement.running || !std::isfinite(rawDt) || rawDt <= 0.0) {
        return;
    }
    const double usedDt = std::min(rawDt, 5.0 - measurement.elapsed);
    Vec2 displacement{};
#if LAB_CHECKPOINT >= 4
    update(displacement, {180.0, 0.0}, usedDt);
    measurement.discarded += usedDt - sanitizeDeltaTime(usedDt);
#else
    moveFrameBased(displacement, {180.0, 0.0});
    // Chỉ lấy phần khung hình nằm trong cửa sổ đo đúng 5 giây.
    displacement.x *= usedDt / rawDt;
#endif
    measurement.distance += displacement.x;
    measurement.frames += usedDt / rawDt;
    measurement.elapsed += usedDt;
    if (measurement.elapsed >= 5.0 - 1e-9) {
        measurement.elapsed = 5.0;
        measurement.running = false;
    }
}

} // namespace lab
#endif
