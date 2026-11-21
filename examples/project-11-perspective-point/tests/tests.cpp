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

void depthRuler() {
    // Camera ở Z=2: điểm tại world Z=6 nằm cách camera 4 đơn vị, không phải 6.
    const lab::Camera3D camera{{3.0, -1.0, 2.0}};
    const lab::Viewport viewport{10.0, 20.0, 800.0, 600.0};
    lab::PerspectiveLens lens;
    lens.verticalFovRadians = lab::kPi * 0.5;
    const auto reading = lab::measureDoubleDepth({4.0, -0.5, 6.0}, camera, lens, viewport);
    check(reading.has_value(), "both measurements visible");
    if (reading) {
        check(close(reading->first.x, 485.0) && close(reading->first.y, 282.5), "A in shifted viewport");
        check(close(reading->second.x, 447.5) && close(reading->second.y, 301.25), "B doubles camera depth, not world Z");
        check(close(reading->firstOffset, std::hypot(75.0, 37.5)) && close(reading->secondOffset, reading->firstOffset * 0.5), "ruler measures from optical center");
    }
    const auto centered = lab::measureDoubleDepth({3.0, -1.0, 6.0}, camera, lens, viewport);
    check(centered && close(centered->firstOffset, 0.0) && close(centered->secondOffset, 0.0), "on axis both offsets are zero");
    check(!lab::measureDoubleDepth({4.0, -0.5, 11.0}, camera, lens, viewport), "no second reading beyond far");
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
    const auto departure = image.pixels;
    const auto viewportStart = lab::viewportFor(scene);
    const auto gold = lab::projectPerspective(lab::starCatalog()[0], scene.camera, scene.lens, viewportStart);
    check(gold.screen.has_value(), "guide star visible on departure");
    if (gold.screen) {
        const int index = static_cast<int>(gold.screen->y) * image.width + static_cast<int>(gold.screen->x);
        check(image.pixels[index] == lab::starInk::color(0), "native guide color lands at projected world point");
    }
    scene.point.z = -1.0;
    lab::renderScene(image, scene);
    check(image.pixels == departure, "clean field ignores the independent test probe");
    scene.debug = true;
    lab::renderScene(image, scene);
    check(image.pixels == departure, "behind-camera probe adds no invented pixel");
    scene.debug = false;
    lab::setCameraDepth(scene, 2.0);
    lab::renderScene(image, scene);
    check(image.pixels != departure, "flight moves actual star pixels on the CPU framebuffer");
    const auto next = lab::projectPerspective(lab::starCatalog()[0], scene.camera, scene.lens, viewportStart);
    if (next.screen && gold.screen) {
        const int newIndex = static_cast<int>(next.screen->y) * image.width + static_cast<int>(next.screen->x);
        check(image.pixels[newIndex] == lab::starInk::color(0), "same star reaches a new pixel");
    } else check(false, "guide remains in view after two units");
    lab::setCameraDepth(scene, 0.0);
    lab::renderScene(image, scene);
    check(image.pixels == departure, "return flight recovers the identical sky");
    image.clear(lab::kBackground);
    const lab::Viewport viewport{10.0, 10.0, 100.0, 100.0};
    lab::drawPointMarker(image, {110.0, 60.0}, 10, viewport, true);
    check(image.pixels[60 * lab::Framebuffer::width + 110] == lab::kBackground, "right edge is coordinate, not valid pixel");
    check(image.pixels[60 * lab::Framebuffer::width + 109] != lab::kBackground, "marker clips up to last covered pixel");
}

