#pragma once
#include "model.hpp"
#include <numbers>

namespace water {
// Cubic spline with support 2h; its normalization is specifically two-dimensional.
#if LAB_CHECKPOINT >= 3
inline double kernel(double r) {
    const double q = std::abs(r) / h;
    const double normalization = 10 / (7 * std::numbers::pi * h * h);
    if (q >= 2) {
        return 0;
    }
    if (q < 1) {
        return normalization * (1 - 1.5 * q * q + 0.75 * q * q * q);
    }
    return normalization * 0.25 * std::pow(2 - q, 3);
}

inline Vec2 gradient(Vec2 displacement) {
    const double r = length(displacement);
    const double q = r / h;
    if (r == 0 || q >= 2) {
        return {0, 0};
    }
    const double normalization = 10 / (7 * std::numbers::pi * h * h);
    double derivative = -0.75 * std::pow(2 - q, 2);
    if (q < 1) {
        derivative = -3 * q + 2.25 * q * q;
    }
    const double scale = normalization * derivative / (h * r);
    return {scale * displacement.x, scale * displacement.y};
}
#endif

#if LAB_CHECKPOINT >= 6
inline double artificialViscosity(Vec2 displacement, Vec2 relativeVelocity, double densityA, double densityB, double soundSpeed, double alpha) {
    const double approach = dot(relativeVelocity, displacement);
    if (approach >= 0) {
        return 0;
    }
    const double mu = h * approach / (dot(displacement, displacement) + 0.01 * h * h);
    return -alpha * soundSpeed * mu / (0.5 * (densityA + densityB));
}
#endif
} // namespace water
