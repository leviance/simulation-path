#pragma once
#include "math.hpp"

namespace trail {
struct Camera {
    Vec3 eye{11.4, 10.3, 3.2};
    double yaw = -0.61;
    double pitch = -0.49;
    double verticalFov = 65 * pi / 180;
};

struct Basis {
    Vec3 right, up, forward;
};

inline Basis basis(const Camera& camera) {
    const double sy = std::sin(camera.yaw);
    const double cy = std::cos(camera.yaw);
    const double sp = std::sin(camera.pitch);
    const double cp = std::cos(camera.pitch);
    return {{cy, 0, -sy}, {-sy * sp, cp, -cy * sp}, {sy * cp, sp, cy * cp}};
}

// [snippet camera-space]
inline Vec3 cameraSpace(Vec3 world, Vec3 eye, const Basis& axes) {
    const Vec3 offset = world - eye;
    return {dot(offset, axes.right), dot(offset, axes.up), dot(offset, axes.forward)};
}
// [/snippet camera-space]

// [snippet perspective-scale]
inline double focalLength(int imageHeight, double verticalFov) {
    return 0.5 * imageHeight / std::tan(verticalFov * 0.5);
}
// [/snippet perspective-scale]

#if LAB_CHECKPOINT >= 5805
// [snippet walk-direction]
inline Vec3 walkDirection(double yaw, double forward, double right) {
    const Vec3 along{std::sin(yaw), 0, std::cos(yaw)};
    const Vec3 across{std::cos(yaw), 0, -std::sin(yaw)};
    return normalized(along * forward + across * right);
}
// [/snippet walk-direction]

inline void look(Camera& camera, double dx, double dy) {
    camera.yaw = std::remainder(camera.yaw + dx, 2 * pi);
    camera.pitch = std::clamp(camera.pitch - dy, -1.45, 1.45);
}
#endif
} // namespace trail
