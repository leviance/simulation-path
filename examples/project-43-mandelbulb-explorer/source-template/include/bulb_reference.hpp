#pragma once
#include "bulb_settings.hpp"
#include <complex>

namespace bulb {

#if LAB_CHECKPOINT >= 6
struct ReferenceOrbit {
    bool escaped{};
    bool invalid{};
    int evaluations{};
    long double distance{};
};

// Independent oracle: long double + repeated complex multiplication, no acos/atan2/pow mapping.
inline ReferenceOrbit referenceOrbit(Vec3 c, Settings s) {
    long double x = 0, y = 0, z = 0;
    long double derivative = 1;
    if (!finite(c))
        return {false, true, 0, 0};
    for (int iteration = 0; iteration < s.iterations; ++iteration) {
        const long double radius = std::sqrt(x * x + y * y + z * z);
        if (!std::isfinite(radius) || !std::isfinite(derivative) || derivative <= 0)
            return {false, true, iteration + 1};
        if (radius > s.bailout) {
            const long double distance = std::log(radius) * radius / (2 * derivative);
            return {true, !std::isfinite(distance) || distance <= 0, iteration + 1, distance};
        }
        if (radius < 1e-18L) {
            x = c.x;
            y = c.y;
            z = c.z;
            derivative = 1;
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
        long double previousPower = 1;
        for (int factor = 0; factor < s.power; ++factor) {
            previousPower = radiusPower;
            radiusPower *= radius;
            anglePower *= theta;
            azimuthPower *= phi;
        }
        derivative = s.power * previousPower * derivative + 1;
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
enum class ReferenceSurface { finiteOrbit,
                              epsilonShell };

inline bool referenceContains(ReferenceOrbit orbit, Settings s, ReferenceSurface surface) {
    if (orbit.invalid)
        throw std::runtime_error("Reference orbit overflowed");
    if (!orbit.escaped)
        return true;
    return surface == ReferenceSurface::epsilonShell && orbit.distance < s.epsilon;
}

inline ReferenceRay referenceRay(Vec3 origin, Vec3 direction, Settings s, double step = 0.001, ReferenceSurface surface = ReferenceSurface::epsilonShell) {
    validate(s);
    if (!finite(origin) || !finite(direction) || std::abs(length(direction) - 1.0) > 0.000001 || !std::isfinite(step))
        throw std::invalid_argument("Reference ray needs finite origin, unit direction and step");
    if (step < 0.00025 || step > 0.01)
        throw std::invalid_argument("Reference step outside finite fixture bounds");
    const auto interval = sphereInterval(origin, direction);
    if (!interval.intersects)
        return {};
    double previous = interval.enter;
    ReferenceRay result;
    const double farT = std::min(interval.exit, s.farBound);
    for (double t = interval.enter; t <= farT; t += step) {
        if (++result.probes > 17000)
            throw std::runtime_error("Slow oracle exceeded its probe budget");
        const auto orbit = referenceOrbit(origin + direction * t, s);
        if (referenceContains(orbit, s, surface)) {
            double low = previous, high = t;
            for (int refinement = 0; refinement < 14; ++refinement) {
                const double middle = (low + high) * 0.5;
                if (referenceContains(referenceOrbit(origin + direction * middle, s), s, surface))
                    high = middle;
                else
                    low = middle;
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
