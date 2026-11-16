#pragma once
#include "raster.hpp"
#include "shapes.hpp"

namespace picking {
inline Vec3 sphereVertex(const Sphere& sphere, int latitude, int longitude) {
    constexpr double pi = 3.141592653589793;
    const double phi = -pi / 2 + latitude * pi / 20;
    const double theta = longitude * 2 * pi / 40;
    const Vec3 unit{std::cos(phi) * std::cos(theta), std::sin(phi), std::cos(phi) * std::sin(theta)};
    return add(sphere.center, multiply(unit, sphere.radius));
}

inline void drawSphereMesh(Raster& raster, const Sphere& sphere, Color color) {
    for (int latitude = 0; latitude < 20; ++latitude) {
        for (int longitude = 0; longitude < 40; ++longitude) {
            const Vec3 a = sphereVertex(sphere, latitude, longitude);
            const Vec3 b = sphereVertex(sphere, latitude, longitude + 1);
            const Vec3 c = sphereVertex(sphere, latitude + 1, longitude + 1);
            const Vec3 d = sphereVertex(sphere, latitude + 1, longitude);
            raster.triangle(a, b, c, color);
            raster.triangle(a, c, d, color);
        }
    }
}

inline void drawBoxMesh(Raster& raster, const Box& box, Color color) {
    std::array<Vec3, 8> corners{};
    for (int i = 0; i < 8; ++i) {
        corners[i] = box.minimum;
        if ((i & 1) != 0) {
            corners[i].x = box.maximum.x;
        }
        if ((i & 2) != 0) {
            corners[i].y = box.maximum.y;
        }
        if ((i & 4) != 0) {
            corners[i].z = box.maximum.z;
        }
    }
    const int faces[6][4]{{0, 1, 3, 2}, {4, 6, 7, 5}, {0, 4, 5, 1}, {2, 3, 7, 6}, {0, 2, 6, 4}, {1, 5, 7, 3}};
    for (const auto& face : faces) {
        raster.triangle(corners[face[0]], corners[face[1]], corners[face[2]], color);
        raster.triangle(corners[face[0]], corners[face[2]], corners[face[3]], color);
    }
}
} // namespace picking
