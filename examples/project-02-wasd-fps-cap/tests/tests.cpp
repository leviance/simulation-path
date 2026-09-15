#include "lab.hpp"
#include <array>
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <string_view>

namespace {
int failures = 0;

bool nearlyEqual(double left, double right, double epsilon = 1e-9) {
    return std::abs(left - right) < epsilon;
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
    // Ba timeline có cùng tổng thời gian phải cho cùng quãng đường.
    std::array<double, 150> thirtyFps{};
    thirtyFps.fill(1.0 / 30.0);
    std::array<double, 300> sixtyFps{};
    sixtyFps.fill(1.0 / 60.0);
    std::array<double, 600> oneHundredTwentyFps{};
    oneHundredTwentyFps.fill(1.0 / 120.0);
    constexpr double expectedDistance = 180.0 * 5.0;
    check(nearlyEqual(lab::simulate(thirtyFps), expectedDistance), "30 FPS travels 900 px in five seconds");
    check(nearlyEqual(lab::simulate(thirtyFps), lab::simulate(sixtyFps)), "30 and 60 FPS travel the same distance");
    check(nearlyEqual(lab::simulate(sixtyFps), lab::simulate(oneHundredTwentyFps)), "60 and 120 FPS travel the same distance");

    // Frame time không đều vẫn đúng nếu tổng dt không đổi.
    const std::array unevenTimeline{
        0.010,
        0.020,
        0.005,
        0.025,
        0.040,
    };
    check(nearlyEqual(lab::simulate(unevenTimeline), 18.0), "uneven 0.1-second timeline travels 18 px");

    // Clamp khóa cả dt quá lớn và dt âm.
    lab::Vec2 position{};
    lab::update(position, {100.0, 0.0}, 0.2);
    check(nearlyEqual(position.x, 5.0), "large dt is clamped to 0.05 seconds");
    lab::update(position, {100.0, 0.0}, -1.0);
    check(nearlyEqual(position.x, 5.0), "negative dt is clamped to zero");

    // Normalize phải giữ tốc độ chéo bằng tốc độ đi thẳng.
    const lab::Vec2 diagonal = lab::normalize({1.0, 1.0});
    check(nearlyEqual(lab::length(diagonal), 1.0), "diagonal direction is normalized");
    check(nearlyEqual(lab::length(lab::normalize({0.0, 0.0})), 0.0), "zero direction stays finite");
    lab::Vec2 diagonalPosition{};
    const lab::Vec2 diagonalVelocity = diagonal * 180.0;
    for (double dt : sixtyFps) {
        lab::update(diagonalPosition, diagonalVelocity, dt);
    }
    check(nearlyEqual(lab::length(diagonalPosition), expectedDistance), "diagonal movement keeps the configured speed");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 02 validation checks passed\n";
    return EXIT_SUCCESS;
}
