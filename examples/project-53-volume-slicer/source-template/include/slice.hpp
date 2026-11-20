#pragma once
#include "field.hpp"
#include "sampling.hpp"
#include <vector>

namespace slice53 {
struct Axes { int horizontal; int vertical; int fixed; };

// [snippet slice-axes]
inline Axes axesFor(int view) {
    if (view < 0 || view > 2) throw std::invalid_argument("View must be XY, XZ or YZ");
#if LAB_CHECKPOINT >= 3
    if (view == 1) return {0, 2, 1};
    if (view == 2) return {1, 2, 0};
#else
    (void)view;
#endif
    return {0, 1, 2};
}

inline Vec3 slicePoint(const Grid& grid, int view, double u, double v, Vec3 probe) {
    const Axes axes = axesFor(view);
    const Vec3 extent = grid.extent();
    Vec3 point = probe;
    point[axes.horizontal] = grid.origin[axes.horizontal] + u * extent[axes.horizontal];
    point[axes.vertical] = grid.origin[axes.vertical] + v * extent[axes.vertical];
    return point;
}
// [/snippet slice-axes]

struct SliceImage {
    int width = 256;
    int height = 256;
    std::vector<float> scalar = std::vector<float>(256 * 256);
};

// Pixel row zero is at the top. World vertical coordinates increase upwards.
#if LAB_CHECKPOINT == 1
inline void renderFirstSlice(SliceImage& image, double z) {
    // [snippet first-image]
    for (int row = 0; row < image.height; ++row) {
        for (int column = 0; column < image.width; ++column) {
            const double u = (column + 0.5) / image.width;
            const double v = 1.0 - (row + 0.5) / image.height;
            const Vec3 point{-80 + 160 * u, -96 + 192 * v, z};
            image.scalar[column + row * image.width] = static_cast<float>(sphereField(point));
        }
    }
    // [/snippet first-image]
}
#endif

#if LAB_CHECKPOINT >= 2
inline void renderSlice(const Volume& volume, SliceImage& image, int view, Vec3 probe, bool linear) {
    // [snippet sample-slice]
    const Grid& grid = volume.grid();
    for (int row = 0; row < image.height; ++row) {
        for (int column = 0; column < image.width; ++column) {
            const double u = (column + 0.5) / image.width;
            const double v = 1.0 - (row + 0.5) / image.height;
            double value = 0;
#if LAB_CHECKPOINT >= 3
            const Vec3 point = slicePoint(grid, view, u, v, probe);
            value = sample(volume, point, linear).value_or(0);
#else
            (void)view;
            (void)linear;
            const int x = std::min(static_cast<int>(u * grid.size[0]), grid.size[0] - 1);
            const int y = std::min(static_cast<int>(v * grid.size[1]), grid.size[1] - 1);
            const int z = std::clamp(static_cast<int>(std::floor(grid.coordinate(probe.z, 2) + 0.5)), 0, grid.size[2] - 1);
            value = volume.at(x, y, z);
#endif
            image.scalar[column + row * image.width] = static_cast<float>(value);
        }
    }
    // [/snippet sample-slice]
}
#endif
} // namespace slice53
