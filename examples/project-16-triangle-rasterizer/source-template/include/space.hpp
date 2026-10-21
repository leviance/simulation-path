#pragma once
#include "lab.hpp"
#include <array>
#include <optional>

namespace lab {
// Phép chiếu và inverse từ P11; không thay edge/fill bằng API 3D.
struct Vec3 {
    double x{};
    double y{};
    double z{};
};

struct Camera {
    Vec3 position{};
    double fov = 1.0471975511965976;
};

inline bool finite(Vec3 p) {
    return std::isfinite(p.x) && std::isfinite(p.y) && std::isfinite(p.z);
}

inline std::optional<Vec2> projectWorld(Vec3 world, const Camera& camera, int width, int height) {
    if (!finite(world) || !finite(camera.position) || width <= 0 || height <= 0 || !std::isfinite(camera.fov) || camera.fov <= 0.0 || camera.fov >= 3.141592653589793) {
        return std::nullopt;
    }
    const Vec3 view{world.x - camera.position.x, world.y - camera.position.y, world.z - camera.position.z};
    if (!finite(view) || view.z < 0.5 || view.z > 20.0) {
        return std::nullopt;
    }
    const double focal = height * 0.5 / std::tan(camera.fov * 0.5);
    const Vec2 screen{width * 0.5 + focal * view.x / view.z, height * 0.5 - focal * view.y / view.z};
    if (!finite(screen)) {
        return std::nullopt;
    }
    return screen;
}

inline std::optional<Vec3> worldAtScreen(Vec2 screen, double depth, const Camera& camera, int width, int height) {
    if (!finite(screen) || !std::isfinite(depth) || depth < 0.5 || depth > 20.0 || !finite(camera.position) || width <= 0 || height <= 0 || !std::isfinite(camera.fov) || camera.fov <= 0.0 || camera.fov >= 3.141592653589793) {
        return std::nullopt;
    }
    const double focal = height * 0.5 / std::tan(camera.fov * 0.5);
    const Vec3 world{camera.position.x + (screen.x - width * 0.5) * depth / focal, camera.position.y - (screen.y - height * 0.5) * depth / focal, camera.position.z + depth};
    if (!finite(world)) {
        return std::nullopt;
    }
    return world;
}

inline std::optional<Triangle2> projectTriangle(const std::array<Vec3, 3>& vertices, const Camera& camera, int width, int height) {
    const auto a = projectWorld(vertices[0], camera, width, height);
    const auto b = projectWorld(vertices[1], camera, width, height);
    const auto c = projectWorld(vertices[2], camera, width, height);
    if (!a || !b || !c) {
        return std::nullopt;
    }
    return Triangle2{*a, *b, *c};
}
} // namespace lab
