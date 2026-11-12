#pragma once
#include "bulb_settings.hpp"
#include <limits>

namespace bulb {

enum class OrbitState {
    escaped,
    bounded,
    invalid
};
struct Field {
    double distance{};
    double trap{2.0};
    int iterations{};
    OrbitState state{OrbitState::bounded};
};

// The polar axis is Z. At r=0 the powered vector is exactly zero, without angles.
#if LAB_CHECKPOINT >= 1
inline Vec3 sphericalPower(Vec3 z, int power) {
    const double radius = length(z);
    if (radius < 1e-15)
        return {};
    const double theta = std::acos(std::clamp(z.z / radius, -1.0, 1.0));
    double phi = 0.0;
    if (std::hypot(z.x, z.y) > 1e-15)
        phi = std::atan2(z.y, z.x);
    const double radialPower = std::pow(radius, power);
    return {radialPower * std::sin(power * theta) * std::cos(power * phi), radialPower * std::sin(power * theta) * std::sin(power * phi), radialPower * std::cos(power * theta)};
}

inline Field evaluate(Vec3 point, Settings s) {
    Field result;
    if (!finite(point)) {
        result.state = OrbitState::invalid;
        return result;
    }
    Vec3 z{};
    double derivative = 1.0;
    for (int iteration = 0; iteration < s.iterations; ++iteration) {
        ++result.iterations;
        const double radius = length(z);
        if (!std::isfinite(radius) || !std::isfinite(derivative) || derivative <= 0.0) {
            result.state = OrbitState::invalid;
            return result;
        }
        if (radius > s.bailout) {
#if LAB_CHECKPOINT >= 3
            result.distance = 0.5 * std::log(radius) * radius / derivative;
#endif
            result.state = OrbitState::escaped;
#if LAB_CHECKPOINT >= 3
            if (!std::isfinite(result.distance) || result.distance <= 0.0)
                result.state = OrbitState::invalid;
#endif
            return result;
        }
#if LAB_CHECKPOINT >= 3
        derivative = s.power * std::pow(radius, s.power - 1) * derivative + 1.0;
#endif
        z = sphericalPower(z, s.power) + point;
        // Starting z=0 must not force every orbit trap to zero.
        result.trap = std::min(result.trap, length(z));
    }
    // Bounded means only "did not escape within this iteration cap", not a membership proof.
    return result;
}
#endif

} // namespace bulb
