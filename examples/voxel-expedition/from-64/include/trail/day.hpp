#pragma once
#include "math.hpp"

namespace trail {
#if LAB_CHECKPOINT >= 6402
struct Daylight {
    Vec3 direction;
    double daylight, dusk;
};

// [snippet sun-track]
inline Daylight skyAtHour(double hour) {
    const double phase = 2 * pi * (hour - 6) / 24;
    const Vec3 axis = normalized({std::cos(phase), 0.84 * std::sin(phase), 0.54 * std::sin(phase)});
    const double day = smooth(-0.12, 0.30, axis.y);
    const double dusk = (1 - smooth(0, 0.38, std::abs(axis.y))) * day;
    return {axis, day, dusk};
}
// [/snippet sun-track]
#endif
} // namespace trail
