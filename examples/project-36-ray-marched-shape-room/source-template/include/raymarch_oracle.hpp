#pragma once
#include "vector.hpp"

namespace lab {

// Oracle giải phương trình bậc hai, không gọi lại SDF hay vòng march.
struct SphereIntersection {
    bool valid{};
    bool hit{};
    double distance{};
};

// [snippet:analytic-sphere]
inline SphereIntersection intersectSphere(const Ray& ray, Vec3 center, double radius) {
    SphereIntersection result{};
    if (!validRay(ray) || !finite(center) || !std::isfinite(radius) || radius <= 0.0) {
        return result;
    }
    const Vec3 offset = ray.origin - center;
    const double a = dot(ray.direction, ray.direction);
    const double b = dot(offset, ray.direction);
    const double c = dot(offset, offset) - radius * radius;
    const double discriminant = b * b - a * c;
    if (!std::isfinite(discriminant)) {
        return result;
    }
    result.valid = true;
    if (discriminant < 0.0) {
        return result;
    }
    const double root = std::sqrt(discriminant);
    const double q = -b - std::copysign(root, b);
    double first = -b / a;
    double second = first;
    if (std::abs(q) > 1e-15) {
        first = q / a;
        second = c / q;
    }
    if (first > second) {
        std::swap(first, second);
    }
    if (first < 0.0) {
        first = second;
    }
    if (first >= 0.0 && std::isfinite(first)) {
        result.hit = true;
        result.distance = first;
    }
    return result;
}
// [/snippet:analytic-sphere]

} // namespace lab
