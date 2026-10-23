#include "view.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view message) {
    if (!condition) {
        ++failures;
        std::cerr << "FAIL: " << message << '\n';
    }
}

bool close(double a, double b, double epsilon = 1e-9) {
    return std::isfinite(a) && std::abs(a - b) <= epsilon;
}

void knownProjection() {
    const lab::Camera3D camera{};
    lab::PerspectiveLens lens;
    lens.verticalFovRadians = lab::kPi * 0.5;
    const lab::Viewport viewport{10.0, 20.0, 800.0, 600.0};
    // Tính tay bằng focalPixels = 300, không gọi inverse để tạo expected.
    const auto point = lab::projectPerspective({1.0, 0.5, 4.0}, camera, lens, viewport);
    check(point.status == lab::ProjectionStatus::Visible && point.screen.has_value(), "analytic point visible");
    check(point.screen && close(point.screen->x, 485.0) && close(point.screen->y, 282.5), "independent analytic pixel");
    const auto farther = lab::projectPerspective({1.0, 0.5, 8.0}, camera, lens, viewport);
    check(farther.screen && close(farther.screen->x, 447.5) && close(farther.screen->y, 301.25), "double depth halves displacement");
    const auto centered = lab::projectPerspective({0.0, 0.0, 4.0}, camera, lens, viewport);
    check(centered.screen && close(centered.screen->x, 410.0) && close(centered.screen->y, 320.0), "viewport origin included");
    const auto translated = lab::worldToCamera({3.0, 2.0, 8.0}, {{1.0, -1.0, 2.0}});
    check(close(translated.x, 2.0) && close(translated.y, 3.0) && close(translated.z, 6.0), "world minus camera");
}

void rejectionCases() {
    const lab::Camera3D camera{};
    const lab::PerspectiveLens lens{};
    const lab::Viewport viewport{};
    const auto expectStatus = [&](lab::Vec3 point, lab::ProjectionStatus expected) {
        const auto result = lab::projectPerspective(point, camera, lens, viewport);
        check(result.status == expected, "depth/frustum classification");
        if (expected != lab::ProjectionStatus::Visible && expected != lab::ProjectionStatus::OutsideFrustum) {
            check(!result.screen && !result.ndc, "rejected depth has no invented zero screen");
        }
    };
    expectStatus({0.0, 0.0, -1.0}, lab::ProjectionStatus::BehindCamera);
    expectStatus({0.0, 0.0, 0.0}, lab::ProjectionStatus::BehindCamera);
    expectStatus({0.0, 0.0, 1e-300}, lab::ProjectionStatus::BeforeNearPlane);
    expectStatus({0.0, 0.0, 0.5}, lab::ProjectionStatus::Visible);
    expectStatus({0.0, 0.0, 16.0}, lab::ProjectionStatus::Visible);
    expectStatus({0.0, 0.0, 16.01}, lab::ProjectionStatus::BeyondFarPlane);
    expectStatus({6.0, 0.0, 1.0}, lab::ProjectionStatus::OutsideFrustum);
    auto invalid = lens;
    invalid.verticalFovRadians = 0.0;
    check(lab::projectPerspective({1.0, 1.0, 4.0}, camera, invalid, viewport).status == lab::ProjectionStatus::Invalid, "reject zero FOV");
    invalid = lens;
    invalid.nearPlane = invalid.farPlane;
    check(!lab::validLens(invalid, viewport), "reject crossed depth planes");
    check(lab::projectPerspective({NAN, 0.0, 4.0}, camera, lens, viewport).status == lab::ProjectionStatus::Invalid, "reject NaN point");
    check(!lab::validLens(lens, {0.0, 0.0, 0.0, 600.0}), "reject zero viewport");
    check(!lab::projectionRoundTripError({0.0, 0.0, -1.0}, camera, lens, viewport), "undefined error not false success");
}

void inverseAndAspect() {
    lab::Scene scene;
    for (int aspect = 0; aspect < 3; ++aspect) {
        scene.aspect = aspect;
        const auto viewport = lab::viewportFor(scene);
        for (double fov : {25.0, 60.0, 90.0, 110.0}) {
            scene.lens.verticalFovRadians = fov * lab::kPi / 180.0;
            for (double z : {2.0, 4.0, 8.0, 16.0}) {
                const lab::Vec3 point{0.2, -0.1, z};
                const auto error = lab::projectionRoundTripError(point, scene.camera, scene.lens, viewport);
                check(error && *error < 1e-9, "round-trip across FOV/aspect/depth");
            }
        }
    }
    const auto restored = lab::screenToCameraAtDepth({485.0, 282.5}, 4.0, {lab::kPi * 0.5, 0.5, 16.0}, {10.0, 20.0, 800.0, 600.0});
    check(restored && close(restored->x, 1.0) && close(restored->y, 0.5) && close(restored->z, 4.0), "inverse numeric oracle");
    check(!lab::screenToCameraAtDepth({0.0, 0.0}, 0.0, scene.lens, lab::viewportFor(scene)), "inverse rejects unsafe depth");
}

