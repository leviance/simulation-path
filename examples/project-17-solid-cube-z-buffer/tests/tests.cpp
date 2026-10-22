#include "view.hpp"

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

    // Oracle culling: normal hình học phải hướng ra khỏi tâm cube.
    for (const auto& t : mesh.triangles) {
        const auto a = mesh.vertices[t.indices[0]];
        const auto b = mesh.vertices[t.indices[1]];
        const auto c = mesh.vertices[t.indices[2]];
        const lab::Vec3 ab{b.x - a.x, b.y - a.y, b.z - a.z};
        const lab::Vec3 ac{c.x - a.x, c.y - a.y, c.z - a.z};
        const lab::Vec3 n{ab.y * ac.z - ab.z * ac.y, ab.z * ac.x - ab.x * ac.z, ab.x * ac.y - ab.y * ac.x};
        check(n.x * a.x + n.y * a.y + n.z * a.z > 0.0, "all cube windings point outward");
    }
    for (int i = 0; i < 12; ++i) {
        const double angle = i * 0.41;
        std::vector<std::uint32_t> a(96 * 72, 0x090f1dffU), b = a, c = a;
        lab::DepthBuffer da(96, 72), db(96, 72), dc(96, 72);
        const auto full = lab::renderCube(mesh, 96, 72, -0.42, angle, false, true, a, da, false);
        const auto culled = lab::renderCube(mesh, 96, 72, -0.42, angle, false, true, b, db, true);
        lab::renderCube(mesh, 96, 72, -0.42, angle, true, true, c, dc, true);
        check(a == b && b == c, "culling and reverse order preserve full visible image");
        check(lab::buffersNearlyEqual(da.values(), db.values()), "culling preserves nearest depth");
        check(full.submittedCount == 12 && culled.culledCount > 0, "culling actually removes triangles");
    }
    lab::DepthBuffer guarded(4, 3);
    guarded.at(1, 1) = 0.2;
    check(!guarded.resize(-1, 100) && guarded.at(1, 1) == 0.2, "invalid resize is atomic");
    check(!guarded.resize(100000, 100000), "oversized buffer rejected before allocation");
    check(!lab::depthTestAndWrite(guarded, -1, 0, 0.2).passed, "out-of-bounds depth rejected");
    check(!lab::depthTestAndWrite(guarded, 0, 0, NAN, false).passed, "NaN rejected even with depth disabled");
    check(!lab::depthTestAndWrite(guarded, 0, 0, 1.0).passed, "far clear tie rejected");
    check(lab::depthTestAndWrite(guarded, 0, 0, 0.2, false).passed && guarded.at(0, 0) == 1.0, "depth disabled never writes depth");
    check(!lab::buffersNearlyEqual({NAN}, {NAN}), "NaN cannot pass buffer equality");
    check(!lab::projectVertex({0, 0, 0}, 640, 480).valid, "depth guarded before projection divide");
    const lab::ScreenTriangle invalid{{NAN, 0, 0.5}, {1, 1, 0.5}, {2, 0, 0.5}, {255, 0, 0, 255}, "invalid"};
    const auto noWrite = [](int, int, lab::Barycentric, const lab::ScreenTriangle&) {
    };
    const auto invalidCoverage = lab::rasterizeTriangle(invalid, 8, 8, noWrite);
    check(invalidCoverage == 0, "nonfinite raster bounds never cast to int");
    lab::RenderTargets targets;
    lab::Scene scene;
    scene.debug = false;
    const auto clean = lab::renderScene(targets, scene);
    check(clean.submittedCount == 12 && clean.passedCount > 0, "clean scene contains actual 12 triangle cube");
    check(std::count(targets.image.pixels.begin(), targets.image.pixels.end(), lab::kGrid) > 0, "clean scene retains projected world grid");
    const auto originalCamera = scene.camera;
    const auto originalAngle = scene.angleY;
    lab::DragState drag;
    lab::beginDrag(scene, {100, 100}, drag);
    lab::updateDrag(scene, drag, {110, 100});
    check(nearlyEqual(scene.angleY, originalAngle + 0.08) && scene.camera.x == originalCamera.x, "model drag never rotates or moves camera");
    scene.paused = false;
    check(lab::advanceScene(scene, 0.02), "dt animation advances model");
    const double beforeInvalid = scene.angleY;
    check(!lab::advanceScene(scene, NAN) && scene.angleY == beforeInvalid, "invalid dt is ignored");

    // Oracle độc lập: ray/AABB ở local space, không gọi projectCube hay rasterizer.
    const auto inverseRotate = [](lab::Vec3 p) {
        constexpr double ax = -0.42;
        constexpr double ay = 0.68;
        const lab::Vec3 afterX{p.x, p.y * std::cos(ax) + p.z * std::sin(ax), -p.y * std::sin(ax) + p.z * std::cos(ax)};
        return lab::Vec3{afterX.x * std::cos(ay) - afterX.z * std::sin(ay), afterX.y, afterX.x * std::sin(ay) + afterX.z * std::cos(ay)};
    };
    const auto origin = inverseRotate({0.0, 0.0, -4.2});
    const double focal = 60.0 / std::tan(3.14159265358979323846 / 6.0);
    bool oracleAgrees = true;
    for (int y = 0; y < 120; ++y) {
        for (int x = 0; x < 160; ++x) {
            const auto ray = inverseRotate({(x + 0.5 - 80.0) / focal, (60.0 - y - 0.5) / focal, 1.0});
            const std::array<double, 3> o{origin.x, origin.y, origin.z};
            const std::array<double, 3> d{ray.x, ray.y, ray.z};
            double entry = 0.0;
            double exit = std::numeric_limits<double>::infinity();
            bool hit = true;
            for (int axis = 0; axis < 3; ++axis) {
                if (std::abs(d[axis]) < 1e-12) {
                    if (o[axis] < -1.0 || o[axis] > 1.0) {
                        hit = false;
                    }
                    continue;
                }
                const double a = (-1.0 - o[axis]) / d[axis];
                const double b = (1.0 - o[axis]) / d[axis];
                entry = std::max(entry, std::min(a, b));
                exit = std::min(exit, std::max(a, b));
            }
            hit = hit && entry <= exit && entry >= 1.0 && entry < 10.0;
            double expected = 1.0;
            if (hit) {
                expected = 10.0 / 9.0 - 10.0 / (9.0 * entry);
            }
            oracleAgrees = oracleAgrees && nearlyEqual(normal.depths.at(x, y), expected);
        }
    }
    check(oracleAgrees, "all pixel depths agree with independent ray-box oracle");
    lab::Scene timeA, timeB;
    timeA.paused = false;
    timeB.paused = false;
    for (int i = 0; i < 100; ++i) {
        lab::advanceScene(timeA, 0.01);
    }
    for (int i = 0; i < 50; ++i) {
        lab::advanceScene(timeB, 0.02);
    }
    check(nearlyEqual(timeA.angleY, timeB.angleY), "animation independent of frame splits");
    lab::DragState invalidDrag;
    lab::beginDrag(timeA, {NAN, 0.0}, invalidDrag);
    check(!invalidDrag.active, "nonfinite pointer never casts to int");

    if (failures != 0) {
        std::cerr << failures << " checks failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 17 validation passed.\n";
    return EXIT_SUCCESS;
}
