#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#include <algorithm>
#include <cmath>
#include <cstdint>

namespace lab {

constexpr double fixedDt = 1.0 / 120.0;
constexpr double ballRadius = 14.0;
constexpr double floorY = 460.0;

// Y tăng xuống dưới; gravity có đơn vị logical pixel / giây bình phương.
struct Model {
    double y = 90.0;
    double velocity = 0.0;
    double gravity = 480.0;
    double accumulator = 0.0;
    std::uint64_t ticks = 0;
    bool paused = true;
#if LAB_CHECKPOINT >= 3
    std::uint64_t clockRevision = 0;
#endif
#if LAB_CHECKPOINT >= 6
    int scenePresses = 0;
#endif
};

#if LAB_CHECKPOINT >= 1
inline void stepPhysics(Model& model) {
    // Semi-implicit Euler: cập nhật vận tốc trước rồi mới cập nhật vị trí.
    model.velocity += model.gravity * fixedDt;
    model.y += model.velocity * fixedDt;
    if (model.y < 48.0) {
        model.y = 48.0;
        model.velocity = std::abs(model.velocity) * 0.72;
    }
    const double bottom = floorY - ballRadius;
    if (model.y > bottom) {
        model.y = bottom;
        model.velocity = -model.velocity * 0.72;
        if (std::abs(model.velocity) < 8.0) {
            model.velocity = 0.0;
        }
    }
    ++model.ticks;
}

inline int advance(Model& model, double elapsed) {
    if (model.paused) {
        model.accumulator = 0.0;
        return 0;
    }
    if (!std::isfinite(elapsed) || elapsed < 0.0) {
        return 0;
    }

    model.accumulator += std::min(elapsed, 0.1);
    int count = 0;
    while (count < 12 && model.accumulator + 1e-12 >= fixedDt) {
        stepPhysics(model);
        model.accumulator = std::max(0.0, model.accumulator - fixedDt);
        ++count;
    }
    return count;
}
#endif

#if LAB_CHECKPOINT >= 3
inline void setPaused(Model& model, bool paused) {
    if (model.paused == paused) {
        return;
    }

    model.paused = paused;
    model.accumulator = 0.0;
    ++model.clockRevision;
}

inline void resetSimulation(Model& model) {
    // Reset cảnh, không tự đổi lựa chọn gravity hoặc trạng thái Pause của người dùng.
    model.y = 90.0;
    model.velocity = 0.0;
    model.accumulator = 0.0;
    model.ticks = 0;
#if LAB_CHECKPOINT >= 6
    model.scenePresses = 0;
#endif
    ++model.clockRevision;
}
#endif

#if LAB_CHECKPOINT >= 4
inline void setGravity(Model& model, double value) {
    if (!std::isfinite(value)) {
        return;
    }

    model.gravity = std::clamp(value, 0.0, 1200.0);
}
#endif

} // namespace lab
