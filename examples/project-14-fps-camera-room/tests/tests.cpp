#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

void check(bool condition, std::string_view label) {
    if (condition) {
        std::cout << "PASS: " << label << '\n';
        return;
    }
    std::cerr << "FAIL: " << label << '\n';
    ++failures;
}

bool near(double actual, double expected, double tolerance = 1e-9) {
    return std::abs(actual - expected) <= tolerance;
}

bool nearVec3(lab::Vec3 actual, lab::Vec3 expected, double tolerance = 1e-9) {
    return near(actual.x, expected.x, tolerance) && near(actual.y, expected.y, tolerance) &&
        near(actual.z, expected.z, tolerance);
}

lab::FpsCamera simulateMovement(int framesPerSecond, lab::MoveInput input) {
    lab::FpsCamera camera{};
    const double deltaTime = 1.0 / double(framesPerSecond);
    for (int frame = 0; frame < framesPerSecond; ++frame) {
        camera = lab::advanceCamera(camera, input, 3.5, deltaTime);
    }
    return camera;
}
} // namespace

int main() {
    // Geometry tests kiểm tra room được sinh hoàn toàn trong một bộ bounds duy nhất.
    const lab::RoomBounds bounds{};
    const lab::RoomGeometry room = lab::makeRoomGeometry(bounds, 2.0);
    check(room.size() > 100, "room contains a useful segmented floor and wall grid");
    bool allEndpointsInside = true;
    for (const lab::Segment3& segment : room) {
        allEndpointsInside = allEndpointsInside && lab::roomContainsPoint(bounds, segment.from);
        allEndpointsInside = allEndpointsInside && lab::roomContainsPoint(bounds, segment.to);
    }
    check(allEndpointsInside, "every room endpoint stays inside RoomBounds");
    check(lab::makeRoomGeometry(bounds, 0.0).empty(), "invalid grid spacing creates no geometry");

    // View translation phải là world point trừ camera position.
    lab::FpsCamera translatedCamera{};
    translatedCamera.position = {1.0, 1.6, 2.0};
    const lab::Vec3 translated = lab::worldToCameraTranslation({3.0, 2.0, 8.0}, translatedCamera);
    check(nearVec3(translated, {2.0, 0.4, 6.0}), "view translation subtracts camera position");

    // Một point nằm trên forward phải đi vào đúng trục +Z của camera space.
    lab::FpsCamera orientedCamera{};
    orientedCamera.position = {1.0, 1.6, 3.0};
    orientedCamera.yaw = 32.0 * lab::kPi / 180.0;
    orientedCamera.pitch = 21.0 * lab::kPi / 180.0;
    const lab::CameraBasis orientedBasis = lab::cameraBasis(orientedCamera);
    const lab::Vec3 pointOnForward = lab::add(
        orientedCamera.position,
        lab::multiply(orientedBasis.forward, 5.0)
    );
    check(
        nearVec3(lab::worldToCamera(pointOnForward, orientedCamera), {0.0, 0.0, 5.0}),
        "inverse yaw and pitch map world forward onto camera +Z"
    );

    // Camera basis phải trực chuẩn ở pose mặc định lẫn pose tổng quát.
    check(lab::basisError(lab::FpsCamera{}) <= 1e-12, "default camera basis is orthonormal");
    check(lab::basisError(orientedCamera) <= 1e-12, "rotated camera basis is orthonormal");
    lab::FpsCamera yawNinety{};
    yawNinety.yaw = 0.5 * lab::kPi;
    check(
        nearVec3(lab::cameraBasis(yawNinety).forward, {1.0, 0.0, 0.0}),
        "yaw ninety degrees points forward along positive X"
    );

    // Normalize input giữ diagonal speed bằng straight speed và dt giữ distance theo thời gian.
    const lab::FpsCamera straight = simulateMovement(60, {0.0, 1.0});
    const lab::FpsCamera diagonal = simulateMovement(60, {1.0, 1.0});
    const double straightDistance = lab::magnitude(lab::subtract(straight.position, lab::FpsCamera{}.position));
    const double diagonalDistance = lab::magnitude(lab::subtract(diagonal.position, lab::FpsCamera{}.position));
    check(near(straightDistance, 3.5), "one second of forward input travels speed units");
    check(near(diagonalDistance, straightDistance), "diagonal movement is not faster");
    const lab::FpsCamera thirtyFps = simulateMovement(30, {0.0, 1.0});
    const lab::FpsCamera oneFortyFourFps = simulateMovement(144, {0.0, 1.0});
    check(
        near(thirtyFps.position.z, oneFortyFourFps.position.z),
        "movement distance is stable across 30 and 144 FPS"
    );

    // Mouse look và room clamp bảo vệ camera trước input cực đoan.
    const lab::FpsCamera lookedUp = lab::applyMouseLook(lab::FpsCamera{}, 100000.0, -100000.0, 0.0025);
    check(lookedUp.pitch < 0.5 * lab::kPi, "mouse look clamps pitch below ninety degrees");
    check(std::abs(lookedUp.yaw) <= lab::kPi, "mouse look wraps yaw to a bounded angle");
    lab::FpsCamera outside{};
    outside.position = {100.0, -5.0, 100.0};
    const lab::FpsCamera clamped = lab::clampCameraToRoom(outside, bounds, 1.6, 0.35);
    check(near(clamped.position.x, bounds.maxX - 0.35), "room clamp stops camera before X wall");
    check(near(clamped.position.y, 1.6), "room clamp restores fixed eye height");
    check(near(clamped.position.z, bounds.maxZ - 0.35), "room clamp stops camera before Z wall");

    // Round trip bắt lỗi dấu hoặc thứ tự trong view transform mà hình ảnh có thể che giấu.
    for (const lab::Vec3 point : {lab::Vec3{-4.0, 0.0, 6.0}, lab::Vec3{2.0, 3.0, 12.0}, lab::Vec3{5.0, 1.0, 20.0}}) {
        check(
            lab::viewRoundTripError(point, orientedCamera) <= 1e-9,
            "world-camera-world round trip restores the point"
        );
    }

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed.\n";
        return EXIT_FAILURE;
    }
    std::cout << "Project 14 validation passed.\n";
    return EXIT_SUCCESS;
}
