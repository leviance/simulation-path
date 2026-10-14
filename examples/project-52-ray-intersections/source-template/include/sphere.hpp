#pragma once
#include "hit.hpp"
#include <algorithm>

namespace picking {
#if LAB_CHECKPOINT >= 4
// Solve a*t*t + 2*halfB*t + c = 0 without assuming a unit direction.
inline std::optional<Hit> intersectSphere(const Ray& ray, const Sphere& sphere) {
    if (!valid(ray) || !finite(sphere.center) || !std::isfinite(sphere.radius) || sphere.radius <= 0) {
        return std::nullopt;
    }

    const Vec3 offset = subtract(ray.origin, sphere.center);
    const double a = dot(ray.direction, ray.direction);
    const double halfB = dot(offset, ray.direction);
    const double c = dot(offset, offset) - sphere.radius * sphere.radius;
    const double discriminant = halfB * halfB - a * c;
    if (!std::isfinite(discriminant) || discriminant < 0 || !std::isfinite(a) || a <= 0) {
        return std::nullopt;
    }

    const double root = std::sqrt(discriminant);
    const double q = -halfB - std::copysign(root, halfB);
    double t0 = -halfB / a;
    double t1 = t0;
    // A tangent at t=0 has q=0. Never evaluate c/q in that case.
    if (q != 0) {
        t0 = q / a;
        t1 = c / q;
    }
    if (t0 > t1) {
        std::swap(t0, t1);
    }

    double t = t0;
    if (!inRange(ray, t)) {
        t = t1;
    }
    if (!inRange(ray, t)) {
        return std::nullopt;
    }

    const Vec3 normal = normalize(subtract(at(ray, t), sphere.center));
    return makeHit(ray, t, normal, 1);
}
#endif
} // namespace picking