void clippingAndPixels() {
    lab::Vec3 a{-1.0, 0.0, 0.0};
    lab::Vec3 b{1.0, 0.0, 2.0};
    const lab::PerspectiveLens lens{};
    check(lab::clipDepth(a, b, lens), "segment crosses near");
    check(close(a.x, -0.5) && a.z == lens.nearPlane, "analytic near intersection");
    a = {0.0, 0.0, 15.0};
    b = {2.0, 0.0, 17.0};
    check(lab::clipDepth(a, b, lens) && close(b.x, 1.0) && b.z == 16.0, "analytic far intersection");
    for (const double near : {std::numeric_limits<double>::quiet_NaN(), -1.0, 0.0, 16.0}) {
        auto invalid = lens;
        invalid.nearPlane = near;
        a = {0.0, 0.0, 1.0};
        b = {1.0, 1.0, 2.0};
        check(!lab::clipDepth(a, b, invalid), "clipping rejects invalid near/far before interpolation");
    }
    auto invalid = lens;
    invalid.farPlane = std::numeric_limits<double>::infinity();
    check(!lab::clipDepth(a, b, invalid), "clipping rejects infinite far");
    lab::Vec2 from{0.0, 0.0};
    lab::Vec2 to{1.0, 1.0};
    check(!lab::clipScreen(from, to, {NAN, 0.0, 100.0, 100.0}), "screen clipping rejects NaN viewport");
    check(!lab::clipScreen(from, to, {0.0, 0.0, 0.0, 100.0}), "screen clipping rejects zero width");
    from.x = NAN;
    check(!lab::clipScreen(from, to, {}), "screen clipping rejects nonfinite endpoint");
    lab::Framebuffer image;
    lab::Scene scene;
    scene.debug = false;
    lab::renderScene(image, scene);
    const auto colored = std::count(image.pixels.begin(), image.pixels.end(), lab::kShape);
    const auto grid = std::count(image.pixels.begin(), image.pixels.end(), lab::kGrid);
    check(colored > 0 && grid > 0, "clean mode retains marker and actual 3D scene");
    lab::applyPreset(scene, 3);
    scene.debug = false;
    lab::renderScene(image, scene);
    check(std::count(image.pixels.begin(), image.pixels.end(), lab::kShape) == 0, "behind marker not rasterized");
    image.clear(lab::kBackground);
    const lab::Viewport viewport{10.0, 10.0, 100.0, 100.0};
    lab::drawPointMarker(image, {110.0, 60.0}, 10, viewport, true);
    check(image.pixels[60 * lab::Framebuffer::width + 110] == lab::kBackground, "right edge is coordinate, not valid pixel");
    check(image.pixels[60 * lab::Framebuffer::width + 109] != lab::kBackground, "marker clips up to last covered pixel");
}

void timeAndInput() {
    check(close(lab::advanceFlightTime(2.0, -1.0), 2.0), "negative dt ignored");
    check(close(lab::advanceFlightTime(2.0, NAN), 2.0), "NaN dt ignored");
    check(close(lab::advanceFlightTime(2.0, 9.0), 2.1), "stalled frame capped");
    double timeA = 0.0;
    double timeB = 0.0;
    for (int i = 0; i < 60; ++i) {
        timeA = lab::advanceFlightTime(timeA, 1.0 / 60.0);
    }
    for (int i = 0; i < 20; ++i) {
        timeB = lab::advanceFlightTime(timeB, 0.05);
    }
    const auto a = lab::flightPoint(timeA);
    const auto b = lab::flightPoint(timeB);
    check(close(a.x, b.x) && close(a.y, b.y) && close(a.z, b.z), "same elapsed gives same orbit across dt partitions");
    check(close(lab::flightPoint(0.0).z, 6.0) && close(lab::flightPoint(0.0).y, 1.3), "flight analytic starting position");
    lab::Scene scene;
    const auto initial = scene.point;
    lab::advanceScene(scene, NAN);
    check(scene.point.x == initial.x && scene.point.y == initial.y && scene.point.z == initial.z, "invalid dt leaves manual point unchanged");
    lab::movePoint(scene, {0.0, 0.0, 100.0});
    check(scene.point.z == 20.0 && scene.paused, "manual bounds and pause");
    const auto before = scene.point;
    lab::movePoint(scene, {NAN, 1.0, 0.0});
    check(scene.point.x == before.x && scene.point.y == before.y, "nonfinite input rejected atomically");
}
} // namespace

int main() {
    knownProjection();
    rejectionCases();
    inverseAndAspect();
    clippingAndPixels();
    timeAndInput();
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Projection: analytic, guards, inverse, aspect, clipping, pixels and dt passed\n";
    return EXIT_SUCCESS;
}
