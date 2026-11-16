#pragma once
#include "mesh-drawing.hpp"

namespace picking {
inline Color objectColor(int id, int selected) {
    const Color colors[]{{66, 105, 132}, {86, 190, 250}, {244, 177, 76}, {200, 125, 239}};
    Color color = colors[id];
    if (id == selected) {
        color = {std::min(255.0, color.r * 1.12), std::min(255.0, color.g * 1.12), std::min(255.0, color.b * 1.12)};
    }
    return color;
}

#if LAB_CHECKPOINT >= 1
// [snippet draw-scene]
inline void drawScene(Raster& raster, const Scene& scene, int selected, bool debug) {
    // Finite display patch; the plane intersection itself is infinite.
    const Vec3 p = scene.plane.point;
    const Vec3 a = add(p, {-6, 0, -5});
    const Vec3 b = add(p, {6, 0, -5});
    const Vec3 c = add(p, {6, 0, 7});
    const Vec3 d = add(p, {-6, 0, 7});
    raster.triangle(a, b, c, objectColor(0, selected));
    raster.triangle(a, c, d, objectColor(0, selected));
    // Meshes provide presentation only. No intersection routine is used here.
    drawSphereMesh(raster, scene.sphere, objectColor(1, selected));
    drawBoxMesh(raster, scene.box, objectColor(2, selected));
    raster.triangle(scene.triangle.a, scene.triangle.b, scene.triangle.c, objectColor(3, selected));

    if (debug) {
        for (int i = -5; i <= 5; ++i) {
            const double value = static_cast<double>(i);
            raster.line(add(p, {value, 0.002, -5}), add(p, {value, 0.002, 7}), {68, 102, 128});
            raster.line(add(p, {-6, 0.002, value}), add(p, {6, 0.002, value}), {68, 102, 128});
        }
        raster.line({0, 0, 0}, {1, 0, 0}, {248, 100, 103}, true, 1);
        raster.line({0, 0, 0}, {0, 1, 0}, {110, 234, 151}, true, 1);
        raster.line({0, 0, 0}, {0, 0, 1}, {103, 170, 250}, true, 1);
    }
}

// [/snippet draw-scene]
#endif
} // namespace picking
