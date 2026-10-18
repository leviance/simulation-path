#pragma once
#include "lab.hpp"

namespace lab {
// Hệ tọa độ cố định cho bảng logic; phần lề trên dành cho số đo.
constexpr int kOriginX = 550;
constexpr int kOriginY = 420;
constexpr int kPixelsPerUnit = 45;

#if LAB_CHECKPOINT >= 1
inline Vec2 worldToScreen(Vec2 world) {
    return {kOriginX + world.x * kPixelsPerUnit, kOriginY - world.y * kPixelsPerUnit};
}

inline Vec2 screenToWorld(Vec2 screen) {
    return {(screen.x - kOriginX) / kPixelsPerUnit, (kOriginY - screen.y) / kPixelsPerUnit};
}

// Giữ cả A+B, A-B và scalar*A trong vùng nhìn, không chỉ giữ hai endpoint.
inline Vec2 boundedEndpoint(Vec2 point) {
    return {std::clamp(point.x, -4.0, 4.0), std::clamp(point.y, -3.0, 3.0)};
}
#endif
} // namespace lab
