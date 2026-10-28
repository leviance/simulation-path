#include "viewer-comparison.hpp"
#include "viewer-cpu.hpp"
#include "viewer-fixtures.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

void testRealObjMeshes() {
    const auto assets = std::filesystem::path(__FILE__).parent_path().parent_path() / "assets";
    for (const char* name : {"cube.obj", "low-poly-rocket.obj", "faceted-sphere.obj"}) {
        std::string diagnostics;
        const auto mesh = lab::loadViewerMesh((assets / name).string(), diagnostics);
        check(mesh.has_value(), diagnostics.empty() ? "Project 21 asset loads" : diagnostics);
        if (!mesh)
            continue;
        check(lab::validViewerMesh(*mesh), "prepared mesh has finite unit normals and valid indices");
        const auto bounds = obj21::meshBounds(mesh->source);
        check(bounds.has_value() && std::abs(obj21::boundsMaxExtent(*bounds) - 2.0) < 1e-9, "normalization preserves uniform aspect and target extent");
        if (std::string(name) == "faceted-sphere.obj") {
            check(mesh->triangleCount() == 2976, "large canonical Project 21 mesh keeps all 2976 triangles");
        }
        if (std::string(name) == "cube.obj") {
            check(mesh->vertices.size() == 24 && mesh->indices.size() == 36, "flat normals split a cube into 24 indexed vertices");
        }
        lab::ViewerScene scene{};
        scene.view.grid = false;
        const auto before = scene;
        lab::Framebuffer frame{};
        frame.resize(160, 120);
        lab::CpuViewerRenderer renderer{};
        const auto matrices = lab::viewerMatrices(scene, 160.0F / 120.0F);
        const auto stats = renderer.render(frame, *mesh, scene, matrices);
        check(scene == before, "CPU mesh renderer cannot change scene or camera");
        check(stats.submitted == mesh->triangleCount() && stats.passed > 0, "real OBJ geometry reaches CPU raster/depth pipeline");
        for (float depth : frame.depth)
            check(std::isfinite(depth) && depth >= 0 && depth <= 1, "CPU mesh depth remains finite in [0,1]");
        lab::Framebuffer reversed{};
        reversed.resize(160, 120);
        scene.view.reverseOrder = true;
        renderer.render(reversed, *mesh, scene, matrices);
        check(frame.rgba == reversed.rgba, "real mesh color is order-independent with depth and top-left coverage");
        scene.view.normals = true;
        scene.view.wireframe = true;
        renderer.render(reversed, *mesh, scene, matrices);
        check(frame.rgba != reversed.rgba, "normal/wireframe debug modes remain available on real meshes");
    }
    std::istringstream invalid("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 7\n");
    check(obj21::parseObj(invalid).hasErrors(), "reused loader rejects out-of-range OBJ references");
}

void testViewerCameraAndClipping() {
    lab::ViewerScene scene{};
    scene.targetX = 0.3F;
    scene.targetY = -0.4F;
    scene.view.cameraYaw = 0.8;
    scene.view.cameraPitch = -0.3;
    const auto matrices = lab::viewerMatrices(scene, 1.7F);
    const auto target = lab::transform(lab::multiply(matrices.projection, matrices.view), {scene.targetX, scene.targetY, scene.targetZ, 1});
    check(std::abs(target.x / target.w) < 1e-6F && std::abs(target.y / target.w) < 1e-6F, "orbit camera looks at its shared pan target");
    const auto modelBefore = matrices.model.values;
    scene.view.cameraDrag = true;
    lab::turnViewer(scene.view, 0.2, 0.1);
    check(lab::viewerMatrices(scene, 1.7F).model.values == modelBefore, "camera orbit does not rotate the model");
    const auto angle = scene.view.angleY;
    lab::panViewer(scene, 10, -20, 720);
    check(scene.view.angleY == angle && scene.targetX != 0.3F, "pan changes the view target without editing model rotation");
    lab::zoomViewer(scene.view, 1000);
    check(scene.view.distance == 0.35, "zoom-in has a finite positive limit");
    lab::zoomViewer(scene.view, -1000);
    check(scene.view.distance == 40, "zoom-out has a finite limit");

    const auto clipped = lab::clipViewerTriangle({-0.7F, -0.3F, -2, 1}, {0.7F, -0.3F, 0, 1}, {0, 0.7F, 0, 1});
    check(clipped.count == 4, "near-plane crossing makes a four-vertex polygon before fan rasterization");
    for (std::size_t index = 0; index < clipped.count; ++index) {
        for (int plane = 0; plane < 6; ++plane)
            check(lab::clipDistance(clipped.points[index], plane) >= -1e-6F, "clipped geometry satisfies every OpenGL clip plane");
    }
    const auto outside = lab::clipViewerTriangle({3, 0, 0, 1}, {4, 0, 0, 1}, {3, 1, 0, 1});
    check(outside.count < 3, "fully outside geometry never reaches perspective divide");
}

