#include "pipeline.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <numbers>
#include <string_view>

namespace {

// CTest chỉ khóa pipeline contract CPU; nó không tạo SDL window hoặc OpenGL context.
int failures = 0;

void check(bool condition, std::string_view label) {
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
    testNamedValidationReport();

    if (failures != 0) {
        std::cerr << failures << " Project 33 validation checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 33 CPU/GPU triangle contract is valid.\n";
    return EXIT_SUCCESS;
}
