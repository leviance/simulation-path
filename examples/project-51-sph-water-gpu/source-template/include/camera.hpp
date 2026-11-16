#pragma once
#include "model.hpp"

namespace water3 {
// Camera chỉ đổi góc nhìn; không xoay dữ liệu trong buffer physics.
// [snippet camera-state]
struct Camera {
    float yaw = 0.65F;
    float pitch = 0.45F;
    float zoom = 1;
};

// [/snippet camera-state]

inline constexpr double focalLength = 2.1445069205095586; // FOV dọc 50 độ.
inline constexpr double nearPlane = 0.02;
inline constexpr double farPlane = 12;

// Cùng phép đổi world -> eye với camera.glsl; camera nhìn về -Z.
// [snippet camera-point]
inline Vec3 cameraPoint(Vec3 position, const Camera& camera) {
    const auto p = subtract(position, {0.5, 0.4, 0.5});
    const double x = std::cos(camera.yaw) * p.x + std::sin(camera.yaw) * p.z;
    const double depth = -std::sin(camera.yaw) * p.x + std::cos(camera.yaw) * p.z;
    const double y = std::cos(camera.pitch) * p.y - std::sin(camera.pitch) * depth;
    const double z = std::sin(camera.pitch) * p.y + std::cos(camera.pitch) * depth;
    return {x, y, z - 1.75 / camera.zoom};
}

// [/snippet camera-point]
} // namespace water3
