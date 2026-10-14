#pragma once
#include "hit.hpp"

namespace picking {
#if LAB_CHECKPOINT >= 6
// Two-sided Moller-Trumbore. Closed barycentric edges; not a watertight mesh test.
inline std::optional<Hit> intersectTriangle(const Ray& ray, const Triangle& triangle) {
    if (!valid(ray) || !finite(triangle.a) || !finite(triangle.b) || !finite(triangle.c)) {
        return std::nullopt;
    }

    const Vec3 edge1 = subtract(triangle.b, triangle.a);
    const Vec3 edge2 = subtract(triangle.c, triangle.a);
    const Vec3 normal = cross(edge1, edge2);
    const Vec3 p = cross(ray.direction, edge2);
    const double determinant = dot(edge1, p);
    const double scale = length(edge1) * length(edge2) * length(ray.direction);
    if (!std::isfinite(scale) || scale == 0 || length(normal) <= 1e-10 * length(edge1) * length(edge2) || std::abs(determinant) <= 1e-10 * scale) {
        return std::nullopt;
    }

    const Vec3 offset = subtract(ray.origin, triangle.a);
    const double u = dot(offset, p) / determinant;
    const Vec3 q = cross(offset, edge1);
    const double v = dot(ray.direction, q) / determinant;
    const double t = dot(edge2, q) / determinant;
    if (!std::isfinite(u) || !std::isfinite(v) || u < 0 || v < 0 || u + v > 1 || !inRange(ray, t)) {
        return std::nullopt;
    }

    Hit hit = makeHit(ray, t, normalize(normal), 3);
    hit.u = u;
    hit.v = v;
    return hit;
}
#endif
} // namespace picking
