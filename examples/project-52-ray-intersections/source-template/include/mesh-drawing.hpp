#pragma once
#include "optical-material.hpp"
#include "shapes.hpp"

namespace picking {
constexpr double opticalPi = 3.141592653589793;
constexpr int latitudeCount = 24;
constexpr int longitudeCount = 56;

inline Vec3 sphereNormal(double latitude, double longitude) {
    return {std::cos(latitude) * std::cos(longitude), std::sin(latitude), std::cos(latitude) * std::sin(longitude)};
}

inline void drawSphereMesh(Raster& raster, const Sphere& sphere, Color color) {
    // Reuse the unit sphere directions. Only camera lighting and the current
    // radius/center need recomputing; there is still no picking code here.
    using Normals = std::array<std::array<Vec3, longitudeCount + 1>, latitudeCount + 1>;
    static const Normals directions = [] {
        Normals table{};
        for (int y = 0; y <= latitudeCount; ++y) {
            for (int x = 0; x <= longitudeCount; ++x) {
                table[y][x] = sphereNormal((static_cast<double>(y) / latitudeCount - 0.5) * opticalPi,
                                           x * 2 * opticalPi / longitudeCount);
            }
        }
        return table;
    }();
    std::array<PaintVertex, longitudeCount + 1> previous{};
    for (int y = 0; y <= latitudeCount; ++y) {
        std::array<PaintVertex, longitudeCount + 1> current{};
        for (int x = 0; x <= longitudeCount; ++x) {
            const Vec3 normal = directions[y][x];
            const Vec3 point = add(sphere.center, multiply(normal, sphere.radius));
            current[x] = {point, finish(raster.camera, point, normal, color)};
        }
        if (y > 0) {
            for (int x = 0; x < longitudeCount; ++x) {
                raster.paint(previous[x], previous[x + 1], current[x + 1], 255, true);
                raster.paint(previous[x], current[x + 1], current[x], 255, true);
            }
        }
        previous = current;
    }

    // A thin equator and short graduation marks are printed on the sphere;
    // they neither enlarge its silhouette nor add an invisible second shell.
    const auto skin = [&](double angle, double longitude) {
        return add(sphere.center, multiply(sphereNormal(angle, longitude), sphere.radius));
    };
    for (int x = 0; x < longitudeCount; ++x) {
        const double longitude = x * 2 * opticalPi / longitudeCount;
        const double next = (x + 1) * 2 * opticalPi / longitudeCount;
        raster.line(skin(0, longitude), skin(0, next), {113, 194, 188});
        if (x % 2 == 0) {
            double extent = 0.072;
            if (x % 7 == 0) {
                extent = 0.14;
            }
            raster.line(skin(0, longitude), skin(extent, longitude), {167, 218, 205});
        }
    }
}

inline std::array<Vec3, 8> boxCorners(const Box& box) {
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
    return corners;
}

inline void drawBoxMesh(Raster& raster, const Box& box, Color color) {
    const auto corners = boxCorners(box);
    constexpr int faces[6][4]{{0, 1, 3, 2}, {4, 6, 7, 5}, {0, 4, 5, 1}, {2, 3, 7, 6}, {0, 2, 6, 4}, {1, 5, 7, 3}};
    for (const auto& face : faces) {
        const Vec3 a = corners[face[0]];
        const Vec3 b = corners[face[1]];
        const Vec3 c = corners[face[2]];
        const Vec3 d = corners[face[3]];
        const Vec3 normal = normalize(cross(subtract(b, a), subtract(d, a)));
        const PaintVertex p{a, finish(raster.camera, a, normal, color)};
        const PaintVertex q{b, finish(raster.camera, b, normal, color)};
        const PaintVertex r{c, finish(raster.camera, c, normal, color)};
        const PaintVertex s{d, finish(raster.camera, d, normal, color)};
        raster.paint(p, q, r, 255, true);
        raster.paint(p, r, s, 255, true);
    }
    for (const auto& face : faces) {
        const Vec3 a = corners[face[0]];
        const Vec3 u = subtract(corners[face[1]], a);
        const Vec3 v = subtract(corners[face[3]], a);
        const auto point = [&](double x, double y) {
            return add(a, add(multiply(u, x), multiply(v, y)));
        };
        // An engraved caliper scale on each true slab; the bevel-like hairline
        // is ink inside the face, not a bevel added to the axis-aligned box.
        const Color ink{104, 68, 42};
        raster.line(point(0.07, 0.12), point(0.93, 0.12), ink);
        raster.line(point(0.04, 0.97), point(0.96, 0.97), {238, 197, 133});
        const Color gauge{227, 178, 116};
        raster.line(point(0.35, 0.55), point(0.46, 0.55), gauge);
        raster.line(point(0.54, 0.55), point(0.65, 0.55), gauge);
        raster.line(point(0.50, 0.39), point(0.50, 0.50), gauge);
        raster.line(point(0.50, 0.60), point(0.50, 0.71), gauge);
        for (int mark = 0; mark <= 8; ++mark) {
            const double x = 0.10 + mark * 0.10;
            double tick = 0.17;
            if (mark % 4 == 0) {
                tick = 0.22;
            }
            raster.line(point(x, 0.12), point(x, tick), ink);
        }
    }
}

inline void drawTrianglePlate(Raster& raster, const Triangle& plate, Color color) {
    // Barycentric graph paper on ONE triangular sheet: the reverse side
    // shares exactly the same three vertices and has no volume interval.
    const Vec3 a = plate.a;
    const Vec3 b = plate.b;
    const Vec3 c = plate.c;
    const Vec3 normal = normalize(cross(subtract(b, a), subtract(c, a)));
    const PaintVertex p{a, finish(raster.camera, a, normal, colorBetween(color, {62, 61, 113}, 0.32))};
    const PaintVertex q{b, finish(raster.camera, b, normal, colorBetween(color, {178, 221, 239}, 0.28))};
    const PaintVertex r{c, finish(raster.camera, c, normal, colorBetween(color, {250, 198, 228}, 0.36))};
    raster.paint(p, q, r, 255, true);
    const Color ink = colorBetween(q.color, {238, 225, 249}, 0.27);
    for (int mark = 1; mark < 6; ++mark) {
        const double t = mark / 6.0;
        raster.line(between(a, b, t), between(a, c, t), ink);
        raster.line(between(b, a, t), between(b, c, t), ink);
        raster.line(between(c, a, t), between(c, b, t), ink);
    }
    raster.line(a, b, {199, 179, 226});
    raster.line(b, c, {223, 213, 243});
    raster.line(c, a, {199, 179, 226});
}
} // namespace picking