void starfieldAndLens() {
    lab::Scene scene;
    scene.lens.verticalFovRadians = lab::kPi * 0.5;
    const lab::Viewport square{0.0, 0.0, 800.0, 800.0};
    const auto catalog = lab::makeStarCatalog();
    check(catalog.size() == 96, "same finite set of 96 world stars");
    const auto initial = lab::projectPerspective(catalog[0], scene.camera, scene.lens, square);
    check(initial.screen && close(initial.screen->x, 500.0) && close(initial.screen->y, 340.0), "independent guide at departure");
    lab::setCameraDepth(scene, 2.0);
    const auto flown = lab::projectPerspective(catalog[0], scene.camera, scene.lens, square);
    check(flown.screen && close(flown.screen->x, 600.0) && close(flown.screen->y, 280.0), "guide pixel after two units");
    for (double depth : {0.0, 2.0, 6.0, 9.0}) {
        lab::setCameraDepth(scene, depth);
        const auto axial = lab::projectPerspective(catalog[1], scene.camera, scene.lens, square);
        check(axial.screen && close(axial.screen->x, 400.0) && close(axial.screen->y, 400.0), "on-axis star stays at the optical center");
    }
    lab::setCameraDepth(scene, 10.0);
    check(!lab::projectPerspective(catalog[1], scene.camera, scene.lens, square).screen, "no pixel on or behind the eye");
    // Hai sao nằm trên cùng tia lúc đầu: zoom không tách chúng; tiến camera thì có.
    lab::setCameraDepth(scene, 0.0);
    const lab::Vec3 a{1.0, 0.0, 4.0}, b{2.0, 0.0, 8.0};
    for (double fov : {45.0, 70.0, 90.0}) {
        scene.lens.verticalFovRadians = fov * lab::kPi / 180.0;
        const auto near = lab::projectPerspective(a, scene.camera, scene.lens, square);
        const auto far = lab::projectPerspective(b, scene.camera, scene.lens, square);
        check(near.screen && far.screen && close(near.screen->x, far.screen->x), "optical zoom preserves a shared ray");
    }
    lab::setCameraDepth(scene, 2.0);
    const auto near = lab::projectPerspective(a, scene.camera, scene.lens, square);
    const auto far = lab::projectPerspective(b, scene.camera, scene.lens, square);
    check(near.screen && far.screen && close(near.screen->x - far.screen->x, 200.0 / 3.0), "dolly separates near and far on the original ray");
    for (std::size_t i = 0; i < catalog.size(); ++i) {
        const auto fixed = lab::starCatalog()[i];
        check(fixed.x == catalog[i].x && fixed.y == catalog[i].y && fixed.z == catalog[i].z, "camera never changes world stars");
    }
}

void timeAndInput() {
    lab::Scene a, b;
    for (int i = 0; i < 60; ++i) lab::advanceScene(a, 1.0 / 60.0);
    for (int i = 0; i < 20; ++i) lab::advanceScene(b, 0.05);
    check(close(a.elapsed, 1.0) && close(a.camera.position.z, 2.0) && close(a.camera.position.z, b.camera.position.z), "same flight across dt partitions");
    for (int i = 0; i < 20; ++i) lab::advanceScene(b, 0.05, -1.0);
    check(close(b.camera.position.z, 0.0), "fly back to departure");
    lab::Scene scene;
    const auto initial = scene.point;
    for (double dt : {-1.0, 0.0, std::numeric_limits<double>::quiet_NaN()}) lab::advanceScene(scene, dt);
    lab::advanceScene(scene, 0.1, NAN);
    check(scene.camera.position.z == 0.0 && scene.elapsed == 0.0, "reject nonfinite input and nonpositive dt");
    lab::advanceScene(scene, 9.0);
    check(close(scene.elapsed, 0.1) && close(scene.camera.position.z, 0.2), "stalled frame is capped");
    check(scene.point.x == initial.x && scene.point.y == initial.y && scene.point.z == initial.z, "observer moves, world point does not");
    scene.forwardHeld = true;
    check(lab::flightDirection(scene) == 1.0, "W flies forward");
    scene.backwardHeld = true;
    check(lab::flightDirection(scene) == 0.0, "W and S cancel");
    scene.forwardHeld = false;
    check(lab::flightDirection(scene) == -1.0, "only S flies backward");
    lab::stopFlight(scene);
    check(lab::flightDirection(scene) == 0.0, "lost focus clears both controls");
    lab::setCameraDepth(scene, 11.95);
    scene.paused = false;
    lab::advanceScene(scene, 0.1);
    check(scene.paused && scene.camera.position.z == 12.0, "stop at end of finite field");
    lab::movePoint(scene, {0.0, 0.0, 100.0});
    check(scene.point.z == 20.0 && scene.paused, "manual probe bounded and paused");
    const auto before = scene.point;
    lab::movePoint(scene, {NAN, 1.0, 0.0});
    check(scene.point.x == before.x && scene.point.y == before.y, "nonfinite probe input rejected atomically");
}
} // namespace

int main() {
    knownProjection();
    depthRuler();
    rejectionCases();
    inverseAndAspect();
    clippingAndPixels();
    starfieldAndLens();
    timeAndInput();
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Starfield: CPU pixels, immutable sky, projection, flight input, guards, inverse and dt passed\n";
    return EXIT_SUCCESS;
}
