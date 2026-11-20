#pragma once
#include "math.hpp"

namespace slice53 {
#if LAB_CHECKPOINT >= 2
// Synthetic agate, in millimetres. The cavity is deliberately off the grid origin.
inline constexpr Vec3 geodeCentre{-16, -9, -14};
inline constexpr Vec3 cavityRadii{31, 34, 39};

struct Crystal {
    Vec3 root, inward, across, up;
    double radius, length;
};

inline const std::array<Crystal, 32>& geodeCrystals() {
    // Fixed orientations: switching from 64³ to 128³ resamples the same rock.
    static const auto crystals = [] {
        std::array<Crystal, 32> result{};
        for (int i = 0; i < static_cast<int>(result.size()); ++i) {
            const double y = 1.0 - (2.0 * i + 1.0) / result.size();
            const double ring = std::sqrt(1.0 - y * y);
            const double angle = 2.399963229728653 * i;
            const Vec3 direction{ring * std::cos(angle), y, ring * std::sin(angle)};
            const Vec3 root = geodeCentre + Vec3{cavityRadii.x * direction.x, cavityRadii.y * y, cavityRadii.z * direction.z};
            const Vec3 inward = unit(geodeCentre - root);
            Vec3 reference{0, 1, 0};
            if (std::abs(inward.y) > 0.92)
                reference = {1, 0, 0};
            const Vec3 across = unit(cross(inward, reference));
            result[i] = {root, inward, across, cross(inward, across), 4.0 + 0.6 * (i % 5), 9.5 + 1.7 * (i % 6)};
        }
        return result;
    }();
    return crystals;
}

inline double crystalDensity(Vec3 point) {
    for (const Crystal& crystal : geodeCrystals()) {
        const Vec3 offset = point - crystal.root;
        const double height = dot(offset, crystal.inward);
        if (height < -8 || height >= crystal.length)
            continue;
        const double a = std::abs(dot(offset, crystal.across));
        const double b = std::abs(dot(offset, crystal.up));
        // A six-sided shaft ending in a pyramid. These faces exist in the voxels.
        const double face = std::max(a, 0.5 * a + 0.866025403784439 * b);
        const double taper = std::min(1.0, (crystal.length - height) / (0.53 * crystal.length));
        if (face < crystal.radius * taper)
            return 0.89 + 0.095 * std::clamp(height / crystal.length, 0.0, 1.0);
    }
    return 0.015;
}

// [snippet agate-field]
inline double geodeField(Vec3 point) {
    // Two different boundaries: the outside of the nodule and the inside of its cavity.
    const double x = point.x, y = point.y, z = point.z;
    const Vec3 shell{(x - 3 + 0.09 * y) / 67, (y - 3 - 0.07 * z) / 78, (z - 5) / 91};
    const double outer = length(shell);
    if (outer > 1.14)
        return 0;
    const double grain = std::sin(0.19 * x + 0.14 * y) * std::sin(0.16 * z - 0.09 * x);
    const double relief = 0.05 * std::sin(0.077 * x + 0.032 * z) * std::cos(0.063 * y) + 0.032 * std::sin(0.062 * z - 0.073 * y) + 0.021 * grain;
    const double skinDepth = (1 + relief - outer) * 68;
    if (skinDepth <= 0)
        return 0;
    if (skinDepth < 5.1 + 1.3 * grain)
        return 0.25 + 0.055 * grain + 0.018 * std::sin(0.37 * z);

    const Vec3 d = point - geodeCentre;
    const Vec3 inner{(d.x + 0.10 * d.y) / cavityRadii.x, d.y / cavityRadii.y, (d.z - 0.08 * d.x) / cavityRadii.z};
    const double ripple = 0.068 * std::sin(d.x * 0.082 + d.z * 0.051) * std::cos(d.y * 0.081);
    const double wallDepth = (length(inner) - 1 - ripple) * 32;
    if (wallDepth < 0)
        return crystalDensity(point);
    if (wallDepth < 2.6)
        return 0.91 + 0.018 * grain;

    // A band is a 3D layer between the two boundaries, not a ring painted onto a slice.
    const double position = wallDepth / (wallDepth + skinDepth);
    const double phase = 6.283185307179586 * (5.2 * position + 0.12 * std::sin(9 * position));
    const double wave = 0.5 + 0.5 * std::cos(phase);
    if (position > 0.74 && position < 0.80)
        return 0.32 + 0.06 * wave;
    return 0.45 + 0.19 * wave + 0.17 * std::pow(wave, 5) + 0.024 * std::sin(phase * 2.7);
}

// [/snippet agate-field]
#endif
} // namespace slice53
