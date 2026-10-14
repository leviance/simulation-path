#pragma once
#include "model.hpp"
#include <vector>

namespace fog {
#if LAB_CHECKPOINT >= 4
// Same phantom and centre convention as Project 53, stored as R32F for texture upload.
struct Volume {
    std::array<int, 3> count{64, 48, 40};
    std::vector<float> density = std::vector<float>(64 * 48 * 40);

    std::size_t index(int x, int y, int z) const {
        return static_cast<std::size_t>(x + count[0] * (y + count[1] * z));
    }
};

inline double gaussian(Point point, Point centre, Point radius) {
    double q = 0;
    for (int axis = 0; axis < 3; ++axis) {
        const double d = (point[axis] - centre[axis]) / radius[axis];
        q += d * d;
    }
    return std::exp(-q);
}

inline void fillVolume(Volume& volume, int preset) {
    for (int z = 0; z < volume.count[2]; ++z) {
        for (int y = 0; y < volume.count[1]; ++y) {
            for (int x = 0; x < volume.count[0]; ++x) {
                const Point point{boxMinimum[0] + (x + 0.5) * 0.05, boxMinimum[1] + (y + 0.5) * 0.08, boxMinimum[2] + (z + 0.5) * 0.12};
                double density = std::clamp(0.04 + 0.6 * gaussian(point, {0, 0, 0}, {0.85, 1.1, 1.3}) + 0.75 * gaussian(point, {-0.55, -0.45, 0.35}, {0.22, 0.3, 0.5}) + 0.8 * gaussian(point, {0.9, 0.85, -0.6}, {0.18, 0.25, 0.22}), 0.0, 1.0);
                if (preset == 1) {
                    density = static_cast<double>(x + 2 * y + 4 * z) / (63 + 2 * 47 + 4 * 39);
                }
                if (preset == 2) {
                    density = 0.25;
                }
                volume.density[volume.index(x, y, z)] = static_cast<float>(density);
            }
        }
    }
}

inline double sampleDensity(const Volume& volume, Point point) {
    std::array<int, 3> low{};
    std::array<int, 3> high{};
    Point fraction{};
    for (int axis = 0; axis < 3; ++axis) {
        const double uv = (point[axis] - boxMinimum[axis]) / (boxMaximum[axis] - boxMinimum[axis]);
        const double g = std::clamp(uv * volume.count[axis] - 0.5, 0.0, static_cast<double>(volume.count[axis] - 1));
        low[axis] = static_cast<int>(std::floor(g));
        high[axis] = std::min(low[axis] + 1, volume.count[axis] - 1);
        fraction[axis] = g - low[axis];
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
                result += weight * volume.density[volume.index(index[0], index[1], index[2])];
            }
        }
    }
    return result;
}
#endif
} // namespace fog
