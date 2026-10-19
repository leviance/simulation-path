#pragma once
#include "lab.hpp"

namespace lab {
struct Scene {
#if LAB_CHECKPOINT >= 1
    double angle{};
#endif
#if LAB_CHECKPOINT >= 2
    Scene() : angle(degreesToRadians(35.0)) {}
#endif
#if LAB_CHECKPOINT >= 3
    double angularSpeed = kPi / 2.0;
#endif
#if LAB_CHECKPOINT >= 5
    double elapsedTime{};
    std::size_t nextSampleIndex = 1;
    std::vector<WaveSample> samples;

    // Mọi lần đổi góc bằng tay đều bắt đầu một đoạn lịch sử mới.
    void restartHistory() {
        elapsedTime = 0.0;
        nextSampleIndex = 1;
        samples.clear();
        appendWaveSample(samples, 0.0, angle);
    }
#endif
#if LAB_CHECKPOINT >= 6
    bool dragging{};
    double angularGrabOffset{};
#endif
};

#if LAB_CHECKPOINT >= 1
inline void setManualAngle(Scene& scene, double angle) {
    scene.angle = normalizeAngle(angle);
#if LAB_CHECKPOINT >= 5
    scene.restartHistory();
#endif
}
#endif

#if LAB_CHECKPOINT >= 3
inline void advanceScene(Scene& scene, double deltaTime) {
    if (!std::isfinite(deltaTime) || deltaTime <= 0.0 || deltaTime > 0.1) {
        return;
    }
#if LAB_CHECKPOINT >= 5
    if (scene.samples.empty()) {
        scene.restartHistory();
    }
    const double endTime = scene.elapsedTime + deltaTime;
    // Một frame chậm vẫn tạo đủ mẫu 60 Hz, mỗi mẫu dùng góc tại đúng timestamp.
    double sampleTime = static_cast<double>(scene.nextSampleIndex) * kSampleInterval;
    while (sampleTime <= endTime + 1e-12) {
        const double offset = std::clamp(sampleTime - scene.elapsedTime, 0.0, deltaTime);
        const double sampleAngle = advanceAngle(scene.angle, scene.angularSpeed, offset);
        appendWaveSample(scene.samples, sampleTime, sampleAngle);
        ++scene.nextSampleIndex;
        sampleTime = static_cast<double>(scene.nextSampleIndex) * kSampleInterval;
    }
    scene.elapsedTime = endTime;
#endif
    scene.angle = advanceAngle(scene.angle, scene.angularSpeed, deltaTime);
}
#endif

inline constexpr Vec2 kCenter{275.0, 390.0};
inline constexpr double kRadius = 185.0;

inline Vec2 worldToScreen(Vec2 world) {
    return {kCenter.x + kRadius * world.x, kCenter.y - kRadius * world.y};
}

inline Vec2 screenToDirection(Vec2 screen) {
    return {(screen.x - kCenter.x) / kRadius, (kCenter.y - screen.y) / kRadius};
}

#if LAB_CHECKPOINT >= 6
inline void cancelDrag(Scene& scene) {
    scene.dragging = false;
}

// Không suy hướng ở đúng/gần tâm: trong vùng 8 px, giữ góc cũ.
inline bool moveNeedle(Scene& scene, Vec2 screen) {
    if (!scene.dragging) {
        return false;
    }
    const Vec2 direction = screenToDirection(screen);
    if (!std::isfinite(direction.x) || !std::isfinite(direction.y) || std::hypot(direction.x, direction.y) < 8.0 / kRadius) {
        return false;
    }
    setManualAngle(scene, angleFromDirection(direction) + scene.angularGrabOffset);
    return true;
}

inline bool beginDrag(Scene& scene, Vec2 screen) {
    const Vec2 endpoint = worldToScreen(unitDirection(scene.angle));
    if (!std::isfinite(screen.x) || !std::isfinite(screen.y) || std::hypot(screen.x - endpoint.x, screen.y - endpoint.y) > 18.0) {
        return false;
    }
    // Nắm ở mép chấm không làm kim nhảy góc ngay lúc nhấn.
    scene.angularGrabOffset = scene.angle - angleFromDirection(screenToDirection(screen));
    scene.dragging = true;
    return true;
}
#endif
} // namespace lab
