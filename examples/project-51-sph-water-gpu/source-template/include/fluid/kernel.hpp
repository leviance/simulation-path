#pragma once
#include "fluid/model.hpp"
#include <numbers>

namespace water51 {
// Normalized cubic spline in 3D volume; h and distance are measured in metres.

#if LAB_CHECKPOINT >= 2
// [snippet kernel]
inline double kernel3(double distance, double h) {
    const double q = distance / h;
    if (q >= 2)
        return 0;
    const double normalization = 1 / (std::numbers::pi * h * h * h);
    if (q < 1)
        return normalization * (1 - 1.5 * q * q + 0.75 * q * q * q);
    return normalization * 0.25 * std::pow(2 - q, 3);
}

inline Vec3 kernelGradient(Vec3 displacement, double h) {
    const double distance = length(displacement);
    if (distance < 1e-12 || distance >= 2 * h)
        return {};
    const double q = distance / h;
    double derivative = -0.75 * (2 - q) * (2 - q);
    if (q < 1)
        derivative = -3 * q + 2.25 * q * q;
    const double factor = derivative / (std::numbers::pi * std::pow(h, 4) * distance);
    return scale(displacement, factor);
}

// [/snippet kernel]
#endif
} // namespace water51
