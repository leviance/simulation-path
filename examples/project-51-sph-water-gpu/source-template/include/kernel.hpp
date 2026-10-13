#pragma once
#include "model.hpp"

namespace water3 {
// The same polynomial as Project50, but normalization is now per volume.
#if LAB_CHECKPOINT >= 4
inline double kernel(double r, double h) {
    const double q = r / h;
    const double sigma = 1 / (std::numbers::pi * h * h * h);
    if (q >= 2) {
        return 0;
    }
    if (q < 1) {
        return sigma * (1 - 1.5 * q * q + 0.75 * q * q * q);
    }
    return sigma * 0.25 * std::pow(2 - q, 3);
}

inline Vec3 gradient(Vec3 displacement, double h) {
    const double r = length(displacement);
    const double q = r / h;
    if (r == 0 || q >= 2) {
        return {};
    }
    double derivative = -0.75 * std::pow(2 - q, 2);
    if (q < 1) {
        derivative = -3 * q + 2.25 * q * q;
    }
    const double scale = derivative / (std::numbers::pi * h * h * h * h * r);
    return {scale * displacement.x, scale * displacement.y, scale * displacement.z};
}
#endif
#if LAB_CHECKPOINT >= 6
inline double viscosity(Vec3 d, Vec3 v, double rhoA, double rhoB, double h, double c, double alpha) {
    const double approach = dot(d, v);
    if (approach >= 0) {
        return 0;
    }
    const double mu = h * approach / (dot(d, d) + 0.01 * h * h);
    return -alpha * c * mu / (0.5 * (rhoA + rhoB));
}
#endif
} // namespace water3
