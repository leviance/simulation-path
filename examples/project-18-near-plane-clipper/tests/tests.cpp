#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

// This runner stays active in Release, unlike the standard assert macro under NDEBUG.
void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    ++failures;
    std::cerr << "FAIL: " << label << '\n';
}

bool nearlyEqual(double left, double right, double tolerance = 1e-9) {
    return std::abs(left - right) <= tolerance;
}

lab::ClipVertex vertex(double x, double y, double z, double red = 0.0) {
    return {{x, y, z}, {red, 0.0, 0.0}};
}

void checkPolygonIsSafe(const lab::ClippedPolygon& polygon, double nearPlane) {
    for (std::size_t index = 0; index < polygon.count; ++index) {
        check(lab::isFinite(polygon.vertices[index]), "clipped vertex remains finite");
        check(
            polygon.vertices[index].position.z >= nearPlane - 1e-9,
            "every clipped vertex is on or beyond near plane"
        );
    }
}

double signedPolygonDoubleArea(const lab::ClippedPolygon& polygon) {
    double area = 0.0;
    for (std::size_t index = 0; index < polygon.count; ++index) {
        const lab::Vec3 current = polygon.vertices[index].position;
        const lab::Vec3 next = polygon.vertices[(index + 1) % polygon.count].position;
        area += current.x * next.y - current.y * next.x;
    }
    return area;
}

double signedTriangleDoubleArea(const lab::Triangle3& triangle) {
    const lab::Vec3 a = triangle.a.position;
    const lab::Vec3 b = triangle.b.position;
    const lab::Vec3 c = triangle.c.position;
    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
}
} // namespace

