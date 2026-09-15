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

bool nearlyEqual(lab::Vec2 left, lab::Vec2 right, double epsilon = 1e-9) {
    return nearlyEqual(left.x, right.x, epsilon) && nearlyEqual(left.y, right.y, epsilon);
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
    const lab::Camera3D camera{{1.0, -2.0, 0.5}};
    const lab::PerspectiveLens lens{60.0 * lab::kPi / 180.0};
    constexpr int width = 960;
    constexpr int height = 640;

    // Khóa các phép đổi hệ tọa độ trước khi kiểm tra cả projection pipeline.
    const lab::Vec3 worldPoint{3.0, 1.0, 6.5};
    const lab::Vec3 cameraPoint = lab::worldToCamera(worldPoint, camera);
    check(nearlyEqual(cameraPoint, {2.0, 3.0, 6.0}), "world to camera translation");
    check(nearlyEqual(lab::cameraToWorld(cameraPoint, camera), worldPoint), "camera to world round trip");
    check(nearlyEqual(lab::perspectiveDivide({2.0, 1.0, 4.0}), {0.5, 0.25}), "perspective divide");

    // Một point trên trục nhìn phải nằm đúng tâm; tăng depth làm độ lệch giảm một nửa.
    const lab::ProjectionResult center = lab::projectPerspective(
        lab::cameraToWorld({0.0, 0.0, 4.0}, camera),
        camera,
        lens,
        0.5,
        width,
        height
    );
    check(center.status == lab::ProjectionStatus::Visible, "center point is visible");
    check(nearlyEqual(center.screen, {width * 0.5, height * 0.5}), "view axis reaches screen center");

    const lab::Vec2 nearNdc = lab::cameraToNdc({1.0, 0.5, 4.0}, lens, 1.5);
    const lab::Vec2 farNdc = lab::cameraToNdc({1.0, 0.5, 8.0}, lens, 1.5);
    check(nearlyEqual(farNdc.x, nearNdc.x * 0.5), "double depth halves horizontal offset");
    check(nearlyEqual(farNdc.y, nearNdc.y * 0.5), "double depth halves vertical offset");

    const lab::PerspectiveLens wideLens{90.0 * lab::kPi / 180.0};
    const lab::Vec2 wideNdc = lab::cameraToNdc({1.0, 0.5, 4.0}, wideLens, 1.5);
    check(std::abs(wideNdc.x) < std::abs(nearNdc.x), "wider FOV moves point toward center");
    check(std::abs(wideNdc.y) < std::abs(nearNdc.y), "vertical FOV controls vertical scale");

    // NDC và pixel phải đổi qua lại được, kể cả quy ước trục Y màn hình hướng xuống.
    const lab::Vec2 sampleNdc{0.35, -0.4};
    const lab::Vec2 sampleScreen = lab::ndcToScreen(sampleNdc, width, height);
    check(nearlyEqual(lab::screenToNdc(sampleScreen, width, height), sampleNdc), "NDC screen round trip");
    check(nearlyEqual(lab::ndcToScreen({-1.0, 1.0}, width, height), {0.0, 0.0}), "top left NDC corner");
    check(nearlyEqual(lab::ndcToScreen({1.0, -1.0}, width, height), {width, height}), "bottom right NDC corner");

    // Kiểm tra đúng thứ tự bốn trạng thái trước khi bất kỳ pixel nào được ghi.
    const auto behind = lab::projectPerspective({0.0, 0.0, -1.0}, {}, lens, 0.5, width, height);
    const auto beforeNear = lab::projectPerspective({0.0, 0.0, 0.25}, {}, lens, 0.5, width, height);
    const auto onNear = lab::projectPerspective({0.0, 0.0, 0.5}, {}, lens, 0.5, width, height);
    const auto outside = lab::projectPerspective({20.0, 0.0, 5.0}, {}, lens, 0.5, width, height);
    check(behind.status == lab::ProjectionStatus::BehindCamera, "behind-camera status");
    check(beforeNear.status == lab::ProjectionStatus::BeforeNearPlane, "before-near status");
    check(onNear.status == lab::ProjectionStatus::Visible, "near plane boundary is visible");
    check(outside.status == lab::ProjectionStatus::OutsideFrustum, "outside-frustum status");

    // Phép đổi ngược tại depth cố định giúp kéo point và cũng là phép kiểm chứng độc lập.
    const lab::Vec3 fixedDepthPoint{1.2, -0.7, 5.0};
    const lab::Vec2 fixedDepthNdc = lab::cameraToNdc(fixedDepthPoint, lens, double(width) / height);
    const lab::Vec2 fixedDepthScreen = lab::ndcToScreen(fixedDepthNdc, width, height);
    check(
        nearlyEqual(lab::screenToCameraAtDepth(fixedDepthScreen, 5.0, lens, width, height), fixedDepthPoint),
        "screen to camera at fixed depth"
    );
    check(lab::projectionRoundTripError(worldPoint, camera, lens, width, height) < 1e-9, "projection round trip error");

    check(nearlyEqual(lab::advanceFlightTime(2.0, -1.0), 2.0), "negative delta time is clamped");
    check(nearlyEqual(lab::advanceFlightTime(2.0, 1.0), 2.1), "large delta time is clamped");
    const lab::Vec3 flight = lab::flightPoint(2.5);
    check(std::isfinite(flight.x) && std::isfinite(flight.y) && std::isfinite(flight.z), "flight path stays finite");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 11 validation checks passed\n";
    return EXIT_SUCCESS;
}
