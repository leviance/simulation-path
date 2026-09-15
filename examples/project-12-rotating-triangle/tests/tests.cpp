#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

bool nearlyEqual(double left, double right, double epsilon = 1e-9) {
    return std::abs(left - right) <= epsilon;
}

bool nearlyEqual(lab::Vec3 left, lab::Vec3 right, double epsilon = 1e-9) {
    return nearlyEqual(left.x, right.x, epsilon) && nearlyEqual(left.y, right.y, epsilon) &&
        nearlyEqual(left.z, right.z, epsilon);
}

void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    std::cerr << "FAILED: " << label << '\n';
    ++failures;
}
} // namespace

int main() {
    const lab::Triangle3 worldTriangle = lab::defaultWorldTriangle();
    const lab::Vec3 pivot = lab::triangleCentroid(worldTriangle);
    const lab::Triangle3 localTriangle = lab::toLocalTriangle(worldTriangle);

    // Local/world split phải giữ nguyên hình và đặt centroid local đúng tại gốc.
    check(nearlyEqual(pivot, {0.0, 0.0, 6.0}), "default triangle pivot");
    check(nearlyEqual(lab::triangleCentroid(localTriangle), {}), "local centroid is origin");
    const lab::Triangle3 restoredWorld = lab::translateTriangle(localTriangle, pivot);
    check(nearlyEqual(restoredWorld.a, worldTriangle.a), "local to world vertex A");
    check(nearlyEqual(restoredWorld.b, worldTriangle.b), "local to world vertex B");
    check(nearlyEqual(restoredWorld.c, worldTriangle.c), "local to world vertex C");

    // Ba phép quay 90° khóa dấu sin/cos theo quy tắc bàn tay phải.
    const double quarterTurn = lab::kPi * 0.5;
    check(nearlyEqual(lab::rotateX({1.0, 2.0, 3.0}, quarterTurn), {1.0, -3.0, 2.0}), "rotate X quarter turn");
    check(nearlyEqual(lab::rotateY({1.0, 2.0, 3.0}, quarterTurn), {3.0, 2.0, -1.0}), "rotate Y quarter turn");
    check(nearlyEqual(lab::rotateZ({1.0, 2.0, 3.0}, quarterTurn), {-2.0, 1.0, 3.0}), "rotate Z quarter turn");

    const lab::EulerAngles angles{0.35, -0.70, 0.25};
    const lab::Vec3 sample{1.2, -0.8, 0.4};
    const lab::Vec3 xyz = lab::rotateEuler(sample, angles, lab::RotationOrder::Xyz);
    const lab::Vec3 zyx = lab::rotateEuler(sample, angles, lab::RotationOrder::Zyx);
    check(lab::magnitude(lab::subtract(xyz, zyx)) > 1e-4, "rotation order changes orientation");
    check(nearlyEqual(lab::magnitude(xyz), lab::magnitude(sample)), "XYZ preserves vector length");
    check(nearlyEqual(lab::magnitude(zyx), lab::magnitude(sample)), "ZYX preserves vector length");

    // Mouse mapping và pitch clamp được kiểm tra không cần SDL event loop.
    const lab::EulerAngles dragged = lab::applyMouseDrag({}, 20.0, -10.0, 0.01);
    check(nearlyEqual(dragged.yaw, 0.2), "mouse X changes yaw");
    check(nearlyEqual(dragged.pitch, 0.1), "mouse Y changes pitch with screen convention");
    const lab::EulerAngles clamped = lab::applyMouseDrag({}, 0.0, -10000.0, 0.01);
    const lab::EulerAngles clampedNegative = lab::applyMouseDrag({}, 0.0, 10000.0, 0.01);
    check(nearlyEqual(clamped.pitch, 89.0 * lab::kPi / 180.0), "mouse pitch clamps at positive limit");
    check(
        nearlyEqual(clampedNegative.pitch, -89.0 * lab::kPi / 180.0),
        "mouse pitch clamps at negative limit"
    );

    // Rotation không được làm méo cạnh và inverse phải quay về đúng point.
    const lab::Triangle3 rotatedXyz = lab::rotateTriangle(localTriangle, angles, lab::RotationOrder::Xyz);
    const lab::Triangle3 rotatedZyx = lab::rotateTriangle(localTriangle, angles, lab::RotationOrder::Zyx);
    check(lab::maximumEdgeLengthError(localTriangle, rotatedXyz) < 1e-9, "XYZ edge lengths invariant");
    check(lab::maximumEdgeLengthError(localTriangle, rotatedZyx) < 1e-9, "ZYX edge lengths invariant");
    check(lab::rotationRoundTripError(sample, angles, lab::RotationOrder::Xyz) < 1e-9, "XYZ round trip");
    check(lab::rotationRoundTripError(sample, angles, lab::RotationOrder::Zyx) < 1e-9, "ZYX round trip");

    const lab::EulerAngles velocity{1.0, 2.0, 3.0};
    const lab::EulerAngles noBackwardTime = lab::advanceEulerAngles({}, velocity, -1.0);
    const lab::EulerAngles clampedFrame = lab::advanceEulerAngles({}, velocity, 1.0);
    check(nearlyEqual(noBackwardTime.pitch, 0.0), "negative delta time is clamped");
    check(nearlyEqual(clampedFrame.pitch, 0.1), "large delta time is clamped");
    check(nearlyEqual(clampedFrame.yaw, 0.2), "clamped frame updates yaw");

    // Projection của cả triangle chỉ visible khi cả ba vertex đều hợp lệ.
    const lab::Camera3D camera{};
    const lab::PerspectiveLens lens{};
    const lab::TriangleProjection visible = lab::projectTriangle(worldTriangle, camera, lens, 0.5, 960, 640);
    lab::Triangle3 behindTriangle = worldTriangle;
    behindTriangle.a = {0.0, 0.0, -1.0};
    const lab::TriangleProjection behind = lab::projectTriangle(
        behindTriangle,
        camera,
        lens,
        0.5,
        960,
        640
    );
    lab::Triangle3 nearTriangle = worldTriangle;
    nearTriangle.a = {0.0, 0.0, 0.4};
    const lab::TriangleProjection beforeNear = lab::projectTriangle(
        nearTriangle,
        camera,
        lens,
        0.5,
        960,
        640
    );
    lab::Triangle3 outsideTriangle = worldTriangle;
    outsideTriangle.a = {20.0, 0.0, 6.0};
    const lab::TriangleProjection outside = lab::projectTriangle(
        outsideTriangle,
        camera,
        lens,
        0.5,
        960,
        640
    );
    check(visible.visible, "default projected triangle is visible");
    check(!behind.visible, "one vertex behind camera hides complete triangle");
    check(behind.a.status == lab::ProjectionStatus::BehindCamera, "behind status is preserved");
    check(!beforeNear.visible, "one vertex before near plane hides complete triangle");
    check(
        beforeNear.a.status == lab::ProjectionStatus::BeforeNearPlane,
        "before-near status is preserved"
    );
    check(!outside.visible, "one vertex outside frustum hides complete triangle");
    check(outside.a.status == lab::ProjectionStatus::OutsideFrustum, "outside status is preserved");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 12 validation checks passed\n";
    return EXIT_SUCCESS;
}
