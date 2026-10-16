#pragma once
#include "raster.hpp"
#include <optional>

namespace voxel {
// t là khoảng cách world vì direction đã normalized; một chunk local, không world vô tận.
inline constexpr double tolerance = 1e-9;
using Cell = std::array<int, 3>;

struct Ray {
    Vec3 origin;
    Vec3 direction;
};

inline std::array<double, 3> components(Vec3 p) {
    return {p.x, p.y, p.z};
}

inline Vec3 pointAt(const Ray& ray, double t) {
    return {ray.origin.x + t * ray.direction.x, ray.origin.y + t * ray.direction.y, ray.origin.z + t * ray.direction.z};
}

inline Ray makeRay(Vec3 origin, Vec3 direction) {
    for (double value : components(origin)) {
        if (!std::isfinite(value) || std::abs(value) > 128) {
            throw std::invalid_argument("ray origin must be finite and within local +/-128");
        }
    }
    for (double value : components(direction)) {
        if (!std::isfinite(value)) {
            throw std::invalid_argument("nonfinite direction");
        }
    }
    const double length = std::hypot(direction.x, direction.y, direction.z);
    if (!std::isfinite(length) || length < 1e-12) {
        throw std::invalid_argument("zero direction");
    }
    return {origin, {direction.x / length, direction.y / length, direction.z / length}};
}

#if LAB_CHECKPOINT >= 2
inline Ray cameraRay(const Camera& camera, double screenX, double screenY) {
    if (!std::isfinite(screenX) || !std::isfinite(screenY) || screenX < 0 || screenY < 0 || screenX >= imageWidth || screenY >= imageHeight || !std::isfinite(camera.yaw) || !std::isfinite(camera.pitch) || !std::isfinite(camera.zoom) || camera.zoom < 0.5 || camera.zoom > 1.5 || camera.scale != 6 || camera.center != 8) {
        throw std::invalid_argument("invalid camera or viewport point");
    }
    const double a = camera.yaw;
    const double b = camera.pitch;
    const Vec3 right{std::cos(a), 0, -std::sin(a)};
    const Vec3 up{-std::sin(a) * std::sin(b), std::cos(b), -std::cos(a) * std::sin(b)};
    const Vec3 towardViewer{std::sin(a) * std::cos(b), std::sin(b), std::cos(a) * std::cos(b)};
    const double cx = (screenX - 160) / (camera.scale * camera.zoom);
    const double cy = (120 - screenY) / (camera.scale * camera.zoom);
    const Vec3 origin{8 + right.x * cx + up.x * cy + towardViewer.x * 32, 8 + right.y * cx + up.y * cy + towardViewer.y * 32, 8 + right.z * cx + up.z * cy + towardViewer.z * 32};
    return makeRay(origin, {-towardViewer.x, -towardViewer.y, -towardViewer.z});
}
#endif
} // namespace voxel
