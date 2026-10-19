#include "view.hpp"
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

bool near(double left, double right, double epsilon = 1e-8) {
    return std::isfinite(left) && std::isfinite(right) && std::abs(left - right) <= epsilon;
}

bool near(lab::Vec3 left, lab::Vec3 right) {
    return near(left.x, right.x) && near(left.y, right.y) && near(left.z, right.z);
}

void check(bool condition, std::string_view label) {
    if (!condition) {
        ++failures;
        std::cerr << "FAILED: " << label << '\n';
    }
}

// Heron không gọi cross/triangleArea, dùng ba độ dài cạnh.
double heron(const lab::Triangle& triangle) {
    const double a = lab::magnitude(lab::subtract(triangle.p1, triangle.p0));
    const double b = lab::magnitude(lab::subtract(triangle.p2, triangle.p1));
    const double c = lab::magnitude(lab::subtract(triangle.p0, triangle.p2));
    const double half = (a + b + c) * 0.5;
    return std::sqrt(std::max(0.0, half * (half - a) * (half - b) * (half - c)));
}
} // namespace

int main() {
    // Nghiệm biết trước bắt lỗi dấu/toán tử trước khi kiểm invariant.
    check(near(lab::cross({1.0, 0.0, 0.0}, {0.0, 1.0, 0.0}), {0.0, 0.0, 1.0}), "X cross Y");
    check(near(lab::cross({0.0, 1.0, 0.0}, {1.0, 0.0, 0.0}), {0.0, 0.0, -1.0}), "Y cross X");
    check(near(lab::cross({1.0, 2.0, 3.0}, {4.0, -2.0, 1.0}), {8.0, 11.0, -10.0}), "three components numeric oracle");
    lab::Scene scene;
    lab::applyPreset(scene, 1);
    check(near(lab::triangleRawNormal(scene.triangle), {0.0, 0.0, 12.0}), "3-4 cross");
    check(near(lab::triangleArea(scene.triangle), 6.0), "3-4 area");
    check(near(lab::magnitude(lab::triangleUnitNormal(scene.triangle)), 1.0), "unit length");

    for (int sample = 0; sample < 61; ++sample) {
        lab::Triangle triangle{{-0.7, 0.2, -0.3}, {(sample % 7 - 3) * 0.4, (sample % 9 - 4) * 0.3, (sample % 5 - 2) * 0.5}, {(sample % 11 - 5) * 0.3, (sample % 13 - 6) * 0.25, (sample % 3 - 1) * 0.7}};
        const lab::Edges edges = lab::triangleEdges(triangle);
        const lab::Vec3 normal = lab::triangleRawNormal(triangle);
        check(near(lab::dot(normal, edges.a), 0.0), "cross perpendicular A");
        check(near(lab::dot(normal, edges.b), 0.0), "cross perpendicular B");
        check(near(lab::triangleArea(triangle), heron(triangle), 1e-7), "area independent Heron");
        const lab::Triangle reversed = lab::reverseWinding(triangle);
        check(near(lab::triangleRawNormal(reversed), lab::scale(normal, -1.0)), "winding flips cross");
        check(near(lab::triangleArea(reversed), lab::triangleArea(triangle)), "winding preserves area");
        check(lab::orthogonalityError(triangle) < 1e-8, "relative error bounded");
    }
    for (const int index : {2, 3, 4}) {
        lab::applyPreset(scene, index);
        check(!lab::normalHasDirection(scene.triangle), "degenerate and near-collinear have no trusted direction");
        check(near(lab::triangleUnitNormal(scene.triangle), {}), "safe fallback is finite");
    }
    check(lab::triangleArea(scene.triangle) > 0.0, "near-collinear measured area not forced zero");
    const lab::Triangle small{{}, {1e-4, 0.0, 0.0}, {0.0, 1e-4, 0.0}};
    check(lab::normalHasDirection(small), "small perpendicular edges can still define a normal");

    // Perspective oracle độc lập: ở yaw=pitch=0, eye=(0,0,radius).
    const lab::Camera camera{0.0, 0.0, 9.0};
    check(near(lab::worldToCamera({1.0, 2.0, 3.0}, camera), {1.0, 2.0, 6.0}), "camera basis numeric oracle");
    const auto nearPoint = lab::projectPerspective({1.0, 0.0, 2.0});
    const auto farPoint = lab::projectPerspective({1.0, 0.0, 4.0});
    check(nearPoint.visible && farPoint.visible, "perspective points visible");
    check(near(nearPoint.screen.x - 550.0, 2.0 * (farPoint.screen.x - 550.0)), "far point appears smaller");
    check(!lab::projectPerspective({1.0, 1.0, 0.0}).visible, "reject eye plane before divide");
    check(!lab::projectPerspective({0.0, 0.0, 31.0}).visible, "reject beyond far plane");
    lab::Vec3 start{0.0, 0.0, -1.0};
    lab::Vec3 end{2.0, 0.0, 1.0};
    check(lab::clipDepth(start, end) && near(start.x, 1.2) && start.z == 0.2, "near clipping analytic intersection");
    check(lab::projectPerspective(start).visible, "clipped boundary remains visible");
    start = {0.0, 0.0, 29.0};
    end = {2.0, 0.0, 31.0};
    check(lab::clipDepth(start, end) && near(end.x, 1.0) && end.z == 30.0, "far clipping");
    start = {0.0, 0.0, -1.0};
    end = {1.0, 1.0, 0.0};
    check(!lab::clipDepth(start, end), "both behind reject");
    start = {std::numeric_limits<double>::quiet_NaN(), 0.0, 1.0};
    check(!lab::clipDepth(start, end), "nonfinite segment rejected");

    lab::applyPreset(scene, 1);
    scene.camera = camera;
    const lab::Vec3 toward = lab::subtract(lab::cameraEye(scene.camera), lab::triangleCentroid(scene.triangle));
    check(lab::facingAmount(scene.triangle, toward) > 0.0, "front toward actual eye");
    check(lab::facingAmount(lab::reverseWinding(scene.triangle), toward) < 0.0, "back after reverse");
    const auto triangleBefore = scene.triangle;
    lab::orbit(scene.camera, 9999.0, 9999.0);
    check(near(scene.triangle.p0, triangleBefore.p0), "orbit does not edit geometry");
    check(scene.camera.pitch <= 1.2 && std::abs(scene.camera.yaw) <= lab::kPi, "camera clamps and wraps");
    scene.selected = 1;
    lab::moveVertex(scene, {99.0, -99.0, 99.0});
    check(near(scene.triangle.p1, {2.0, -2.0, 2.0}), "vertex clamp");
    const double yaw = scene.camera.yaw;
    lab::advanceScene(scene, -1.0);
    check(scene.camera.yaw == yaw, "negative dt ignored");

    // Kiểm raster thật: floor, axes, A/B, raw và unit đều có pixel trong final.
    lab::applyPreset(scene, 0);
    lab::Framebuffer image;
    lab::renderScene(image, scene);
    for (const auto color : {lab::kAxisX, lab::kAxisY, lab::kShape, 0xFFB454FFu, 0x53DFEFFFu, lab::kMarker, 0xE6A0FFFFu}) {
        bool found = false;
        for (const auto pixel : image.pixels) {
            if (pixel == color) {
                found = true;
            }
        }
        check(found, "required visible layer has pixels");
    }
    lab::applyPreset(scene, 2);
    lab::renderScene(image, scene);
    bool fakeUnit = false;
    for (const auto pixel : image.pixels) {
        if (pixel == 0xE6A0FFFFu) {
            fakeUnit = true;
        }
    }
    check(!fakeUnit, "no fake unit arrow for degenerate triangle");
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Project 10 math/camera/raster checks passed\n";
    return EXIT_SUCCESS;
}
