#pragma once
#include "camera-volume.hpp"
#include <optional>

namespace voxel {
using Vector = std::array<double, 3>;
constexpr double epsilon = 1e-9;

struct Ray {
    Vector origin;
    Vector direction;
};

struct Span {
    double enter;
    double exit;
    Cell normal;
};

struct Hit {
    Cell cell;
    Cell normal;
    double distance;
};

struct Trace {
    std::optional<Hit> hit;
    bool blocked = false;
    std::vector<Cell> path;
};

#if LAB_CHECKPOINT >= 2
// Ray nằm trong world; offset player bù đúng phép dịch dùng khi vẽ mesh.
inline Ray makeRay(Vector origin, Vector direction) {
    double lengthSquared = 0;
    for (int i = 0; i < 3; ++i) {
        if (!std::isfinite(origin[i]) || std::abs(origin[i]) > 4096 || !std::isfinite(direction[i])) {
            throw std::out_of_range("finite ray, origin +/-4096");
        }
        lengthSquared += direction[i] * direction[i];
    }
    const double length = std::sqrt(lengthSquared);
    if (!std::isfinite(length) || length < 1e-12) {
        throw std::out_of_range("zero direction");
    }
    for (double& value : direction) {
        value /= length;
    }
    return {origin, direction};
}

inline Ray cameraRay(const Camera& camera, Player player, int x, int y, double nearDepth = minimumNearDepth) {
    if (x < 0 || x >= 320 || y < 0 || y >= 240 || camera.scale != 2 || camera.center != 8 || camera.zoom < 0.5 || camera.zoom > 1.5 || !std::isfinite(camera.zoom) || !std::isfinite(camera.yaw) || !std::isfinite(camera.pitch) || !std::isfinite(nearDepth) || nearDepth < minimumNearDepth || nearDepth > 3072) {
        throw std::out_of_range("sandbox camera/pixel");
    }
    const double a = camera.yaw;
    const double b = camera.pitch;
    const Vector right{std::cos(a), 0, -std::sin(a)};
    const Vector up{-std::sin(a) * std::sin(b), std::cos(b), -std::cos(a) * std::sin(b)};
    const Vector normal{std::sin(a) * std::cos(b), std::sin(b), std::cos(a) * std::cos(b)};
    const Vector center{player.x, 8, player.z};
    const double u = (x + 0.5 - 160) / (camera.scale * camera.zoom);
    const double v = (120 - y - 0.5) / (camera.scale * camera.zoom);
    Vector origin{};
    Vector direction{};
    for (int i = 0; i < 3; ++i) {
        origin[i] = center[i] + right[i] * u + up[i] * v + normal[i] * nearDepth;
        direction[i] = -normal[i];
    }
    return makeRay(origin, direction);
}

inline std::optional<Span> clipBox(const Ray& ray, Vector lo, Vector hi, double reach) {
    double enter = -INFINITY;
    double exit = reach;
    Vector times{-INFINITY, -INFINITY, -INFINITY};
    for (int i = 0; i < 3; ++i) {
        const double d = ray.direction[i];
        const double o = ray.origin[i];
        if (d == 0) {
            if (o < lo[i] || o >= hi[i]) {
                return std::nullopt;
            }
            continue;
        }
        double a = (lo[i] - o) / d;
        double b = (hi[i] - o) / d;
        if (a > b) {
            std::swap(a, b);
        }
        times[i] = a;
        enter = std::max(enter, a);
        exit = std::min(exit, b);
    }
    const double start = std::max(0.0, enter);
    if (exit - start <= epsilon) {
        return std::nullopt;
    }
    Cell normal{};
    if (enter >= 0) {
        for (int i = 0; i < 3; ++i) {
            if (enter - times[i] <= epsilon) {
                normal[i] = -1;
                if (ray.direction[i] < 0) {
                    normal[i] = 1;
                }
                break;
            }
        }
    }
    return Span{start, exit, normal};
}
#endif
} // namespace voxel
