#pragma once

#include "geometry_math.hpp"
#include "surface_settings.hpp"

namespace geometry {

struct SurfaceSample {
    Vec3 position;
    Vec3 tangentU;
    Vec3 tangentV;
};

#if LAB_CHECKPOINT >= 1
// Two parameter directions give a point and two tangents on the same curved patch.
inline SurfaceSample samplePatch(double u, double v, double height) {
    constexpr double pi = std::numbers::pi_v<double>;
    const double sinU = std::sin(pi * u);
    const double cosU = std::cos(pi * u);
    const double sinV = std::sin(pi * v);
    const double cosV = std::cos(pi * v);
    return {
        {3.1 * (u - 0.5), height * sinU * cosV, 2.5 * (v - 0.5)},
        {3.1, height * pi * cosU * cosV, 0.0},
        {0.0, -height * pi * sinU * sinV, 2.5},
    };
}
#endif

#if LAB_CHECKPOINT >= 3
// u goes around the ring; v goes around the cross section.
inline SurfaceSample sampleTorus(double u, double v, double majorRadius, double tubeRadius) {
    const double cosU = std::cos(u);
    const double sinU = std::sin(u);
    const double cosV = std::cos(v);
    const double sinV = std::sin(v);
    const double ringRadius = majorRadius + tubeRadius * cosV;
    const double radialDerivative = -tubeRadius * sinV;

    return {
        {ringRadius * cosU, tubeRadius * sinV, ringRadius * sinU},
        {-ringRadius * sinU, 0.0, ringRadius * cosU},
        {radialDerivative * cosU, tubeRadius * cosV, radialDerivative * sinU},
    };
}
#endif

#if LAB_CHECKPOINT >= 4
// v is a signed distance from the centerline, not a second angle.
inline SurfaceSample sampleMobius(double u, double v, double radius, int halfTwists) {
    const double twistRate = 0.5 * halfTwists;
    const double twistAngle = u * twistRate;
    const double cosU = std::cos(u);
    const double sinU = std::sin(u);
    const double cosTwist = std::cos(twistAngle);
    const double sinTwist = std::sin(twistAngle);
    const double ringRadius = radius + v * cosTwist;
    const double radialDerivative = -v * twistRate * sinTwist;

    return {
        {ringRadius * cosU, v * sinTwist, ringRadius * sinU},
        {
            radialDerivative * cosU - ringRadius * sinU,
            v * twistRate * cosTwist,
            radialDerivative * sinU + ringRadius * cosU,
        },
        {cosTwist * cosU, sinTwist, cosTwist * sinU},
    };
}
#endif

// Triangle winding advances in v first, then in u.
inline Vec3 surfaceNormal(const SurfaceSample& sample) {
    return unit(cross(sample.tangentV, sample.tangentU));
}

} // namespace geometry
