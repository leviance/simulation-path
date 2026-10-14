#pragma once
#include "vector.hpp"
#include <optional>

namespace picking {
// Both projection and picking use this same camera basis and vertical FOV.
struct Camera {
    Vec3 origin{0, 1.5, -7};
    Vec3 target{0, 0.3, 0};
    double tanHalfFov = std::tan(55 * 3.141592653589793 / 360);
};

struct Basis {
    Vec3 forward;
    Vec3 right;
    Vec3 up;
};

inline Basis cameraBasis(const Camera& camera) {
    const Vec3 forward = normalize(subtract(camera.target, camera.origin));
    const Vec3 right = normalize(cross({0, 1, 0}, forward));
    return {forward, right, cross(forward, right)};
}

struct Pixel {
    double x;
    double y;
};

#if LAB_CHECKPOINT >= 1
inline std::optional<Pixel> project(Vec3 point, const Camera& camera, double width, double height) {
    const Basis basis = cameraBasis(camera);
    const Vec3 relative = subtract(point, camera.origin);
    const double depth = dot(relative, basis.forward);
    if (depth <= 0.05 || width <= 0 || height <= 0) {
        return std::nullopt;
    }
    const double scale = height / (2 * camera.tanHalfFov * depth);
    return Pixel{width / 2 + scale * dot(relative, basis.right), height / 2 - scale * dot(relative, basis.up)};
}
#endif

#if LAB_CHECKPOINT >= 2
struct Ray {
    Vec3 origin;
    Vec3 direction;
    double tMin = 1e-6;
    double tMax = 30;
};

inline Vec3 at(const Ray& ray, double t) {
    return add(ray.origin, multiply(ray.direction, t));
}

inline Ray cameraRay(const Camera& camera, double u, double v, double aspect, double tMax = 30) {
    const Basis basis = cameraBasis(camera);
    const double screenX = (2 * u - 1) * aspect * camera.tanHalfFov;
    const double screenY = (1 - 2 * v) * camera.tanHalfFov;
    const Vec3 offset = add(multiply(basis.right, screenX), multiply(basis.up, screenY));
    const Vec3 direction = normalize(add(basis.forward, offset));
    return {camera.origin, direction, 1e-6, tMax};
}

inline bool valid(const Ray& ray) {
    return finite(ray.origin) && finite(ray.direction) && length(ray.direction) > 0 && std::isfinite(ray.tMin) && std::isfinite(ray.tMax) && ray.tMin >= 0 && ray.tMax >= ray.tMin;
}

inline bool inRange(const Ray& ray, double t) {
    return std::isfinite(t) && t >= ray.tMin && t <= ray.tMax;
}
#endif
} // namespace picking
