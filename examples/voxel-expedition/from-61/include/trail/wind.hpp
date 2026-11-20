#pragma once
#include "math.hpp"

namespace trail {
#if LAB_CHECKPOINT >= 6102
struct Wind {
    double angle = 0.48;
    double speed = 1.0;
};

// [snippet wind-field]
inline Vec3 windAt(Vec3 root, double seconds, Wind wind) {
    const Vec3 direction{std::cos(wind.angle), 0, std::sin(wind.angle)};
    const double along = dot(root, direction);
    const double gust = 0.62 + 0.26 * std::sin(1.8 * seconds - 0.31 * along) + 0.12 * std::sin(3.0 * seconds - 0.52 * along);
    return direction * (wind.speed * gust);
}
// [/snippet wind-field]

// [snippet sway-root]
inline Vec3 sway(Vec3 rest, Vec3 root, double height, double flexibility, double seconds, Wind wind) {
    const double u = std::clamp((rest.y - root.y) / height, 0.0, 1.0);
    return rest + windAt(root, seconds, wind) * (flexibility * u * u);
}
// [/snippet sway-root]
#endif
} // namespace trail