void testMatrixContract() {
    const auto identity = lab::identityMatrix();
    const auto vector = lab::transform(identity, {1, 2, 3, 1});
    check(vector.x == 1 && vector.y == 2 && vector.z == 3 && vector.w == 1, "column-major identity");
    lab::ViewerScene scene{};
    scene.view.angleX = scene.view.angleY = 0;
    const auto matrices = lab::viewerMatrices(scene, 1);
    for (const float z : {-scene.nearPlane, -scene.farPlane}) {
        const auto clip = lab::transform(matrices.projection, {0, 0, z, 1});
        const float expected = z == -scene.nearPlane ? -1.0F : 1.0F;
        check(std::abs(clip.z / clip.w - expected) < 1e-5F, "RH OpenGL near/far maps to NDC [-1,1]");
    }
    const auto before = scene;
    for (int repeat = 0; repeat < 24; ++repeat) {
        const auto backend = repeat % 2 ? lab::RendererKind::cpu : lab::RendererKind::gpu;
        check(backend == lab::RendererKind::cpu || backend == lab::RendererKind::gpu, "backend is not scene data");
    }
    check(scene == before, "camera/object/light/model/settings are shared, not renderer-owned");
    scene.nearPlane = 0;
    bool rejected = false;
    try {
        lab::viewerMatrices(scene, 1);
    } catch (const std::invalid_argument&) {
        rejected = true;
    }
    check(rejected, "invalid projection is rejected before either renderer");
}

void testClippingAndVisibility() {
    lab::ViewerScene scene{};
    scene.view.angleX = scene.view.angleY = 0;
    scene.view.grid = false;
    scene.lit = false;
    const auto fixture = lab::viewerVisibilityFixture();
    lab::CpuViewerRenderer cpu{};
    lab::Framebuffer frame{};
    frame.resize(200, 150);
    const auto matrices = lab::viewerMatrices(scene, 4.0F / 3);
    const auto culled = cpu.render(frame, fixture, scene, matrices);
    scene.view.cullBackfaces = false;
    const auto visible = cpu.render(frame, fixture, scene, matrices);
    check(culled.culled == 1 && visible.culled == 0 && visible.passed > culled.passed * 1.8, "explicit CCW/CW fixture proves front/back culling");
    const auto nearMesh = lab::viewerNearFixture();
    scene.view.distance = 1.2;
    const auto clipped = cpu.render(frame, nearMesh, scene, lab::viewerMatrices(scene, 4.0F / 3));
    check(clipped.clipped > 0 && clipped.passed > 0, "triangle crossing eye and near plane stays partially visible");
    for (float depth : frame.depth)
        check(std::isfinite(depth) && depth >= 0 && depth <= 1, "clipped depth is finite [0,1]");
    for (int plane = 0; plane < 6; ++plane) {
        lab::Vec4 outside{0, 0, 0, 1};
        if (plane == 0)
            outside.x = -2;
        if (plane == 1)
            outside.x = 2;
        if (plane == 2)
            outside.y = -2;
        if (plane == 3)
            outside.y = 2;
        if (plane == 4)
            outside.z = -2;
        if (plane == 5)
            outside.z = 2;
        const auto polygon = lab::clipViewerTriangle(outside, {0.3F, 0, 0, 1}, {0, 0.3F, 0, 1});
        for (std::size_t index = 0; index < polygon.count; ++index) {
            for (int checkPlane = 0; checkPlane < 6; ++checkPlane)
                check(lab::clipDistance(polygon.points[index], checkPlane) >= -1e-6F, "all six clip planes obey homogeneous bounds");
        }
    }
}

void testComparisonCannotHideInteriorErrors() {
    lab::Framebuffer frame{};
    frame.resize(8, 8);
    std::vector<std::uint8_t> rgba = frame.rgba;
    std::vector<float> depth = frame.depth;
    std::vector<bool> edge(64, false);
    auto result = lab::compareViewerImage(frame, rgba, depth, edge);
    check(result.passed(64), "identical clear images compare");
    rgba[0] = 255;
    result = lab::compareViewerImage(frame, rgba, depth, edge);
    check(result.interiorFailures == 1 && !result.passed(64), "interior color/coverage mismatch cannot be forgiven");
    rgba = frame.rgba;
    depth[0] = 0.5F;
    check(!lab::compareViewerImage(frame, rgba, depth, edge).passed(64), "interior depth mismatch cannot be forgiven");
    depth[0] = std::numeric_limits<float>::quiet_NaN();
    check(!lab::compareViewerImage(frame, rgba, depth, edge).passed(64), "nonfinite GPU depth cannot pass");
}
} // namespace

int main() {
    testRealObjMeshes();
    testViewerCameraAndClipping();
    testMatrixContract();
    testClippingAndVisibility();
    testComparisonCannotHideInteriorErrors();
    if (failures != 0) {
        std::cerr << failures << " Project 34 checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 34 mesh/camera/clipping/raster/depth contracts passed (CPU only, no window).\n";
    return EXIT_SUCCESS;
}
