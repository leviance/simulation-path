#pragma once
#include "model.hpp"
#include <cstdint>

namespace volume54 {
#if LAB_CHECKPOINT >= 4
// Static, deterministic teaching data. This shapes a cloud; it does not solve fluid motion.
inline double smoothRange(double first, double last, double value) {
    const double t = std::clamp((value - first) / (last - first), 0.0, 1.0);
    return t * t * (3 - 2 * t);
}

inline double cloudHash(int x, int y, int z) {
    std::uint32_t hash = static_cast<std::uint32_t>(x) * 0x8DA6B343u;
    hash ^= static_cast<std::uint32_t>(y) * 0xD8163841u;
    hash ^= static_cast<std::uint32_t>(z) * 0xCB1AB31Fu;
    hash ^= hash >> 13;
    hash *= 0x85EBCA6Bu;
    hash ^= hash >> 16;
    return static_cast<double>(hash & 0x00FFFFFFu) / 16777215.0;
}

inline double cloudNoise(Vec3 point) {
    const int x = static_cast<int>(std::floor(point.x));
    const int y = static_cast<int>(std::floor(point.y));
    const int z = static_cast<int>(std::floor(point.z));
    const Vec3 blend{smoothRange(0, 1, point.x - x), smoothRange(0, 1, point.y - y), smoothRange(0, 1, point.z - z)};
    double result = 0;
    for (int dz = 0; dz < 2; ++dz) {
        for (int dy = 0; dy < 2; ++dy) {
            for (int dx = 0; dx < 2; ++dx) {
                double weight = 1;
                const std::array<int, 3> corner{dx, dy, dz};
                for (int axis = 0; axis < 3; ++axis) {
                    if (corner[axis] == 0)
                        weight *= 1 - blend[axis];
                    else
                        weight *= blend[axis];
                }
                result += weight * cloudHash(x + dx, y + dy, z + dz);
            }
        }
    }
    return result;
}

struct CloudLobe {
    Vec3 centre;
    Vec3 radius;
};

inline double lobeField(Vec3 point, const CloudLobe& lobe) {
    const Vec3 local{
        (point.x - lobe.centre.x) / lobe.radius.x,
        (point.y - lobe.centre.y) / lobe.radius.y,
        (point.z - lobe.centre.z) / lobe.radius.z
    };
    return 1 - dot(local, local);
}

inline double joinBillows(double a, double b) {
    // Round only the seam; do not add densities where two envelopes overlap.
    const double seam = std::max(0.0, 0.22 - std::abs(a - b));
    return std::max(a, b) + seam * seam / 0.88;
}

inline double cloudDensity(Vec3 point) {
    if (point.y < -0.62 || point.y > 0.66 || std::abs(point.z) > 0.69)
        return 0;

    // Two towers at different depths feed an anvil which spreads downwind (+X).
    constexpr std::array<CloudLobe, 14> lobes{{
        {{-0.15, -0.36, 0.02}, {0.73, 0.24, 0.53}}, // low deck
        {{-0.38, -0.22, 0.17}, {0.36, 0.32, 0.40}},
        {{-0.31, 0.03, 0.18}, {0.31, 0.36, 0.38}}, // near tower
        {{-0.24, 0.28, 0.10}, {0.26, 0.30, 0.29}},
        {{-0.43, 0.28, 0.04}, {0.19, 0.25, 0.25}},
        {{0.08, -0.14, -0.29}, {0.38, 0.33, 0.30}}, // far tower
        {{0.19, 0.11, -0.30}, {0.28, 0.33, 0.26}},
        {{0.26, 0.30, -0.32}, {0.20, 0.22, 0.20}},
        {{-0.01, -0.08, 0.34}, {0.24, 0.26, 0.23}}, // near lip of the opening
        {{-0.56, -0.24, -0.06}, {0.30, 0.24, 0.31}},
        {{0.37, -0.34, -0.10}, {0.26, 0.18, 0.32}},
        {{-0.46, 0.14, 0.23}, {0.20, 0.16, 0.21}}, // a billow rises on the near face
        {{-0.19, 0.30, 0.27}, {0.16, 0.17, 0.16}},
        {{0.48, -0.35, 0.00}, {0.21, 0.12, 0.24}}
    }};
    double towers = -2;
    for (const CloudLobe& lobe : lobes)
        towers = joinBillows(towers, lobeField(point, lobe));

    // The cap rises from the near tower and becomes thinner towards the tip.
    const double downwind = smoothRange(-0.35, 0.92, point.x);
    // [snippet join-anvil]
    const double capHeight = 0.42 + 0.13 * downwind;
    const double capThickness = 0.22 - 0.12 * downwind;
    const double anvil = lobeField(point, {{0.13, capHeight, -0.04}, {0.83, capThickness, 0.43}});
    const double envelope = joinBillows(anvil, towers);
    // [/snippet join-anvil]
    if (envelope < -1.12)
        return 0;

    const double coarse = cloudNoise(point * 3.7 + Vec3{7, 11, 3});
    const double medium = cloudNoise(point * 9 + Vec3{19, 5, 13});
    const double fine = cloudNoise(point * 21 + Vec3{2, 17, 23});
    const double texture = 0.49 * coarse + 0.33 * medium + 0.18 * fine;
    double erosion = 1.03 * (coarse - 0.5) + 0.52 * (medium - 0.5) + 0.25 * (fine - 0.5);
    if (downwind > 0 && point.y > 0.32) {
        const double fibres = cloudNoise({3 * point.x + 9, 28 * point.y + 11, 11 * point.z + 8});
        erosion += 0.36 * downwind * smoothRange(0.32, 0.48, point.y) * (fibres - 0.5);
    }
    const double boundary = smoothRange(-0.04, 0.35, envelope + erosion);
    const double flatTop = 1 - smoothRange(0.57, 0.65, point.y + 0.034 * (texture - 0.5));
    const double anvilTip = 1 - smoothRange(0.88, 0.98, point.x);
    const double base = smoothRange(-0.59, -0.43, point.y + 0.08 * (coarse - 0.5));

    // This passage runs across the volume. A front ray can encounter cloud, air, then cloud.
    const double dy = (point.y + 0.075 + 0.32 * point.x + 0.044 * (medium - 0.5)) / 0.17;
    const double dz = (point.z - 0.022 - 0.085 * point.x + 0.045 * (coarse - 0.5)) / 0.19;
    const double passage = smoothRange(0.61, 1.50, dy * dy + dz * dz);
    // A narrower opening between the towers faces the first camera, below the joined cap.
    const double ax = (point.x - 0.365 * point.z - 0.035 + 0.06 * (medium - 0.5)) / 0.12;
    const double ay = (point.y - 0.172 * point.z - 0.18 + 0.04 * (coarse - 0.5)) / 0.125;
    const double arch = smoothRange(0.56, 1.6, ax * ax + ay * ay);
    const double body = 0.29 + 0.59 * smoothRange(0.26, 0.72, texture) + 0.10 * smoothRange(-0.20, 0.50, point.y);
    return std::clamp(boundary * base * flatTop * anvilTip * passage * arch * body, 0.0, 1.0);
}
#endif
} // namespace volume54
