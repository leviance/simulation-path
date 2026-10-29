#pragma once
#include "camera.hpp"
#include "tracing.hpp"

namespace lab {

// Một snapshot duy nhất được gửi cho renderer. Camera độc lập với đồng hồ đèn.
struct RayMarchFrame {
    Camera camera{};
    SceneOptions scene{};
    RayMarchSettings settings{};
    double elapsedSeconds{};
    bool paused{true};
    bool showDebug{false};
    int debugView{};
    double moveSpeed{2.5};
};

inline Vec3 lightPosition(double time) {
    return {-1.2 + 1.8 * std::sin(time * 0.35), 1.7, 1.5 + 0.4 * std::cos(time * 0.35)};
}

} // namespace lab
