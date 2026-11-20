#pragma once
#include "scene-drawing.hpp"

namespace picking {
#if LAB_CHECKPOINT >= 2
inline void drawCollimator(Raster& raster, const Ray& ray) {
    // The lamp is an annotation for O, not a fifth target. Its aperture
    // ends at O; the entire instrument body is BEHIND the ray's origin.
    Camera aim;
    aim.origin = ray.origin;
    aim.target = add(ray.origin, ray.direction);
    const Basis basis = cameraBasis(aim);
    const auto point = [&](double axial, double radius, double angle) {
        const Vec3 radial = add(multiply(basis.right, radius * std::cos(angle)), multiply(basis.up, radius * std::sin(angle)));
        return add(at(ray, axial), radial);
    };
    const std::array<double, 6> axial{-0.59, -0.54, -0.29, -0.24, -0.07, 0};
    const std::array<double, 6> radius{0.14, 0.19, 0.19, 0.14, 0.14, 0.105};
    const std::array<Color, 5> casing{{{93, 112, 122}, {67, 87, 101}, {195, 140, 69}, {74, 97, 106}, {235, 174, 81}}};
    for (int i = 0; i < 14; ++i) {
        const double angle = i * 2 * opticalPi / 14;
        const double next = (i + 1) * 2 * opticalPi / 14;
        for (std::size_t j = 0; j + 1 < axial.size(); ++j) {
            const Vec3 a = point(axial[j], radius[j], angle);
            const Vec3 b = point(axial[j], radius[j], next);
            const Vec3 c = point(axial[j + 1], radius[j + 1], next);
            const Vec3 d = point(axial[j + 1], radius[j + 1], angle);
            const Vec3 normal = normalize(cross(subtract(b, a), subtract(d, a)));
            surfaceQuad(raster, a, b, c, d, finish(raster.camera, a, normal, casing[j]));
        }
        raster.triangle(at(ray, axial.front()), point(axial.front(), radius.front(), angle),
                        point(axial.front(), radius.front(), next), {51, 66, 78});
        raster.triangle(ray.origin, point(0, radius.back(), angle), point(0, radius.back(), next), {149, 229, 218});
    }
}
#endif

#if LAB_CHECKPOINT >= 4
// [snippet solid-chord]
inline void drawSolidPath(Raster& raster, const Ray& ray, double entry, double exit) {
    // Chỉ tô đoạn vừa nằm trong vật, vừa thuộc phạm vi đo. Nếu O ở
    // bên trong, entry âm vẫn đúng nhưng nằm ngoài phần tia được vẽ.
    const double from = std::max(entry, ray.tMin);
    const double until = std::min(exit, ray.tMax);
    if (from > until) {
        return;
    }
    raster.line(at(ray, from), at(ray, until), {255, 182, 94}, true, 1, 0.95);
    if (inRange(ray, entry)) {
        raster.ring(at(ray, entry), {215, 253, 237}, 7);
    }
    if (inRange(ray, exit)) {
        raster.ring(at(ray, exit), {255, 194, 109}, 7, true);
    }
}
// [/snippet solid-chord]
#endif
} // namespace picking
