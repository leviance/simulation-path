#include "lab.hpp"
#include "reference.hpp"

#include <algorithm>
#include <chrono>
#include <cmath>
#include <cstdlib>
#include <filesystem>
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
    auto tinyTriangle = parse("v 0 0 0\nv 0.000001 0 0\nv 0 0.000001 0\nf 1 2 3\n");
    check(!tinyTriangle.hasErrors() && lab::normalizeMesh(tinyTriangle.mesh), "convex test remains valid when a model uses small units");
    check(!parse("\xEF\xBB\xBFv 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n").hasErrors(), "UTF-8 BOM does not become an unsupported keyword");
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

    // Unsupported record và suffix sai phải được báo, không bị bỏ qua âm thầm.
    for (const std::string_view token : {"1/", "1///2", "1/banana", "1/0/2", "1//0", "1/2/3/4"}) {
        check(!lab::resolveObjPositionIndex(token, 4), "malformed attribute fields are rejected");
    }
    const auto unsupported = parse("v 0 0 0\ncurv 0 1 2\n");
    check(unsupported.hasErrors() && unsupported.diagnostics.front().line == 2, "unsupported records report their line");
    check(!parse("v 0 0 0oops\n").hasRenderableMesh(), "vertex suffix cannot pass numeric parsing");
    const auto concave = parse("v 0 0 0\nv 2 0 0\nv 1 0.4 0\nv 2 2 0\nv 0 2 0\nf 1 2 3 4 5\n");
    check(concave.hasErrors() && concave.mesh.triangles.empty(), "concave polygon is rejected rather than fan-filled incorrectly");
    const auto nonPlanar = parse("v 0 0 0\nv 1 0 0\nv 1 1 0.2\nv 0 1 0\nf 1 2 3 4\n");
    check(nonPlanar.hasErrors(), "non-planar polygon reports a diagnostic");

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

    // Tài sản thật mới là bằng chứng về quy mô, không phải mesh test tí hon.
    const auto assets = std::filesystem::path(__FILE__).parent_path().parent_path() / "assets";
    for (const auto& entry : std::array<std::pair<const char*, std::size_t>, 3>{{{"cube.obj", 12}, {"faceted-sphere.obj", 2976}, {"low-poly-rocket.obj", 32}}}) {
        auto loaded = lab::loadObjFile((assets / entry.first).string());
        check(loaded.hasRenderableMesh(), "real bundled OBJ loads without diagnostic");
        check(loaded.mesh.triangles.size() == entry.second, "real model has the specified triangle count");
        check(lab::normalizeMesh(loaded.mesh), "real model normalizes uniformly");
        check(lab::validateMesh(loaded.mesh).valid(), "real model has no degenerate triangle");
        const auto normalFrame = render(loaded.mesh, false);
        const auto reverseFrame = render(loaded.mesh, true);
        check(normalFrame.stats.passedFragments > 100, "real model produces visible pixels");
        check(normalFrame.colors == reverseFrame.colors, "real model color is order independent");
        check(lab::depthBuffersNearlyEqual(normalFrame.depths.values, reverseFrame.depths.values), "real model depth is order independent");
        lab::RenderOptions oracleOptions{};
        oracleOptions.cullBackfaces = false;
        oracleOptions.cameraYaw = 0.31;
        oracleOptions.cameraPitch = -0.17;
        check(reference::depthMismatches(loaded.mesh, oracleOptions) == 0, "raster depth matches independent ray-triangle intersections");
        oracleOptions.distance = 1.1;
        check(reference::depthMismatches(loaded.mesh, oracleOptions) == 0, "near-clipped pixels match independent ray-triangle intersections");
    }

    lab::ViewerModel model{};
    check(lab::openModel(model, (assets / "cube.obj").string()), "viewer can open the first model");
    const auto savedPositions = model.mesh.positions.size();
    check(!lab::openModel(model, (assets / "missing.obj").string()), "missing file reports failure");
    check(model.mesh.positions.size() == savedPositions && !model.message.empty(), "failed load preserves the previous model and exposes a diagnostic");
    check(lab::openModel(model, (assets / "faceted-sphere.obj").string()), "viewer can replace cube with a few-thousand-triangle model");

    // Camera/model là hai state độc lập. Orbit không làm biến dạng geometry.
    lab::ViewerState state{};
    const double modelYaw = state.angleY;
    state.cameraDrag = true;
    lab::turnViewer(state, 0.4, 0.2);
    check(state.angleY == modelYaw && state.cameraYaw == 0.4, "camera drag never changes the model angle");
    state.cameraDrag = false;
    lab::turnViewer(state, 0.3, 0.0);
    check(nearlyEqual(state.angleY, modelYaw + 0.3) && state.cameraYaw == 0.4, "model drag never changes the camera angle");
    const auto camera = lab::viewerCamera(state);
    const auto quarterOrbit = lab::cameraEye({1.5707963267948966, 0.6, 4.2});
    check(nearlyEqual(quarterOrbit.y, 4.2 * std::sin(0.6)), "orbit pitch still changes height when yaw is ninety degrees");
    const auto originInCamera = lab::worldToCamera({}, camera);
    check(nearlyEqual(originInCamera.x, 0.0) && nearlyEqual(originInCamera.y, 0.0) && nearlyEqual(originInCamera.z, camera.distance), "orbit camera always looks at origin");
    const lab::Vec3 edgeA{-1.0, 0.0, 0.0};
    const lab::Vec3 edgeB{1.0, 0.0, 0.0};
    check(nearlyEqual(lab::length(lab::worldToCamera(edgeA, camera) - lab::worldToCamera(edgeB, camera)), 2.0), "camera view preserves lengths");
    const auto beforeStep = state.angleY;
    state.paused = true;
    check(!lab::advanceViewer(state, 0.1), "pause does not advance state");
    check(lab::advanceViewer(state, 1.0 / 60.0, true) && nearlyEqual(state.angleY - beforeStep, 0.45 / 60.0), "single step uses one fixed interval");

    lab::Framebuffer image{};
    state.normals = true;
    state.cameraYaw = 0.8;
    state.cameraPitch = 0.3;
    const auto start = std::chrono::steady_clock::now();
    const auto performance = lab::renderViewer(image, state, model);
    const double elapsed = std::chrono::duration<double, std::milli>(std::chrono::steady_clock::now() - start).count();
    check(performance.passed > 1000, "full-size native viewport renders the large asset");
    std::cout << "2976 triangles, 800x500, CPU frame: " << elapsed << " ms\n";
    const auto solidPixels = image.pixels;
    state.normals = false;
    lab::renderViewer(image, state, model);
    check(image.pixels != solidPixels, "normals overlay changes actual framebuffer pixels");
    state.wireframe = true;
    lab::renderViewer(image, state, model);
    const auto wirePixels = image.pixels;
    state.wireframe = false;
    lab::renderViewer(image, state, model);
    check(image.pixels != wirePixels, "wireframe and solid are distinct render paths");

    if (failures != 0) {
        std::cerr << failures << " checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 21 validation passed.\n";
    return EXIT_SUCCESS;
}
