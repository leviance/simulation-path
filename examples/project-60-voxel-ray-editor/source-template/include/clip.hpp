#pragma once
#include "ray.hpp"

namespace voxel {
struct Interval {
    double enter;
    double exit;
    Cell normal{};
};

#if LAB_CHECKPOINT >= 3
inline std::optional<Interval> clipBox(const Ray& ray, Vec3 lower, Vec3 upper, double reach) {
    const auto validated = makeRay(ray.origin, ray.direction);
    const auto original = components(ray.direction);
    const auto direction = components(validated.direction);
    for (int axis = 0; axis < 3; ++axis) {
        if (std::abs(original[axis] - direction[axis]) > tolerance) {
            throw std::invalid_argument("picking requires normalized direction");
        }
    }
    if (!std::isfinite(reach) || reach <= 0 || reach > 64) {
        throw std::invalid_argument("reach must be in (0,64]");
    }
    const auto origin = components(ray.origin);
    const auto lo = components(lower);
    const auto hi = components(upper);
    double near = -std::numeric_limits<double>::infinity();
    double far = reach;
    const double infinity = std::numeric_limits<double>::infinity();
    std::array<double, 3> nearTimes{-infinity, -infinity, -infinity};
    for (int axis = 0; axis < 3; ++axis) {
        if (!std::isfinite(lo[axis]) || !std::isfinite(hi[axis]) || lo[axis] >= hi[axis]) {
            throw std::invalid_argument("invalid box");
        }
        if (direction[axis] == 0) {
            // Miền half-open: tia song song nằm đúng mặt max không đi trong ô.
            if (origin[axis] < lo[axis] || origin[axis] >= hi[axis]) {
                return std::nullopt;
            }
            continue;
        }
        double a = (lo[axis] - origin[axis]) / direction[axis];
        double b = (hi[axis] - origin[axis]) / direction[axis];
        if (a > b) {
            std::swap(a, b);
        }
        nearTimes[axis] = a;
        near = std::max(near, a);
        far = std::min(far, b);
    }
    const double enter = std::max(0.0, near);
    if (far - enter <= tolerance) {
        return std::nullopt;
    }
    Cell normal{};
    // So mọi mặt với near cuối cùng, tránh cộng dồn sai số tie qua ba trục.
    if (near >= 0) {
        for (int axis = 0; axis < 3; ++axis) {
            if (near - nearTimes[axis] <= tolerance) {
                normal[axis] = -1;
                if (direction[axis] < 0) {
                    normal[axis] = 1;
                }
                break;
            }
        }
    }
    return Interval{enter, far, normal};
}
#endif
} // namespace voxel
