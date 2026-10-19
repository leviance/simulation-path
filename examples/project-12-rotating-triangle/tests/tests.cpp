#include "view.hpp"
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
// Explicit check vẫn hoạt động khi Release bật NDEBUG.
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

bool close(lab::Vec3 a, lab::Vec3 b, double epsilon = 1e-9) {
    return close(a.x, b.x, epsilon) && close(a.y, b.y, epsilon) && close(a.z, b.z, epsilon);
}

// Các expected tính tay khóa dấu và thứ tự, không sinh từ inverse.
void numericRotationOracles() {
    const lab::Vec3 p{1.0, 2.0, 3.0};
    const double quarter = lab::kPi * 0.5;
    check(close(lab::rotateX(p, quarter), {1.0, -3.0, 2.0}), "X90 numeric oracle");
    check(close(lab::rotateY(p, quarter), {3.0, 2.0, -1.0}), "Y90 numeric oracle");
    check(close(lab::rotateZ(p, quarter), {-2.0, 1.0, 3.0}), "Z90 numeric oracle");
    check(close(lab::rotateEuler(p, {quarter, quarter, 0.0}, lab::RotationOrder::Xyz), {2.0, -3.0, -1.0}), "XYZ X90 then Y90 oracle");
    check(close(lab::rotateEuler(p, {quarter, quarter, 0.0}, lab::RotationOrder::Zyx), {3.0, 1.0, 2.0}), "ZYX Y90 then X90 oracle");
    for (double angle : {0.0, 2.0 * lab::kPi}) {
        check(close(lab::rotateX(p, angle), p), "X zero/full turn");
        check(close(lab::rotateY(p, angle), p), "Y zero/full turn");
        check(close(lab::rotateZ(p, angle), p), "Z zero/full turn");
    }
}

// Invariant hình học bổ sung cho oracle số, không thay thế nó.
void geometryAndNormal() {
    const auto original = lab::defaultWorldTriangle();
    const auto local = lab::toLocalTriangle(original);
    check(close(lab::triangleCentroid(original), {0.0, 0.0, 6.0}), "centroid numeric oracle");
    check(close(lab::triangleCentroid(local), {}), "local centroid origin");
    check(close(lab::triangleRawNormal(original), {-1.71, 0.51, 6.45}), "raw cross numeric oracle");
    for (auto order : {lab::RotationOrder::Xyz, lab::RotationOrder::Zyx}) {
        for (double angle : {-2.0, -0.5, 0.0, 0.7, 2.5}) {
            const lab::EulerAngles angles{angle, 0.7, -0.3};
            const auto rotated = lab::rotateTriangle(local, angles, order);
            const auto world = lab::translateTriangle(rotated, {1.0, -1.0, 7.0});
            check(lab::maximumEdgeLengthError(local, rotated) < 1e-9, "three edge lengths invariant");
            check(close(lab::triangleCentroid(world), {1.0, -1.0, 7.0}), "rotation around centroid then translate");
            check(lab::rotationRoundTripError(local.a, angles, order) < 1e-9, "inverse in reversed order");
            check(lab::normalRotationError(local, rotated, angles, order) < 1e-9, "normal from cross agrees with rotated original");
            check(close(lab::magnitude(lab::triangleUnitNormal(world)), 1.0), "unit normal length");
            check(close(lab::triangleRawNormal(world), lab::triangleRawNormal(rotated)), "translation does not rotate normal");
        }
    }
    check(!lab::normalHasDirection({{}, {}, {1.0, 0.0, 0.0}}), "degenerate triangle has no normal direction");
}

