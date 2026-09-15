#include "lab.hpp"

#include <algorithm>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <set>
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

struct RenderedFrame {
    std::vector<std::uint32_t> colors{};
    lab::DepthBuffer depths{1, 1};
    lab::RenderStats stats{};
};

RenderedFrame render(bool reverseOrder, bool depthEnabled) {
    constexpr int width = 160;
    constexpr int height = 120;
    RenderedFrame frame{
        std::vector<std::uint32_t>(std::size_t(width) * std::size_t(height), 0x090f1dffU),
        lab::DepthBuffer(width, height),
        {},
    };
    frame.stats = lab::renderCube(
        lab::makeCubeMesh(),
        width,
        height,
        -0.42,
        0.68,
        reverseOrder,
        depthEnabled,
        frame.colors,
        frame.depths
    );
    return frame;
}
} // namespace

int main() {
    const lab::CubeMesh mesh = lab::makeCubeMesh();
    check(mesh.vertices.size() == 8, "cube has eight shared vertices");
    check(mesh.triangles.size() == 12, "cube has twelve indexed triangles");

    std::set<std::string_view> faces{};
    for (const lab::IndexedTriangle& triangle : mesh.triangles) {
        faces.insert(triangle.faceName);
        for (const std::size_t index : triangle.indices) {
            check(index < mesh.vertices.size(), "every mesh index refers to an existing vertex");
        }
    }
    check(faces.size() == 6, "cube exposes six named faces");

    // Projection dùng NDC depth [0,1]: near là 0, far là 1 và depth tăng theo Z.
    const lab::ScreenVertex onNear = lab::projectVertex({0.0, 0.0, 1.0}, 640, 480);
    const lab::ScreenVertex inMiddle = lab::projectVertex({0.0, 0.0, 4.0}, 640, 480);
    const lab::ScreenVertex onFar = lab::projectVertex({0.0, 0.0, 10.0}, 640, 480);
    check(nearlyEqual(onNear.ndcDepth, 0.0), "near plane maps to NDC depth zero");
    check(nearlyEqual(onFar.ndcDepth, 1.0), "far plane maps to NDC depth one");
    check(
        onNear.ndcDepth < inMiddle.ndcDepth && inMiddle.ndcDepth < onFar.ndcDepth,
        "smaller NDC depth is closer to the camera"
    );

    lab::DepthBuffer buffer(4, 3);
    check(buffer.values().size() == 12, "depth buffer owns one scalar per pixel");
    check(buffer.index(2, 1) == 6, "depth buffer uses row-major indexing");
    buffer.at(2, 1) = 0.25;
    buffer.clear();
    check(nearlyEqual(buffer.at(2, 1), 1.0), "clear restores far depth");
    buffer.resize(7, 5);
    check(buffer.values().size() == 35, "resize reallocates width times height values");

    const lab::ScreenTriangle sloped{
        {0.0, 0.0, 0.2},
        {4.0, 0.0, 0.5},
        {0.0, 4.0, 0.8},
        {255, 255, 255, 255},
        "test",
    };
    const double interpolated = lab::interpolateNdcDepth(sloped, {0.25, 0.50, 0.25});
    check(nearlyEqual(interpolated, 0.5), "barycentric weights interpolate per-fragment depth");

    lab::DepthBuffer onePixel(1, 1);
    const lab::DepthTestResult nearPass = lab::depthTestAndWrite(onePixel, 0, 0, 0.25);
    const lab::DepthTestResult farFail = lab::depthTestAndWrite(onePixel, 0, 0, 0.75);
    const lab::DepthTestResult equalFail = lab::depthTestAndWrite(onePixel, 0, 0, 0.25);
    check(nearPass.passed && nearlyEqual(onePixel.at(0, 0), 0.25), "near fragment writes depth");
    check(!farFail.passed, "far fragment cannot overwrite a nearer fragment");
    check(!equalFail.passed, "strict less comparison rejects equal depth");

    const RenderedFrame normal = render(false, true);
    const RenderedFrame reversed = render(true, true);
    check(normal.stats.coveredCount > 0, "all twelve triangles reach the rasterizer");
    check(normal.stats.passedCount > 0, "visible cube fragments pass the depth test");
    check(normal.stats.rejectedCount > 0, "hidden cube fragments fail the depth test");
    check(normal.colors == reversed.colors, "color buffer is independent of draw order");
    check(
        lab::buffersNearlyEqual(normal.depths.values(), reversed.depths.values()),
        "depth buffer is independent of draw order"
    );

    for (const double depth : normal.depths.values()) {
        check(std::isfinite(depth), "every stored depth remains finite");
        check(depth >= 0.0 && depth <= 1.0, "every stored depth remains inside NDC range");
    }

    const RenderedFrame painterNormal = render(false, false);
    const RenderedFrame painterReversed = render(true, false);
    check(
        painterNormal.colors != painterReversed.colors,
        "without a depth test the cube depends on triangle order"
    );

    if (failures != 0) {
        std::cerr << failures << " checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 17 validation passed.\n";
    return EXIT_SUCCESS;
}
