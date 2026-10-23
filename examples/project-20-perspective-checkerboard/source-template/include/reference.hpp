#pragma once
#include "scene.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 4
// Reference riêng cho quad phẳng: không dùng barycentric hay reciprocal attributes.
inline std::optional<Vec2> referenceUvFromRay(const Scene& scene, Vec2 pixel, Viewport viewport) {
    const double focalPixels = double(viewport.height) * 0.5 / std::tan(3.141592653589793 / 6.0);
    const Vec3 ray{(pixel.x - viewport.left - viewport.width * 0.5) / focalPixels, (viewport.top + viewport.height * 0.5 - pixel.y) / focalPixels, 1};
    const Vec3 origin = rotateX(rotateY({0, 0, -scene.distance}, -scene.yaw), -scene.pitch);
    const Vec3 direction = rotateX(rotateY(ray, -scene.yaw), -scene.pitch);
    if (std::abs(direction.z) < 1e-12) {
        return std::nullopt;
    }
    const double t = -origin.z / direction.z;
    if (!std::isfinite(t) || t < 1) {
        return std::nullopt;
    }
    const double x = origin.x + direction.x * t;
    const double y = origin.y + direction.y * t;
    const Vec2 uv{(x + 1.6) / 3.2, (1 - y) / 2.0};
    if (!isFinite(uv) || uv.x < -1e-9 || uv.x > 1 + 1e-9 || uv.y < -1e-9 || uv.y > 1 + 1e-9) {
        return std::nullopt;
    }
    return uv;
}

inline double uvDistance(Vec2 a, Vec2 b) {
    return std::hypot(a.x - b.x, a.y - b.y);
}
#endif
} // namespace lab
