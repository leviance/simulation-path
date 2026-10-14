#pragma once
#include "camera.hpp"
#include "shapes.hpp"
#include <optional>

namespace picking {
#if LAB_CHECKPOINT >= 3
// Keep the geometric normal. frontFace tells which side the ray approached.
struct Hit {
    double t = 0;
    Vec3 point;
    Vec3 normal;
    bool frontFace = false;
    int objectId = -1;
    double u = 0;
    double v = 0;
};

inline Hit makeHit(const Ray& ray, double t, Vec3 normal, int objectId) {
    return {t, at(ray, t), normal, dot(ray.direction, normal) < 0, objectId, 0, 0};
}

inline std::optional<Hit> intersectPlane(const Ray& ray, const Plane& plane) {
    if (!valid(ray) || !finite(plane.point) || !finite(plane.normal) || length(plane.normal) == 0) {
        return std::nullopt;
    }
    const Vec3 normal = normalize(plane.normal);
    const double denominator = dot(ray.direction, normal);
    // Relative angular threshold; a coplanar ray has no unique surface hit.
    if (std::abs(denominator) <= 1e-10 * length(ray.direction)) {
        return std::nullopt;
    }
    const double t = dot(subtract(plane.point, ray.origin), normal) / denominator;
    if (!inRange(ray, t)) {
        return std::nullopt;
    }
    return makeHit(ray, t, normal, 0);
}
#endif
} // namespace picking
