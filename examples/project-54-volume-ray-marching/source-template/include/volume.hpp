#pragma once
#include "cloud.hpp"
#include "model.hpp"
#include <cstdint>
#include <vector>

namespace volume54 {
#if LAB_CHECKPOINT >= 4
class Volume {
    int side_;
    std::vector<float> values_;

    static std::size_t checkedCount(int side) {
        if (side < 1 || side > 128)
            throw std::invalid_argument("Volume side must be 1..128 before allocation");
        return static_cast<std::size_t>(side) * side * side;
    }

    public:
    explicit Volume(int side)
        : side_(side), values_(checkedCount(side)) {}

    int side() const {
        return side_;
    }

    double spacing() const {
        return 2.0 / side_;
    }

    const std::vector<float>& values() const {
        return values_;
    }

    // [snippet volume-address]
    std::size_t index(int x, int y, int z) const {
        if (x < 0 || y < 0 || z < 0 || x >= side_ || y >= side_ || z >= side_)
            throw std::out_of_range("Voxel outside volume");
        return static_cast<std::size_t>(x) + static_cast<std::size_t>(side_) * (y + side_ * z);
    }

    Vec3 centre(int x, int y, int z) const {
        return {-1 + (x + 0.5) * spacing(), -1 + (y + 0.5) * spacing(), -1 + (z + 0.5) * spacing()};
    }

    // [/snippet volume-address]
    float at(int x, int y, int z) const {
        return values_[index(x, y, z)];
    }

    void set(int x, int y, int z, double density) {
        if (!std::isfinite(density) || density < 0 || density > 1)
            throw std::invalid_argument("Density must be finite and in [0,1]");
        values_[index(x, y, z)] = static_cast<float>(density);
    }
};

inline double gaussian(Vec3 point, Vec3 centre, Vec3 radius) {
    const Vec3 delta{(point.x - centre.x) / radius.x, (point.y - centre.y) / radius.y, (point.z - centre.z) / radius.z};
    return std::exp(-dot(delta, delta));
}

// A static scalar dataset, not a fluid solver or a time animation.
inline double fieldValue(Vec3 point, Preset preset) {
    if (preset == Preset::Empty)
        return 0;
    if (preset == Preset::Constant)
        return 0.25;
    if (preset == Preset::Slab) {
        if (std::abs(point.z) < 0.375)
            return 0.65;
        return 0;
    }
    if (preset == Preset::Cores) {
        const double shell = 0.14 * gaussian(point, {}, {0.75, 0.8, 0.7});
        const double first = 0.9 * gaussian(point, {-0.28, 0.17, 0.1}, {0.18, 0.34, 0.22});
        const double second = 0.8 * gaussian(point, {0.29, -0.22, -0.12}, {0.27, 0.19, 0.32});
        return std::clamp(shell + first + second, 0.0, 1.0);
    }
    return cloudDensity(point);
}

// [snippet build-volume]
inline Volume buildVolume(Preset preset, int side) {
    if (static_cast<int>(preset) < 0 || static_cast<int>(preset) > 5)
        throw std::invalid_argument("Unknown dataset");
    Volume volume(side);
    for (int z = 0; z < side; ++z) {
        for (int y = 0; y < side; ++y) {
            for (int x = 0; x < side; ++x) {
                double density = fieldValue(volume.centre(x, y, z), preset);
                if (preset == Preset::Ramp) {
                    density = 0;
                    if (side > 1)
                        density = static_cast<double>(x + 2 * y + 4 * z) / (7 * (side - 1));
                }
                volume.set(x, y, z, density);
            }
        }
    }
    return volume;
}

// [/snippet build-volume]

inline double sampleDensity(const Volume& volume, Vec3 point) {
    if (!finite(point))
        throw std::invalid_argument("Nonfinite sample position");
    // Same centre/clamp convention as sampler3D with GL_LINEAR + CLAMP_TO_EDGE.
    std::array<int, 3> low{};
    std::array<int, 3> high{};
    Vec3 fraction;
    for (int axis = 0; axis < 3; ++axis) {
        const double q = std::clamp((point[axis] + 1) * 0.5 * volume.side() - 0.5, 0.0, static_cast<double>(volume.side() - 1));
        low[axis] = static_cast<int>(std::floor(q));
        high[axis] = std::min(low[axis] + 1, volume.side() - 1);
        fraction[axis] = q - low[axis];
    }
    double result = 0;
    for (int z = 0; z < 2; ++z) {
        for (int y = 0; y < 2; ++y) {
            for (int x = 0; x < 2; ++x) {
                const std::array<int, 3> corner{x, y, z};
                auto index = low;
                double weight = 1;
                for (int axis = 0; axis < 3; ++axis) {
                    double factor = 1 - fraction[axis];
                    if (corner[axis] == 1) {
                        index[axis] = high[axis];
                        factor = fraction[axis];
                    }
                    weight *= factor;
                }
                result += weight * volume.at(index[0], index[1], index[2]);
            }
        }
    }
    return result;
}

inline std::array<std::size_t, 32> histogram(const Volume& volume) {
    std::array<std::size_t, 32> bins{};
    for (float value : volume.values())
        ++bins[std::min(31, static_cast<int>(value * 32))];
    return bins;
}
#endif
} // namespace volume54
