#include "framebuffer.hpp"
#include "lab.hpp"
#include "measurement.hpp"
#include <array>
#include <climits>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

bool nearlyEqual(double left, double right, double epsilon = 1e-8) {
    return std::abs(left - right) <= epsilon;
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
    // Kiểm input thật: app cũng gọi directionFromKeys, không chỉ test normalize riêng.
    const lab::Vec2 right = lab::directionFromKeys(false, true, false, false);
    const lab::Vec2 opposed = lab::directionFromKeys(true, true, true, true);
    const lab::Vec2 diagonal = lab::directionFromKeys(false, true, true, false);
    check(nearlyEqual(right.x, 1.0) && nearlyEqual(right.y, 0.0), "D points right");
    check(nearlyEqual(lab::length(opposed), 0.0), "opposite keys cancel");
    check(nearlyEqual(lab::length(diagonal), 1.0), "keyboard diagonal has unit length");
    check(diagonal.x > 0.0 && diagonal.y < 0.0, "W+D points up-right");
    check(nearlyEqual(lab::length(lab::normalize({})), 0.0), "zero direction stays finite");

    // Cùng tổng thời gian, các dãy dt phải gọi đúng update của ứng dụng.
    std::array<double, 150> thirtyFps{};
    thirtyFps.fill(1.0 / 30.0);
    std::array<double, 300> sixtyFps{};
    sixtyFps.fill(1.0 / 60.0);
    std::array<double, 600> oneHundredTwentyFps{};
    oneHundredTwentyFps.fill(1.0 / 120.0);
    constexpr double expectedDistance = 900.0;
    check(nearlyEqual(lab::simulate(thirtyFps), expectedDistance), "30 FPS travels 900 px");
    check(nearlyEqual(lab::simulate(sixtyFps), expectedDistance), "60 FPS travels 900 px");
    check(nearlyEqual(lab::simulate(oneHundredTwentyFps), expectedDistance), "120 FPS travels 900 px");
    const std::array unevenTimeline{0.010, 0.020, 0.005, 0.025, 0.040};
    check(nearlyEqual(lab::simulate(unevenTimeline), 18.0), "uneven 0.1-second timeline travels 18 px");

    lab::Vec2 diagonalPosition{};
    const lab::Vec2 diagonalVelocity = lab::velocityFromDirection(diagonal, 180.0);
    for (double dt : sixtyFps) {
        lab::update(diagonalPosition, diagonalVelocity, dt);
    }
    check(nearlyEqual(lab::length(diagonalPosition), expectedDistance), "keyboard diagonal travels 900 px");

    // Clamp là quy tắc có đánh đổi: 0.2 giây chỉ mô phỏng 0.05 giây.
    lab::Vec2 position{};
    lab::update(position, {100.0, 0.0}, 0.2);
    check(nearlyEqual(position.x, 5.0), "large dt is clamped to 0.05 seconds");
    lab::update(position, {100.0, 0.0}, -1.0);
    check(nearlyEqual(position.x, 5.0), "negative dt is clamped to zero");
    lab::update(position, {100.0, 0.0}, std::numeric_limits<double>::quiet_NaN());
    lab::update(position, {100.0, 0.0}, std::numeric_limits<double>::infinity());
    check(nearlyEqual(position.x, 5.0), "nonfinite dt cannot poison position");
    lab::update(position, {100.0, 0.0}, lab::kMaximumDeltaTime);
    check(nearlyEqual(position.x, 10.0), "dt at clamp boundary is retained");

    // Biên áp dụng sau update và trước khi đo quãng đường của player.
    lab::Vec2 outside{-10.0, 999.0};
    lab::clampPlayer(outside, 960, 540, 34);
    check(nearlyEqual(outside.x, 0.0) && nearlyEqual(outside.y, 506.0), "player fits both viewport edges");
    lab::clampPlayer(outside, 20, 20, 34);
    check(nearlyEqual(lab::length(outside), 0.0), "tiny viewport never inverts clamp range");

    // Hàm tô hình phải chọn đúng số pixel và không tràn ở mép hoặc int cực trị.
    lab::Framebuffer framebuffer;
    framebuffer.clear(0);
    lab::fillRectangle(framebuffer, 2, 3, 34, 34, 1);
    check(std::count(framebuffer.pixels.begin(), framebuffer.pixels.end(), 1u) == 34 * 34, "rectangle fills exactly width times height pixels");
    check(framebuffer.pixels[3 * lab::Framebuffer::width + 2] == 1, "rectangle includes top-left");
    check(framebuffer.pixels[3 * lab::Framebuffer::width + 36] == 0, "rectangle excludes right edge");
    framebuffer.clear(0);
    lab::fillRectangle(framebuffer, -2, -1, 4, 3, 1);
    check(std::count(framebuffer.pixels.begin(), framebuffer.pixels.end(), 1u) == 4, "rectangle clips at top-left");
    lab::fillRectangle(framebuffer, INT_MAX, INT_MAX, INT_MAX, INT_MAX, 1);
    lab::fillRectangle(framebuffer, INT_MIN, INT_MIN, INT_MAX, INT_MAX, 1);
    lab::fillRectangle(framebuffer, 0, 0, -1, 4, 1);
    check(std::count(framebuffer.pixels.begin(), framebuffer.pixels.end(), 1u) == 4, "extreme or invalid rectangles do not write");
    framebuffer.clear(0);
    lab::fillRectangle(framebuffer, 959, 539, 34, 34, 1);
    check(std::count(framebuffer.pixels.begin(), framebuffer.pixels.end(), 1u) == 1, "rectangle clips at bottom-right");

    // Limiter kiểm trước phép chia và trừ, không để unsigned underflow.
    check(lab::remainingFrameNs(60, 4'000'000) == 12'666'666, "60 FPS sleeps only remaining budget");
    check(lab::remainingFrameNs(60, 20'000'000) == 0, "late frame never requests huge sleep");
    check(lab::remainingFrameNs(0, 0) == 0, "uncapped never divides by zero");
    check(lab::remainingFrameNs(-1, 0) == 0, "negative FPS is safely uncapped");
    check(lab::remainingFrameNs(120, 8'333'333) == 0, "exact budget requests no sleep");

    // Phép đo B chạy đúng 5 giây, không dùng position bị clamp ở biên cửa sổ.
    lab::Measurement measurement;
    lab::advanceMeasurement(measurement, 1.0);
    check(nearlyEqual(measurement.elapsed, 0.0), "idle measurement does not advance");
    measurement.start();
    for (int frame = 0; frame < 167; ++frame) {
        lab::advanceMeasurement(measurement, 0.03);
    }
    check(!measurement.running && nearlyEqual(measurement.elapsed, 5.0), "measurement clips final partial frame to five seconds");
    check(nearlyEqual(measurement.distance, 900.0), "measurement uses actual update for 900 px");
    lab::advanceMeasurement(measurement, 1.0);
    check(nearlyEqual(measurement.distance, 900.0), "finished measurement stays fixed");
    measurement.start();
    lab::advanceMeasurement(measurement, 0.2);
    check(nearlyEqual(measurement.distance, 9.0), "measurement exposes clamped movement");
    check(nearlyEqual(measurement.discarded, 0.15), "measurement reports discarded time");
    measurement.start();
    check(measurement.running && nearlyEqual(measurement.distance, 0.0), "restart clears previous result");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 02 validation checks passed\n";
    return EXIT_SUCCESS;
}
