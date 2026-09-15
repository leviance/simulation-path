#include "lab.hpp"

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <sstream>
#include <string_view>
#include <vector>

namespace {
int failures = 0;

// Không dùng assert để các phép kiểm vẫn chạy trong Release khi NDEBUG được bật.
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

lab::ObjLoadResult parse(std::string_view source) {
    std::istringstream input{std::string(source)};
    return lab::parseObj(input);
}

struct RenderedFrame {
    std::vector<std::uint32_t> colors{};
    lab::DepthBuffer depths{1, 1};
    lab::RenderStats stats{};
};

RenderedFrame render(const lab::ObjMesh& mesh, bool reverseOrder) {
    constexpr int width = 180;
    constexpr int height = 140;
    RenderedFrame frame{};
    lab::RenderOptions options{};
    options.angleX = -0.28;
    options.angleY = 0.61;
    options.cullBackfaces = false;
    options.reverseOrder = reverseOrder;
    frame.stats = lab::renderObjMesh(mesh, width, height, options, frame.colors, frame.depths);
    return frame;
}
} // namespace

int main() {
    const lab::ObjLoadResult triangle = parse(
        "# one triangle\n"
        "v -1 0 0\n"
        "v 1 0 0\n"
        "v 0 1 0\n"
        "f 1 2 3\n"
    );
    check(!triangle.hasErrors(), "basic OBJ parses without diagnostics");
    check(triangle.mesh.positions.size() == 3, "three v records create three positions");
    check(triangle.mesh.triangles.size() == 1, "one triangle face creates one triangle");
    check(triangle.mesh.triangles[0].indices == std::array<std::size_t, 3>{0, 1, 2}, "OBJ 1-based indices become zero-based");

    const lab::ObjLoadResult slashAndNegative = parse(
        "v 0 0 0\n"
        "v 1 0 0\n"
        "v 0 1 0\n"
        "vt 0 0\n"
        "vn 0 0 1\n"
        "f 1/1/1 2//1 -1/1/1\n"
    );
    check(!slashAndNegative.hasErrors(), "slash tokens and negative indices parse");
    check(slashAndNegative.mesh.triangles.size() == 1, "slash face creates one triangle");
    check(slashAndNegative.mesh.triangles[0].indices[2] == 2, "negative one resolves to the newest position");

    const lab::ObjLoadResult quad = parse(
        "v -1 -1 0\n"
        "v 1 -1 0\n"
        "v 1 1 0\n"
        "v -1 1 0\n"
        "f 1 2 3 4\n"
    );
    check(quad.mesh.triangles.size() == 2, "four-corner face creates N minus two triangles");
    check(quad.mesh.triangles[0].indices == std::array<std::size_t, 3>{0, 1, 2}, "triangle fan starts at corner zero");
    check(quad.mesh.triangles[1].indices == std::array<std::size_t, 3>{0, 2, 3}, "triangle fan keeps winding on the second triangle");
    check(quad.mesh.triangles[0].sourceLine == 5, "triangulated face keeps its source line");

    const lab::ObjLoadResult invalid = parse(
        "v 0 0 0\n"
        "v 1 0 0\n"
        "f 1 0 2\n"
        "f 1 2 9\n"
    );
    check(invalid.diagnostics.size() == 2, "invalid zero and out-of-range indices both report diagnostics");
    check(invalid.diagnostics[0].line == 3, "diagnostic points to the first broken face line");
    check(invalid.mesh.triangles.empty(), "broken faces never create partial triangles");

    lab::ObjMesh normalizedMesh = quad.mesh;
    check(lab::normalizeMesh(normalizedMesh), "non-empty mesh can be normalized");
    const std::optional<lab::Bounds3> normalizedBounds = lab::meshBounds(normalizedMesh);
    check(normalizedBounds.has_value(), "normalized mesh keeps valid bounds");
    if (normalizedBounds) {
        const lab::Vec3 center = lab::boundsCenter(*normalizedBounds);
        check(nearlyEqual(center.x, 0.0) && nearlyEqual(center.y, 0.0) && nearlyEqual(center.z, 0.0), "normalized bounds are centered at the origin");
        check(nearlyEqual(lab::boundsMaxExtent(*normalizedBounds), 2.0), "normalized maximum extent is two");
    }

    lab::ObjMesh pointMesh{};
    pointMesh.positions.push_back({2.0, 2.0, 2.0});
    check(!lab::normalizeMesh(pointMesh), "zero-size bounds are rejected before division");

    const std::optional<lab::Vec3> normal = lab::faceNormal(
        {-1.0, -1.0, 0.0},
        {1.0, -1.0, 0.0},
        {0.0, 1.0, 0.0}
    );
    check(normal.has_value(), "non-degenerate triangle has a face normal");
    if (normal) {
        check(nearlyEqual(lab::length(*normal), 1.0), "face normal is unit length");
        check(normal->z > 0.0, "counter-clockwise XY triangle points toward positive Z");
    }
    check(!lab::faceNormal({0.0, 0.0, 0.0}, {1.0, 0.0, 0.0}, {2.0, 0.0, 0.0}), "degenerate triangle has no finite normal");

    const std::vector<lab::Vec3> oneOutside = lab::clipTriangleToNearPlane(
        {-1.0, -1.0, 1.0},
        {1.0, -1.0, 1.0},
        {0.0, 1.0, 0.2},
        0.7
    );
    check(oneOutside.size() == 4, "one outside vertex clips to a four-corner polygon");
    check(
        std::all_of(oneOutside.begin(), oneOutside.end(), [](lab::Vec3 point) {
            return point.z >= 0.7 - 1e-9;
        }),
        "near clipping never emits a vertex behind the near plane"
    );

    lab::ObjLoadResult pyramid = parse(
        "v -1 -1 -1\n"
        "v 1 -1 -1\n"
        "v 1 -1 1\n"
        "v -1 -1 1\n"
        "v 0 1 0\n"
        "f 1 2 5\n"
        "f 2 3 5\n"
        "f 3 4 5\n"
        "f 4 1 5\n"
        "f 1 4 3 2\n"
    );
    check(lab::normalizeMesh(pyramid.mesh), "render fixture normalizes");
    const lab::MeshValidation validation = lab::validateMesh(pyramid.mesh);
    check(validation.valid(), "parsed pyramid has valid indices and non-degenerate triangles");

    const RenderedFrame forward = render(pyramid.mesh, false);
    const RenderedFrame reversed = render(pyramid.mesh, true);
    check(forward.stats.sourceTriangles == 6, "quad base is triangulated before rendering");
    check(forward.stats.rasterizedTriangles > 0, "OBJ triangles reach the rasterizer");
    check(forward.stats.passedFragments > 0, "visible OBJ fragments pass the Z-buffer");
    check(forward.stats.rejectedFragments > 0, "overlapping OBJ fragments exercise depth rejection");
    check(forward.colors == reversed.colors, "Z-buffer color output is independent of OBJ face order");
    check(
        lab::depthBuffersNearlyEqual(forward.depths.values, reversed.depths.values),
        "Z-buffer depth output is independent of OBJ face order"
    );
    for (const double depth : forward.depths.values) {
        check(std::isfinite(depth), "every stored depth remains finite");
        check(depth >= 0.0 && depth <= 1.0, "every stored depth remains in NDC range");
    }

    if (failures != 0) {
        std::cerr << failures << " checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 21 validation passed.\n";
    return EXIT_SUCCESS;
}
