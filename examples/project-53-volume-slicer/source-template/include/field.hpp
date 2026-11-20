#pragma once
#include "geode.hpp"
#include "volume.hpp"
#include <string_view>

namespace slice53 {
enum class Preset { Specimen, Sphere, Gaussian, Layers, Ramp };

inline std::string_view presetName(Preset preset) {
    if (preset == Preset::Sphere) return "SPHERE";
    if (preset == Preset::Gaussian) return "GAUSSIAN";
    if (preset == Preset::Layers) return "LAYERS";
    if (preset == Preset::Ramp) return "XYZ RAMP";
    return "AGATE GEODE";
}

#if LAB_CHECKPOINT >= 1
// [snippet sphere-field]
inline double sphereField(Vec3 point) {
    const double radius = 60.0;
    if (dot(point, point) <= radius * radius) return 1.0;
    return 0.0;
}
// [/snippet sphere-field]
#endif

#if LAB_CHECKPOINT >= 2
// Synthetic scalar values in [0,1]. They are not HU, attenuation or patient data.
inline double fieldValue(Preset preset, Vec3 point) {
    if (preset == Preset::Sphere) return sphereField(point);
    if (preset == Preset::Gaussian) return std::exp(-dot(point, point) / (2.0 * 30.0 * 30.0));
    if (preset == Preset::Layers) {
        if (point.z < -48) return 0.22;
        if (point.z < -12) return 0.48;
        if (point.z < 30) return 0.86;
        if (point.z < 68) return 0.38;
        return 0.64;
    }
    if (preset == Preset::Ramp)
        return 0.1 + 0.2 * (point.x + 80) / 160 + 0.3 * (point.y + 96) / 192 + 0.4 * (point.z + 112) / 224;

    return geodeField(point);
}

// [snippet fill-volume]
inline Volume buildVolume(Preset preset, int side) {
    if (static_cast<int>(preset) < 0 || static_cast<int>(preset) > 4)
        throw std::invalid_argument("Unknown dataset preset");
    Volume volume(makeGrid(side));
    const Grid& grid = volume.grid();
    for (int z = 0; z < grid.size[2]; ++z) {
        for (int y = 0; y < grid.size[1]; ++y) {
            for (int x = 0; x < grid.size[0]; ++x) {
                const Vec3 point = grid.centre(x, y, z);
                volume.set(x, y, z, fieldValue(preset, point));
            }
        }
    }
    return volume;
}
// [/snippet fill-volume]
#endif
} // namespace slice53