int main() {
    constexpr double nearPlane = 1.0;

    // Start with scalar classification and one edge intersection before testing topology.
    const lab::ClipVertex before = vertex(-1.0, 0.0, 0.25, 20.0);
    const lab::ClipVertex onPlane = vertex(0.0, 0.0, nearPlane, 50.0);
    const lab::ClipVertex beyond = vertex(1.0, 0.0, 2.25, 100.0);
    check(
        nearlyEqual(lab::signedDistanceToNearPlane(before, nearPlane), -0.75),
        "signed distance is negative before near plane"
    );
    check(lab::isInsideNearPlane(onPlane, nearPlane), "vertex on plane belongs to kept half-space");
    check(lab::isInsideNearPlane(beyond, nearPlane), "vertex beyond near plane is inside");
    check(
        lab::isInsideNearPlane(vertex(0.0, 0.0, nearPlane - 0.5e-9), nearPlane),
        "default epsilon keeps a vertex just below the near plane"
    );
    check(
        !lab::isInsideNearPlane(vertex(0.0, 0.0, nearPlane - 2.0e-9), nearPlane),
        "default epsilon still rejects a vertex beyond its tolerance"
    );

    const lab::ClipVertex intersection = lab::intersectNearPlane(before, beyond, nearPlane);
    const double expectedT = (nearPlane - before.position.z) / (beyond.position.z - before.position.z);
    check(nearlyEqual(intersection.position.z, nearPlane), "intersection lies exactly on near plane");
    check(
        nearlyEqual(intersection.position.x, before.position.x + 2.0 * expectedT),
        "intersection position uses the segment parameter"
    );
    check(
        nearlyEqual(intersection.color.red, before.color.red + 80.0 * expectedT),
        "intersection color uses the same segment parameter"
    );

    const lab::Triangle3 allInside{
        vertex(-1.0, -1.0, 2.0),
        vertex(1.0, -1.0, 3.0),
        vertex(0.0, 1.0, 2.5),
    };
    const lab::ClippedPolygon insidePolygon = lab::clipTriangleToNearPlane(allInside, nearPlane);
    check(insidePolygon.count == 3, "all-inside triangle stays a triangle");
    check(
        nearlyEqual(insidePolygon.vertices[0].position.x, allInside.a.position.x),
        "all-inside clipping preserves vertex order"
    );

    const lab::Triangle3 oneOutside{
        vertex(-1.0, -1.0, 0.4),
        vertex(1.0, -1.0, 2.5),
        vertex(0.0, 1.0, 2.0),
    };
    const lab::ClippedPolygon quad = lab::clipTriangleToNearPlane(oneOutside, nearPlane);
    check(quad.count == 4, "one outside vertex produces a four-vertex polygon");
    checkPolygonIsSafe(quad, nearPlane);
    check(signedPolygonDoubleArea(quad) > 0.0, "clipping preserves polygon winding");
    const lab::TriangleBatch twoTriangles = lab::triangulateFan(quad);
    check(twoTriangles.count == 2, "four-vertex polygon becomes two triangles");
    check(
        nearlyEqual(
            twoTriangles.triangles[0].a.position.x,
            twoTriangles.triangles[1].a.position.x
        ),
        "triangle fan reuses polygon vertex zero"
    );
    for (std::size_t index = 0; index < twoTriangles.count; ++index) {
        check(
            signedTriangleDoubleArea(twoTriangles.triangles[index]) > 0.0,
            "triangle fan preserves winding and avoids a flipped output triangle"
        );
    }

    const lab::Triangle3 twoOutside{
        vertex(-1.0, -1.0, 0.4),
        vertex(1.0, -1.0, 0.6),
        vertex(0.0, 1.0, 2.0),
    };
    const lab::ClippedPolygon clippedTriangle = lab::clipTriangleToNearPlane(
        twoOutside,
        nearPlane
    );
    check(clippedTriangle.count == 3, "two outside vertices leave one clipped triangle");
    checkPolygonIsSafe(clippedTriangle, nearPlane);
    check(lab::triangulateFan(clippedTriangle).count == 1, "three vertices produce one triangle");

    const lab::Triangle3 allOutside{
        vertex(-1.0, -1.0, 0.2),
        vertex(1.0, -1.0, 0.4),
        vertex(0.0, 1.0, 0.6),
    };
    const lab::ClippedPolygon empty = lab::clipTriangleToNearPlane(allOutside, nearPlane);
    check(empty.count == 0, "all-outside triangle is removed");
    check(lab::triangulateFan(empty).count == 0, "empty polygon produces no triangles");

    const lab::Triangle3 grazing{
        onPlane,
        vertex(1.0, -1.0, 2.0),
        vertex(0.0, 1.0, 1.0),
    };
    const lab::ClipResult grazingResult = lab::clipForRender(grazing, nearPlane);
    check(grazingResult.polygon.count == 3, "vertices on near plane are not duplicated");
    check(
        lab::maximumNearPlaneViolation(grazingResult.polygon, nearPlane) <= 1e-9,
        "reported near-plane violation stays within tolerance"
    );

    // Quét một vertex qua near plane để khóa chuyển tiếp 4 → 3 vertex và kiểm
    // tra rằng mọi trạng thái trung gian vẫn hữu hạn, đúng winding.
    for (const double movingDepth : {0.6, 0.8, 1.0, 1.2, 1.4}) {
        const lab::Triangle3 moving{
            vertex(-1.0, -1.0, movingDepth),
            vertex(1.0, -1.0, 2.5),
            vertex(0.0, 1.0, 2.0),
        };
        const lab::ClippedPolygon swept = lab::clipTriangleToNearPlane(moving, nearPlane);
        const std::size_t expectedCount = movingDepth < nearPlane ? 4 : 3;
        check(swept.count == expectedCount, "near-plane sweep keeps the expected topology");
        checkPolygonIsSafe(swept, nearPlane);
        check(signedPolygonDoubleArea(swept) > 0.0, "near-plane sweep preserves winding");
    }

    const lab::Viewport viewport{0, 0, 640, 480};
    const auto rejected = lab::projectVertex(before, 1.0471975511965976, viewport, nearPlane);
    check(!rejected.has_value(), "projection rejects a vertex before near plane");
    const auto projected = lab::projectTriangle(allInside, 1.0471975511965976, viewport, nearPlane);
    check(projected.has_value(), "safe triangle projects after clipping");
    if (projected) {
        std::size_t callbackCount = 0;
        const lab::RasterStats stats = lab::rasterizeScreenTriangle(
            *projected,
            viewport.width,
            viewport.height,
            [&](int, int, lab::Color color) {
                check(std::isfinite(color.red), "raster color remains finite");
                ++callbackCount;
            }
        );
        check(stats.coveredCount > 0, "projected triangle covers pixels");
        check(stats.coveredCount == callbackCount, "covered count equals shade callback count");
    }

    if (failures != 0) {
        std::cerr << failures << " checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 18 validation passed.\n";
    return EXIT_SUCCESS;
}
