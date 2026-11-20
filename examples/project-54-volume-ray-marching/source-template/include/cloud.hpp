#pragma once
#include "model.hpp"
#include <cstdint>

namespace volume54 {
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

inline double cloudDensity(Vec3 point) {
    struct Lobe {
        Vec3 centre;
        Vec3 radius;
    };
    // Broad base, rising billows and a rear layer make the shape readable from different views.
    constexpr std::array<Lobe, 8> lobes{{
        {{-0.33, 0.02, 0.02}, {0.43, 0.37, 0.44}},
        {{0.08, 0.02, -0.06}, {0.44, 0.40, 0.45}},
        {{0.47, -0.04, 0.04}, {0.36, 0.29, 0.37}},
        {{-0.23, 0.28, 0.0}, {0.30, 0.36, 0.33}},
        {{0.12, 0.39, -0.06}, {0.31, 0.34, 0.35}},
        {{0.32, 0.18, -0.26}, {0.28, 0.30, 0.32}},
        {{-0.61, -0.05, 0.03}, {0.27, 0.24, 0.28}},
        {{0.0, -0.18, 0.26}, {0.50, 0.25, 0.29}}
    }};
    double shape = -1;
    for (const Lobe& lobe : lobes) {
        const Vec3 local{(point.x - lobe.centre.x) / lobe.radius.x, (point.y - lobe.centre.y) / lobe.radius.y, (point.z - lobe.centre.z) / lobe.radius.z};
        const double lobeShape = 1 - dot(local, local);
        const double blend = std::clamp(0.5 + 0.5 * (shape - lobeShape) / 0.18, 0.0, 1.0);
        shape = shape * blend + lobeShape * (1 - blend) + 0.18 * blend * (1 - blend);
    }
    if (shape < -0.15)
        return 0;
    const double coarse = cloudNoise(point * 3.5 + Vec3{7, 11, 3});
    const double medium = cloudNoise(point * 7 + Vec3{19, 5, 13});
    const double fine = cloudNoise(point * 14 + Vec3{2, 17, 23});
    const double noise = 0.57 * coarse + 0.29 * medium + 0.14 * fine;
    const double boundary = smoothRange(0.02, 0.40, shape + 0.24 * (noise - 0.5));
    const double base = smoothRange(-0.48, -0.33, point.y);
    const double core = std::exp(-dot(point - Vec3{-0.20, 0.25, 0.0}, point - Vec3{-0.20, 0.25, 0.0}) / 0.14);
    double density = boundary * base * (0.45 + 0.55 * noise) * (0.65 + 0.35 * core);

    // A deliberate low-density channel is visible from the initial camera, not a mesh cutout.
    const Vec3 channelAxis = unit({0.3385, 0.1593, 0.9274});
    const Vec3 relative = point - Vec3{0.32, -0.20, 0.07};
    Vec3 radial = relative - channelAxis * dot(relative, channelAxis);
    radial.x += 0.065 * (medium - 0.5);
    radial.y += 0.045 * (coarse - 0.5);
    const double radiusSquared = (radial.x * radial.x + radial.z * radial.z) / (0.18 * 0.18) + radial.y * radial.y / (0.13 * 0.13);
    density *= smoothRange(0.40, 2.10, radiusSquared);
    return std::clamp(density, 0.0, 1.0);
}
} // namespace volume54
