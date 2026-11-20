#pragma once
#include "mesh-drawing.hpp"

namespace picking {
// The finite work mat is just a drawing of the infinite horizontal datum.
// Grid spacing is one world unit even when the observer zooms or the plane moves.
inline void drawMat(Raster& raster, const Plane& plane, bool selected) {
    for (int z = -8; z < 5; ++z) {
        for (int x = -5; x < 5; ++x) {
            const double around = std::max(0.0, 1.0 - (x * x + 0.55 * z * z) / 45.0);
            const int alternating = (x + z + 16) % 2;
            Color color{33 + 15 * around + 2 * alternating, 48 + 20 * around, 57 + 22 * around};
            if (selected) {
                color = colorBetween(color, {68, 106, 112}, 0.18);
            }
            const Vec3 a = add(plane.point, {static_cast<double>(x), 0, static_cast<double>(z)});
            surfaceQuad(raster, a, add(a, {1, 0, 0}), add(a, {1, 0, 1}), add(a, {0, 0, 1}), color);
        }
    }
}

inline void drawGraduations(Raster& raster, const Plane& plane, bool debug) {
    const auto point = [&](double x, double z) { return add(plane.point, {x, 0, z}); };
    const Color grid{68, 91, 99};
    for (int x = -5; x <= 5; ++x) {
        raster.line(point(x, -8), point(x, 5), grid);
    }
    for (int z = -8; z <= 5; ++z) {
        raster.line(point(-5, z), point(5, z), grid);
    }
    // Two engraved rulers: a long tick per unit and four short subdivisions.
    const Color brass{180, 151, 99};
    raster.line(point(-4.5, -2.8), point(4.5, -2.8), brass);
    raster.line(point(-3.6, -7.4), point(-3.6, 4.4), brass);
    for (int i = -22; i <= 22; ++i) {
        double end = -2.72;
        if (i % 5 == 0) {
            end = -2.59;
        }
        raster.line(point(i / 5.0, -2.8), point(i / 5.0, end), brass);
    }
    for (int i = -37; i <= 22; ++i) {
        double end = -3.52;
        if (i % 5 == 0) {
            end = -3.39;
        }
        raster.line(point(-3.6, i / 5.0), point(end, i / 5.0), brass);
    }
    if (debug) {
        raster.line({0, 0, 0}, {1, 0, 0}, {237, 125, 121}, true);
        raster.line({0, 0, 0}, {0, 1, 0}, {129, 225, 165}, true);
        raster.line({0, 0, 0}, {0, 0, 1}, {126, 177, 250}, true);
    }
}

inline Vec3 castOnMat(Vec3 point, const Plane& plane) {
    const auto lamp = keyLight();
    const double distance = (point.y - plane.point.y) / lamp.y;
    return {point.x - lamp.x * distance, plane.point.y, point.z - lamp.z * distance};
}

inline double turnOnMat(Vec3 a, Vec3 b, Vec3 c) {
    return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}

inline void shadowFootprint(Raster& raster, std::vector<Vec3> projected) {
    if (projected.size() < 3) {
        return;
    }
    // Trace the convex outline so overlapping faces never darken it twice.
    std::sort(projected.begin(), projected.end(), [](Vec3 a, Vec3 b) {
        if (a.x == b.x) {
            return a.z < b.z;
        }
        return a.x < b.x;
    });
    std::vector<Vec3> hull;
    const auto append = [&](Vec3 point, std::size_t first) {
        while (hull.size() >= first + 2 && turnOnMat(hull[hull.size() - 2], hull.back(), point) <= 0) {
            hull.pop_back();
        }
        hull.push_back(point);
    };
    for (Vec3 point : projected) {
        append(point, 0);
    }
    const std::size_t first = hull.size() - 1;
    for (std::size_t i = projected.size() - 1; i > 0; --i) {
        append(projected[i - 1], first);
    }
    hull.pop_back();
    if (hull.size() < 3) {
        return;
    }
    Vec3 middle{};
    for (Vec3 point : hull) {
        middle = add(middle, point);
    }
    middle = multiply(middle, 1.0 / hull.size());
    const std::array<double, 3> widths{1.12, 1.05, 0.99};
    const std::array<int, 3> strengths{26, 38, 84};
    for (std::size_t layer = 0; layer < widths.size(); ++layer) {
        for (std::size_t i = 0; i < hull.size(); ++i) {
            const Vec3 a = between(middle, hull[i], widths[layer]);
            const Vec3 b = between(middle, hull[(i + 1) % hull.size()], widths[layer]);
            raster.triangle(middle, a, b, {5, 13, 21}, strengths[layer]);
        }
    }
}

inline void shadowEdge(std::vector<Vec3>& outline, const Plane& plane, Vec3 a, Vec3 b) {
    const double ha = a.y - plane.point.y;
    const double hb = b.y - plane.point.y;
    if (ha >= 0) {
        outline.push_back(castOnMat(a, plane));
    }
    if ((ha < 0 && hb > 0) || (hb < 0 && ha > 0)) {
        outline.push_back(castOnMat(between(a, b, ha / (ha - hb)), plane));
    }
}

inline void drawContactShadows(Raster& raster, const Scene& scene) {
    // Use actual silhouettes and the same light as the materials. Edges that
    // cross the measuring plane are clipped; a fully buried object casts no ink.
    std::vector<Vec3> points;
    for (int y = 0; y < 8; ++y) {
        for (int x = 0; x < 20; ++x) {
            const double angle = 2 * opticalPi * x / 20;
            const Vec3 lower = sphereNormal((y / 8.0 - 0.5) * opticalPi, angle);
            const Vec3 upper = sphereNormal(((y + 1) / 8.0 - 0.5) * opticalPi, angle);
            const Vec3 a = add(scene.sphere.center, multiply(lower, scene.sphere.radius));
            const Vec3 b = add(scene.sphere.center, multiply(upper, scene.sphere.radius));
            shadowEdge(points, scene.plane, a, b);
            if (y == 7 && b.y >= scene.plane.point.y) {
                points.push_back(castOnMat(b, scene.plane));
            }
        }
    }
    shadowFootprint(raster, points);
    points.clear();
    const auto corners = boxCorners(scene.box);
    for (int i = 0; i < 8; ++i) {
        for (const int axis : {1, 2, 4}) {
            shadowEdge(points, scene.plane, corners[i], corners[i ^ axis]);
        }
    }
    shadowFootprint(raster, points);
    points.clear();
    shadowEdge(points, scene.plane, scene.triangle.a, scene.triangle.b);
    shadowEdge(points, scene.plane, scene.triangle.b, scene.triangle.c);
    shadowEdge(points, scene.plane, scene.triangle.c, scene.triangle.a);
    shadowFootprint(raster, points);
}
} // namespace picking
