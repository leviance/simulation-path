#pragma once
#include "math.hpp"

namespace trail {
#if LAB_CHECKPOINT >= 6303
struct WaterSurface {
    double height;
    Vec3 normal;
};

// [snippet river-tracer]
inline double flowPhase(double downstream, double seconds, double speed, double wavelength) {
    const double cycles = (downstream - speed * seconds) / wavelength;
    return cycles - std::floor(cycles);
}
// [/snippet river-tracer]

// [snippet ocean-wave]
inline WaterSurface oceanAt(double x, double z, double seconds) {
    const double a = 0.53 * x + 0.23 * z - 1.6 * seconds;
    const double b = -0.21 * x + 0.78 * z - 2.1 * seconds;
    const double height = 0.32 * std::sin(a) + 0.13 * std::sin(b);
    const double dx = 0.32 * 0.53 * std::cos(a) - 0.13 * 0.21 * std::cos(b);
    const double dz = 0.32 * 0.23 * std::cos(a) + 0.13 * 0.78 * std::cos(b);
    return {height, normalized({-dx, 1, -dz})};
}
// [/snippet ocean-wave]
#endif
} // namespace trail
