#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 1
#include <cmath>
#if LAB_CHECKPOINT >= 2
#include <algorithm>
#endif
#if LAB_CHECKPOINT >= 4
#include <span>
#endif
#if LAB_CHECKPOINT >= 5
#include <cstdint>
#endif

namespace lab {

// Vị trí tính bằng pixel logic; hướng không có đơn vị; vận tốc dùng pixel/giây.
struct Vec2 {
    double x{};
    double y{};
};

inline double length(Vec2 vector) {
    return std::hypot(vector.x, vector.y);
}

#if LAB_CHECKPOINT >= 2
inline Vec2 normalize(Vec2 vector) {
    const double magnitude = length(vector);
    if (magnitude == 0.0) {
        return {};
    }
    return {vector.x / magnitude, vector.y / magnitude};
}
#endif

inline Vec2 directionFromKeys(bool left, bool right, bool up, bool down) {
    Vec2 direction{};
    if (left) {
        direction.x -= 1.0;
    }
    if (right) {
        direction.x += 1.0;
    }
    if (up) {
        direction.y -= 1.0;
    }
    if (down) {
        direction.y += 1.0;
    }
#if LAB_CHECKPOINT >= 2
    return normalize(direction);
#else
    return direction;
#endif
}

#if LAB_CHECKPOINT >= 2
inline Vec2 velocityFromDirection(Vec2 direction, double speed) {
    return {direction.x * speed, direction.y * speed};
}

inline void clampPlayer(Vec2& position, int width, int height, int playerSize) {
    const double maximumX = std::max(0, width - playerSize);
    const double maximumY = std::max(0, height - playerSize);
    position.x = std::clamp(position.x, 0.0, maximumX);
    position.y = std::clamp(position.y, 0.0, maximumY);
}

#if LAB_CHECKPOINT <= 3
// Đối chứng cố ý sai: chỉ đúng tốc độ nếu vòng lặp chạy đúng 60 lần/giây.
inline void moveFrameBased(Vec2& position, Vec2 velocity) {
    position.x += velocity.x / 60.0;
    position.y += velocity.y / 60.0;
}
#endif
#endif

#if LAB_CHECKPOINT >= 4
constexpr double kMaximumDeltaTime = 0.05;

inline double sanitizeDeltaTime(double dt) {
    if (!std::isfinite(dt)) {
        return 0.0;
    }
    return std::clamp(dt, 0.0, kMaximumDeltaTime);
}

inline void update(Vec2& position, Vec2 velocity, double dt) {
    const double simulationDt = sanitizeDeltaTime(dt);
    position.x += velocity.x * simulationDt;
    position.y += velocity.y * simulationDt;
}

// Không có mép cửa sổ trong fixture này: test riêng công thức chuyển động.
inline double simulate(std::span<const double> timeSteps, double speed = 180.0) {
    Vec2 position{};
    const Vec2 velocity{speed, 0.0};
    for (double dt : timeSteps) {
        update(position, velocity, dt);
    }
    return position.x;
}
#endif

#if LAB_CHECKPOINT >= 5
// FPS <= 0 nghĩa là uncapped. Chặn trước phép chia và phép trừ unsigned.
inline std::uint64_t remainingFrameNs(int targetFps, std::uint64_t workNs) {
    if (targetFps <= 0) {
        return 0;
    }
    const std::uint64_t targetNs = 1'000'000'000ull / static_cast<std::uint64_t>(targetFps);
    if (workNs >= targetNs) {
        return 0;
    }
    return targetNs - workNs;
}
#endif

} // namespace lab
#endif
