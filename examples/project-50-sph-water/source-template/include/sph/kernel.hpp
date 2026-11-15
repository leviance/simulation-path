#pragma once
#include "model.hpp"
#include <numbers>

namespace water {
#if LAB_CHECKPOINT >= 3
// [snippet kernel]
inline double kernel(double distance) {
    const double q = std::abs(distance) / h;
    const double normalization = 10 / (7 * std::numbers::pi * h * h);
    if (q >= 2) {
        return 0;
    }
    if (q < 1) {
        return normalization * (1 - 1.5 * q * q + 0.75 * q * q * q);
    }
    const double tail = 2 - q;
    return normalization * 0.25 * tail * tail * tail;
}

inline Vec2 gradient(double dx, double dy) {
    const double distance = std::sqrt(dx * dx + dy * dy);
    const double q = distance / h;
    if (distance == 0 || q >= 2) {
        return {};
    }
    const double normalization = 10 / (7 * std::numbers::pi * h * h);
    double derivative = -0.75 * (2 - q) * (2 - q);
    if (q < 1) {
        derivative = -3 * q + 2.25 * q * q;
    }
    const double factor = normalization * derivative / (h * distance);
    return {factor * dx, factor * dy};
}

// [/snippet kernel]
#endif
#if LAB_CHECKPOINT >= 6
// [snippet viscosity]
inline double artificialViscosity(double dx, double dy, double dvx, double dvy, double densityA, double densityB, const Settings& settings) {
    const double approach = dx * dvx + dy * dvy;
    if (approach >= 0) {
        return 0;
    }
    const double mu = h * approach / (dx * dx + dy * dy + 0.01 * h * h);
    return -settings.alpha * settings.soundSpeed * mu / (0.5 * (densityA + densityB));
}

// [/snippet viscosity]
#endif
} // namespace water
