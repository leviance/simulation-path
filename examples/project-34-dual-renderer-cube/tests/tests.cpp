#include "pipeline.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {

// CTest khóa shared scene contract bằng code CPU thuần; không tạo SDL window hay OpenGL context.
int failures = 0;

void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

void testIndexedMesh() {
    check(lab::kCubeVertices.size() == 24U, "cube stores four vertices for each of six faces");
    check(lab::kCubeIndices.size() == 36U, "cube stores twelve indexed triangles");
    check(lab::cubeIndicesAreValid(), "every element index stays inside the vertex array");
    check(sizeof(lab::GpuCubeVertex) == sizeof(float) * 6U, "vertex stores position xyz and color rgb");
    check(offsetof(lab::GpuCubeVertex, red) == sizeof(float) * 3U, "color starts after three position floats");
}

void testColumnMajorMvp() {
    const lab::Mat4 identity = lab::identityMatrix();
    const lab::Vec4 source{1.0F, 2.0F, 3.0F, 1.0F};
    const lab::Vec4 unchanged = lab::transform(identity, source);
    check(unchanged.x == source.x && unchanged.y == source.y && unchanged.z == source.z && unchanged.w == source.w, "identity matrix preserves a vector");

    const lab::CubeScene scene{};
    const lab::Mat4 mvp = lab::makeMvp(scene, 16.0F / 9.0F);
    const lab::VertexTrace trace = lab::traceVertex(lab::kCubeVertices[0], mvp, 960, 540);
    check(trace.clip.w > 0.0F, "visible cube vertex has positive clip w");
    check(std::isfinite(trace.ndc.x) && std::isfinite(trace.ndc.y) && std::isfinite(trace.ndc.z), "perspective divide stays finite");
    check(trace.screen.z >= 0.0F && trace.screen.z <= 1.0F, "OpenGL depth lands in zero-to-one window range");
}

void testDepthOrderIndependence() {
    lab::CubeScene scene{};
    // Giữ cả mặt sau để thí nghiệm này thật sự tạo fragments bị Z-buffer loại.
    scene.cullingEnabled = false;
    lab::Framebuffer normal{};
    normal.resize(160, 120);
    const lab::CpuRenderStats normalStats = lab::rasterizeCpuCube(normal, scene, false);
    lab::Framebuffer reversed{};
    reversed.resize(160, 120);
    lab::rasterizeCpuCube(reversed, scene, true);
    check(normal.rgba == reversed.rgba, "depth-enabled color output ignores triangle order");
    check(normal.depth == reversed.depth, "depth-enabled depth output ignores triangle order");
    check(normalStats.passedFragments > 0U, "CPU renderer produces visible fragments");
    check(normalStats.rejectedFragments > 0U, "depth test rejects hidden fragments");
}

void testDepthFailureExperiment() {
    lab::CubeScene scene{};
    scene.depthEnabled = false;
    scene.cullingEnabled = false;
    lab::Framebuffer normal{};
    normal.resize(120, 90);
    lab::rasterizeCpuCube(normal, scene, false);
    lab::Framebuffer reversed{};
    reversed.resize(120, 90);
    lab::rasterizeCpuCube(reversed, scene, true);
    check(normal.rgba != reversed.rgba, "disabled depth makes painter order observable");
}

void testCullingAndRendererState() {
    lab::CubeScene scene{};
    lab::Framebuffer framebuffer{};
    framebuffer.resize(160, 120);
    const lab::CpuRenderStats stats = lab::rasterizeCpuCube(framebuffer, scene);
    check(stats.culledTriangles > 0U, "back-face culling removes triangles");
    check(stats.culledTriangles < stats.submittedTriangles, "front-facing triangles remain visible");

    const lab::CubeScene beforeSwitch = scene;
    lab::RendererKind renderer = lab::RendererKind::cpu;
    renderer = lab::RendererKind::gpu;
    check(renderer == lab::RendererKind::gpu, "F2 selects the GPU backend");
    check(beforeSwitch.angleX == scene.angleX && beforeSwitch.angleY == scene.angleY, "renderer switch preserves transform state");
}

void testNamedValidationReport() {
    const lab::DualRendererValidationReport report = lab::validateDualRendererCubeContract();
    check(report.vertexLayout, "validation locks vertex layout");
    check(report.indexBounds, "validation locks index bounds");
    check(report.finiteClipCoordinates, "validation locks clip coordinates");
    check(report.depthOrderIndependent, "validation locks depth order independence");
    check(report.cullingRemovesTriangles, "validation locks culling behavior");
    check(report.deterministicCpuFrame, "validation locks deterministic CPU output");
    check(report.rendererSwitchPreservesScene, "validation locks shared scene state");
}

} // namespace

int main() {
    testIndexedMesh();
    testColumnMajorMvp();
    testDepthOrderIndependence();
    testDepthFailureExperiment();
    testCullingAndRendererState();
    testNamedValidationReport();

    if (failures != 0) {
        std::cerr << failures << " Project 34 validation checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 34 dual-renderer cube contract is valid.\n";
    return EXIT_SUCCESS;
}
