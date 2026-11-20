#pragma once
#include "raster.hpp"

namespace picking {
// All three specimens share one studio light. Printed scales change albedo,
// never the vertex positions used to draw their surfaces.
inline Vec3 keyLight() {
    static const Vec3 direction = normalize({-0.50, 1.0, -0.55});
    return direction;
}

inline Vec3 between(Vec3 a, Vec3 b, double t) {
    return add(a, multiply(subtract(b, a), t));
}

inline Color finish(const Camera& camera, Vec3 point, Vec3 normal, Color pigment) {
    const Vec3 eye = normalize(subtract(camera.origin, point));
    if (dot(normal, eye) < 0) {
        normal = multiply(normal, -1);
    }
    const Vec3 lamp = keyLight();
    const double diffuse = std::max(0.0, dot(normal, lamp));
    const double halfAngle = std::max(0.0, dot(normal, normalize(add(eye, lamp))));
    const double broad = std::pow(halfAngle, 16);
    const double sharp = std::pow(halfAngle, 85);
    const double rim = std::pow(1 - std::clamp(dot(normal, eye), 0.0, 1.0), 3);
    const double light = 0.32 + 0.62 * diffuse + 0.14 * std::max(0.0, normal.y);
    return {pigment.r * light + 75 * broad + 62 * sharp + 27 * rim,
            pigment.g * light + 84 * broad + 63 * sharp + 46 * rim,
            pigment.b * light + 90 * broad + 65 * sharp + 54 * rim};
}

inline void surfaceQuad(Raster& raster, Vec3 a, Vec3 b, Vec3 c, Vec3 d, Color color) {
    raster.triangle(a, b, c, color);
    raster.triangle(a, c, d, color);
}
} // namespace picking