// Kiểm input và thời gian không cần khởi tạo SDL hoặc mở window.
void inputAndClock() {
    const auto angles = lab::applyMouseDrag({}, 20.0, -10.0, 0.01);
    check(close(angles.yaw, 0.2) && close(angles.pitch, 0.1), "mouse delta signs");
    check(close(lab::applyMouseDrag({}, 0.0, -200.0, 0.01).pitch, 2.0), "object pitch passes 90 degrees");
    check(close(lab::applyMouseDrag({}, NAN, 1.0, 0.01).yaw, 0.0), "nonfinite delta rejected");
    check(close(lab::advanceEulerAngles({}, {1.0, 2.0, 3.0}, NAN).pitch, 0.0), "nonfinite dt rejected");
    check(close(lab::advanceEulerAngles({}, {1.0, 2.0, 3.0}, 5.0).yaw, 0.2), "stalled frame capped");
    lab::EulerAngles a{};
    lab::EulerAngles b{};
    for (int i = 0; i < 60; ++i) {
        a = lab::advanceEulerAngles(a, {0.35, 0.55, 0.2}, 1.0 / 60.0);
    }
    for (int i = 0; i < 20; ++i) {
        b = lab::advanceEulerAngles(b, {0.35, 0.55, 0.2}, 0.05);
    }
    check(close(a.pitch, b.pitch) && close(a.yaw, b.yaw) && close(a.roll, b.roll), "equal simulation time independent of dt partition");
    lab::Scene scene;
    lab::moveModel(scene, {NAN, 1.0, 0.0});
    check(close(scene.position, {0.0, 0.0, 6.0}), "invalid model delta atomic");
    lab::moveModel(scene, {100.0, 100.0, 100.0});
    check(close(scene.position, {4.0, 4.0, 15.0}), "model bounds");
}

// Pixel oracle xác nhận geometry chính vẫn được vẽ khi tắt debug.
void projectionAndPixels() {
    lab::Scene scene;
    auto projection = lab::projectTriangle(lab::worldTriangle(scene), scene.camera, scene.lens, lab::viewportFor());
    check(projection.allVisible, "default triangle projects");
    const lab::Viewport viewport{10.0, 20.0, 800.0, 600.0};
    auto lens = scene.lens;
    lens.verticalFovRadians = lab::kPi * 0.5;
    const auto oracle = lab::projectPerspective({1.0, 0.5, 4.0}, scene.camera, lens, viewport);
    check(oracle.screen && close(oracle.screen->x, 485.0) && close(oracle.screen->y, 282.5), "P11 projection retained");
    lab::applyPreset(scene, 3);
    projection = lab::projectTriangle(lab::worldTriangle(scene), scene.camera, scene.lens, lab::viewportFor());
    check(!projection.allVisible && projection.vertices[0].status == lab::ProjectionStatus::BeforeNearPlane, "near preset reproduces unsafe vertex");
    lab::Framebuffer image;
    lab::applyPreset(scene, 2);
    lab::renderScene(image, scene);
    check(std::count(image.pixels.begin(), image.pixels.end(), lab::kMarker) > 0, "normal arrow rendered");
    scene.debug = false;
    lab::renderScene(image, scene);
    check(std::count(image.pixels.begin(), image.pixels.end(), lab::kMarker) == 0, "debug normal hidden");
    check(std::count(image.pixels.begin(), image.pixels.end(), 0xFFB454FFu) > 0, "clean triangle retained");
    check(std::count(image.pixels.begin(), image.pixels.end(), lab::kGrid) > 0, "clean actual depth grid retained");
    lab::Scene partial;
    const lab::Triangle3 crossing{{-0.1, 0.0, 0.2}, {0.5, -0.5, 2.0}, {0.0, 0.5, 2.0}};
    const auto result = lab::projectTriangle(crossing, partial.camera, partial.lens, lab::viewportFor());
    image.clear(lab::kBackground);
    lab::drawProjectedTriangle(image, crossing, result, partial);
    check(!result.allVisible && std::count(image.pixels.begin(), image.pixels.end(), lab::kShape) > 0, "one rejected vertex does not discard every edge");
}
} // namespace

int main() {
    numericRotationOracles();
    geometryAndNormal();
    inputAndClock();
    projectionAndPixels();
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Rotation, normal, projection, input and pixel oracles passed\n";
    return EXIT_SUCCESS;
}
