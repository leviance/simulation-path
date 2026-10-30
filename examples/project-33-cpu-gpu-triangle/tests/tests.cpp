#include "editor.hpp"
#include "pipeline.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <numbers>
#include <string_view>

namespace {

// CTest chỉ khóa pipeline contract CPU; nó không tạo SDL window hoặc OpenGL context.
int failures = 0;
int checks = 0;

void check(bool condition, std::string_view label) {
    ++checks;
    if (!condition) {
        std::cerr << "FAIL: " << label << '\n';
        ++failures;
    }
}

void testVertexContract() {
    check(sizeof(lab::GpuVertex) == sizeof(float) * 5U, "GpuVertex stores exactly five floats");
    check(offsetof(lab::GpuVertex, positionX) == 0U, "position starts at attribute offset zero");
    check(offsetof(lab::GpuVertex, red) == sizeof(float) * 2U, "color starts after two position floats");
    check(lab::kSourceTriangle.size() == 3U, "triangle contains exactly three vertices");
}

void testTransformOrder() {
    const lab::Transform2D transform{std::numbers::pi_v<float> * 0.5F, 0.5F, {0.2F, -0.1F}};
    const lab::Vec2 result = lab::transformPosition({1.0F, 0.0F}, transform);
    check(std::abs(result.x - 0.2F) <= 1.0e-5F, "rotate-scale-translate preserves expected x");
    check(std::abs(result.y - 0.4F) <= 1.0e-5F, "rotate-scale-translate preserves expected y");
}

void testCoordinateRoundTrips() {
    const lab::Vec2 point{0.37F, -0.42F};
    const lab::Vec2 cpuRecovered = lab::cpuScreenToNdc(lab::ndcToCpuScreen(point, 640, 720), 640, 720);
    check(lab::length(lab::subtract(point, cpuRecovered)) <= 1.0e-6F, "CPU top-left viewport round-trips NDC");

    const lab::Viewport viewport{640, 0, 640, 720};
    const lab::Vec2 gpuRecovered = lab::gpuWindowToNdc(lab::ndcToGpuWindow(point, viewport), viewport);
    check(lab::length(lab::subtract(point, gpuRecovered)) <= 1.0e-6F, "GPU bottom-left viewport round-trips NDC");
}

void testBarycentricColor() {
    const lab::Transform2D identity{};
    const lab::Vec2 centroid = lab::triangleCentroid(lab::kSourceTriangle, identity);
    const lab::BarycentricSample smooth = lab::sampleTriangleAtNdc(lab::kSourceTriangle, identity, centroid, true);
    check(smooth.inside, "triangle centroid is covered");
    for (const float weight : smooth.weights) {
        check(std::abs(weight - 1.0F / 3.0F) <= 1.0e-5F, "centroid weights are one third");
    }

    const lab::BarycentricSample solid = lab::sampleTriangleAtNdc(lab::kSourceTriangle, identity, centroid, false);
    check(lab::maximumColorDifference(smooth.color, solid.color) > 0.05F, "solid and smooth modes have different color contracts");
    check(!lab::sampleTriangleAtNdc(lab::kSourceTriangle, identity, {0.95F, 0.95F}, true).inside, "outside probe creates no fragment");
}

void testCpuRasterAndQuantization() {
    lab::Framebuffer first{};
    first.resize(200, 140);
    lab::rasterizeCpuTriangle(first, lab::kSourceTriangle, {}, true);
    lab::Framebuffer second{};
    second.resize(200, 140);
    lab::rasterizeCpuTriangle(second, lab::kSourceTriangle, {}, true);
    check(lab::framebufferChecksum(first) == lab::framebufferChecksum(second), "CPU raster output is deterministic");
    check(lab::framebufferChecksum(first) != 0U, "CPU raster checksum is observable");

    const lab::Color source{0.123F, 0.456F, 0.789F};
    const lab::Color quantized = lab::quantizeRgba8(source);
    check(lab::maximumColorDifference(source, quantized) <= 0.5F / 255.0F + 1.0e-6F, "RGBA8 error stays within half a color step");

    // Independent 2x2 answer, not a second call to the rasterizer as an oracle.
    const std::array<lab::GpuVertex, 3> fixture{{{-1, 1, 1, 0, 0}, {1, 1, 0, 1, 0}, {-1, -1, 0, 0, 1}}};
    lab::Framebuffer image{};
    check(image.resize(2, 2), "small known-answer image allocates");
    lab::rasterizeCpuTriangle(image, fixture, {}, true);
    check(image.rgba[0] == 128 && image.rgba[1] == 64 && image.rgba[2] == 64 && image.rgba[3] == 255, "known interior pixel is RGB 128 64 64");
    check(image.rgba[12] == 11 && image.rgba[13] == 16 && image.rgba[14] == 32, "known exterior pixel stays background");
    auto reversed = fixture;
    std::swap(reversed[1], reversed[2]);
    lab::Framebuffer reverseImage{};
    reverseImage.resize(2, 2);
    lab::rasterizeCpuTriangle(reverseImage, reversed, {}, true);
    check(image.rgba == reverseImage.rgba, "winding changes neither color nor coverage with culling disabled");

    check(!image.resize(0, 10), "zero image width rejected");
    check(!image.resize(-1, 10), "negative image width rejected");
    check(!image.resize(std::numeric_limits<int>::max(), 2), "oversized dimensions rejected before multiplication");
    check(!image.resize(4096, 4096), "application pixel budget enforced");
    check(image.width == 2 && image.height == 2 && image.rgba.size() == 16, "failed resize preserves the previous framebuffer");

    const float nan = std::numeric_limits<float>::quiet_NaN();
    check(std::isinf(lab::maximumColorDifference({nan, 0, 0}, {0, 0, 0})), "NaN color is never considered agreement");
    check(std::isinf(lab::maximumColorDifference({0, 0, 0}, {0, 0, std::numeric_limits<float>::infinity()})), "infinite color is never considered agreement");
    check(!lab::sampleTriangleAtNdc(fixture, {}, {nan, 0}, true).inside, "NaN probe cannot be covered");
}

void testProbePixelCenter() {
    check(lab::probeEdgeDistance(lab::kSourceTriangle, {}, {0, 0}, 100, 100) > 1.5F, "interior probe is away from coverage boundary");
    check(lab::probeEdgeDistance(lab::kSourceTriangle, {}, {0, 0.66F}, 100, 100) < 1.0e-5F, "vertex probe is classified as boundary, not a verdict");
    const lab::Viewport viewport{31, 7, 101, 73};
    const lab::ProbePixel pixel = lab::locateProbePixel({0.0F, 0.0F}, viewport);
    check(pixel.valid && pixel.x == 81 && pixel.y == 43, "odd viewport selects the containing pixel");
    check(std::abs(pixel.centerNdc.x) < 1.0e-6F && std::abs(pixel.centerNdc.y) < 1.0e-6F, "odd viewport center maps back to NDC zero");

    const lab::Viewport evenViewport{0, 0, 100, 100};
    const lab::ProbePixel snapped = lab::locateProbePixel({0.0F, 0.0F}, evenViewport);
    check(std::abs(snapped.centerNdc.x - 0.01F) < 1.0e-6F, "CPU expected color uses the selected sample center, not the original point");
    check(!lab::locateProbePixel({1.0F, 0.0F}, viewport).valid, "right viewport boundary is excluded");
    check(!lab::locateProbePixel({-1.01F, 0.0F}, viewport).valid, "off-screen probe is not clamped");
    check(!lab::locateProbePixel({0.0F, 0.0F}, {0, 0, 0, 10}).valid, "empty viewport has no sample");
    check(!lab::locateProbePixel({std::numeric_limits<float>::quiet_NaN(), 0.0F}, viewport).valid, "NaN probe is rejected");
}

void testSharedVertexEditing() {
    const lab::Transform2D transform{0.73F, 0.62F, {0.13F, -0.21F}};
    const lab::Vec2 local{-0.37F, 0.54F};
    const auto recovered = lab::inverseTransformPosition(lab::transformPosition(local, transform), transform);
    check(lab::length(lab::subtract(local, recovered)) < 1.0e-6F, "drag inverse undoes translation, scale and rotation");
    const auto left = lab::pointerToPanel({125, 125}, 500, 250, 1000, 500);
    const auto right = lab::pointerToPanel({375, 125}, 500, 250, 1000, 500);
    check(left.valid && right.valid && left.panel == 0 && right.panel == 1, "DPR pointer selects both panels");
    check(lab::length(lab::subtract(left.ndc, right.ndc)) < 1.0e-6F, "same relative position has same NDC in either panel");
    check(!lab::pointerToPanel({500, 125}, 500, 250, 1000, 500).valid, "pointer outside window is rejected");
    const auto vertex = lab::kSourceTriangle[1];
    const auto ndc = lab::transformPosition({vertex.positionX, vertex.positionY}, transform);
    check(lab::pickVertex(lab::kSourceTriangle, transform, ndc, 500, 500) == 1, "pick uses transformed positions");
    check(lab::pickVertex(lab::kSourceTriangle, transform, {1, 1}, 500, 500) == -1, "empty space does not select a vertex");
}

void testNamedValidationReport() {
    const lab::PipelineValidationReport report = lab::validateCpuGpuTriangleContract();
    check(report.vertexLayout, "validation locks vertex layout");
    check(report.transformOrder, "validation locks transform order");
    check(report.cpuRoundTrip, "validation locks CPU coordinate round-trip");
    check(report.gpuRoundTrip, "validation locks GPU coordinate round-trip");
    check(report.centroidWeights, "validation locks barycentric centroid");
    check(report.deterministicRaster, "validation locks deterministic rasterization");
    check(report.rgba8Tolerance, "validation locks RGBA8 tolerance");
}

} // namespace

int main() {
    testVertexContract();
    testTransformOrder();
    testCoordinateRoundTrips();
    testBarycentricColor();
    testCpuRasterAndQuantization();
    testProbePixelCenter();
    testSharedVertexEditing();
    testNamedValidationReport();

    if (failures != 0) {
        std::cerr << failures << " Project 33 validation checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 33 CPU: " << checks << " checks, " << failures << " failures.\n";
    return EXIT_SUCCESS;
}
