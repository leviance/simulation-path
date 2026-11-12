#pragma once
#include "bulb_settings.hpp"
#include <complex>

namespace bulb {

#if LAB_CHECKPOINT >= 6
struct ReferenceOrbit {
    bool escaped{};
    bool invalid{};
    int evaluations{};
};
// Independent oracle: long double + repeated complex multiplication, no acos/atan2/pow mapping.
inline ReferenceOrbit referenceOrbit(Vec3 c, Settings s) {
    long double x = 0, y = 0, z = 0;
    for (int iteration = 0; iteration < s.iterations; ++iteration) {
        const long double radius = std::sqrt(x * x + y * y + z * z);
        if (!std::isfinite(radius))
            return {false, true, iteration + 1};
        if (radius > s.bailout)
            return {true, false, iteration + 1};
        if (radius < 1e-18L) {
            x = c.x;
            y = c.y;
            z = c.z;
            continue;
        }
        const long double rho = std::sqrt(x * x + y * y);
        std::complex<long double> theta{z / radius, rho / radius};
        std::complex<long double> phi{1, 0};
        if (rho > 1e-18L)
            phi = {x / rho, y / rho};
        std::complex<long double> anglePower{1, 0};
        std::complex<long double> azimuthPower{1, 0};
        long double radiusPower = 1;
        for (int factor = 0; factor < s.power; ++factor) {
            radiusPower *= radius;
            anglePower *= theta;
            azimuthPower *= phi;
        }
        x = radiusPower * anglePower.imag() * azimuthPower.real() + c.x;
        y = radiusPower * anglePower.imag() * azimuthPower.imag() + c.y;
        z = radiusPower * anglePower.real() + c.z;
    }
    return {false, false, s.iterations};
}
struct Interval {
    double enter{}, exit{};
    bool intersects{};
};
inline Interval sphereInterval(Vec3 origin, Vec3 direction) {
    const double b = dot(origin, direction);
    const double discriminant = b * b - dot(origin, origin) + 4.0;
    if (discriminant < 0)
        return {};
    const double root = std::sqrt(discriminant);
    const double exit = -b + root;
    if (exit < 0)
        return {};
    return {std::max(0.0, -b - root), exit, true};
}
struct ReferenceRay {
    bool hit{};
    double t{};
    std::uint32_t probes{};
};
inline ReferenceRay referenceRay(Vec3 origin, Vec3 direction, Settings s, double step = 0.001) {
    if (step < 0.00025 || step > 0.01)
        throw std::invalid_argument("Reference step outside finite fixture bounds");
    const auto interval = sphereInterval(origin, direction);
    if (!interval.intersects)
        return {};
    double previous = interval.enter;
    ReferenceRay result;
    for (double t = interval.enter; t <= interval.exit + step * 0.5; t += step) {
        if (++result.probes > 17000)
            throw std::runtime_error("Slow oracle exceeded its probe budget");
        const auto orbit = referenceOrbit(origin + direction * t, s);
        if (orbit.invalid)
            throw std::runtime_error("Reference orbit overflowed");
        if (!orbit.escaped) {
            double low = previous, high = t;
            for (int refinement = 0; refinement < 14; ++refinement) {
                const double middle = (low + high) * 0.5;
                if (referenceOrbit(origin + direction * middle, s).escaped)
                    low = middle;
                else
                    high = middle;
            }
            result.hit = true;
            result.t = (low + high) * 0.5;
            return result;
        }
        previous = t;
    }
    return result;
}
#endif

} // namespace bulb
