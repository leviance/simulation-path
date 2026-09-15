#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>
#include <vector>

namespace {
int failures = 0;

bool nearlyEqual(double left, double right, double epsilon = 1e-9) {
    return std::abs(left - right) <= epsilon;
}

bool nearlyEqual(lab::Vec2 left, lab::Vec2 right, double epsilon = 1e-9) {
    return nearlyEqual(left.x, right.x, epsilon) && nearlyEqual(left.y, right.y, epsilon);
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
    // Kiểm tra phép đổi đơn vị và việc chuẩn hóa góc trước khi dùng lượng giác.
    check(nearlyEqual(lab::degreesToRadians(180.0), lab::kPi), "180 degrees equals pi radians");
    check(nearlyEqual(lab::radiansToDegrees(lab::kTau), 360.0), "tau radians equals 360 degrees");
    check(nearlyEqual(lab::normalizeAngle(0.0), 0.0), "zero angle stays zero");
    check(nearlyEqual(lab::normalizeAngle(lab::kTau), 0.0), "one turn wraps to zero");
    check(nearlyEqual(lab::normalizeAngle(-lab::kPi / 2.0), 3.0 * lab::kPi / 2.0), "negative quarter turn wraps into the positive range");
    check(nearlyEqual(lab::normalizeAngle(5.0 * lab::kTau + 0.25), 0.25), "several turns keep their remainder");
    check(nearlyEqual(lab::normalizeAngle(std::numeric_limits<double>::infinity()), 0.0), "infinite angle falls back to zero");

    // Các điểm trên unit circle phải giữ độ dài 1 ở mọi góc.
    check(nearlyEqual(lab::unitDirection(0.0), {1.0, 0.0}), "angle zero points right");
    check(nearlyEqual(lab::unitDirection(lab::kPi / 2.0), {0.0, 1.0}), "pi over two points up");
    check(nearlyEqual(lab::unitDirection(lab::kPi), {-1.0, 0.0}), "pi points left");
    for (int step = 0; step <= 24; ++step) {
        const double angle = lab::kTau * double(step) / 24.0;
        const lab::Vec2 direction = lab::unitDirection(angle);
        check(nearlyEqual(direction.x * direction.x + direction.y * direction.y, 1.0), "sin squared plus cos squared equals one");
    }
    check(nearlyEqual(lab::pointOnCircle({2.0, -1.0}, 3.0, 0.0), {5.0, -1.0}), "pointOnCircle applies center and radius");

    const lab::Vec2 point{3.0, 4.0};
    check(nearlyEqual(lab::projectOntoXAxis(point), {3.0, 0.0}), "projection onto X keeps only the cosine component");
    check(nearlyEqual(lab::projectOntoYAxis(point), {0.0, 4.0}), "projection onto Y keeps only the sine component");

    // Hai chuỗi delta time có cùng tổng thời gian phải cho cùng kết quả.
    double angleA = 0.0;
    for (int step = 0; step < 60; ++step) {
        angleA = lab::advanceAngle(angleA, lab::kPi, 1.0 / 60.0);
    }
    double angleB = 0.0;
    for (int step = 0; step < 30; ++step) {
        angleB = lab::advanceAngle(angleB, lab::kPi, 1.0 / 30.0);
    }
    check(nearlyEqual(angleA, angleB), "different delta-time sequences produce the same angle");
    check(nearlyEqual(angleA, lab::kPi), "pi radians per second advances half a turn in one second");
    check(nearlyEqual(lab::periodFromAngularSpeed(lab::kPi), 2.0), "pi radians per second has a two-second period");
    check(std::isinf(lab::periodFromAngularSpeed(0.0)), "zero angular speed has an infinite period");

    std::vector<lab::WaveSample> samples;
    for (int index = 0; index < 5; ++index) {
        lab::appendWaveSample(samples, lab::sampleWave(double(index), double(index)), 3);
    }
    check(samples.size() == 3, "wave history respects its maximum size");
    check(nearlyEqual(samples.front().time, 2.0), "wave history removes the oldest sample first");
    check(nearlyEqual(lab::sampleWave(1.0, lab::kPi / 2.0).sine, 1.0), "wave sample stores sine");
    check(nearlyEqual(lab::sampleWave(1.0, lab::kPi / 2.0).cosine, 0.0), "wave sample stores cosine");
    check(nearlyEqual(lab::mapSampleTimeToX(0.0, 6.0, 6.0, 100.0, 700.0), 100.0), "oldest visible sample maps to the left edge");
    check(nearlyEqual(lab::mapSampleTimeToX(3.0, 6.0, 6.0, 100.0, 700.0), 400.0), "sample time maps proportionally across the graph");
    check(nearlyEqual(lab::mapSampleTimeToX(6.0, 6.0, 6.0, 100.0, 700.0), 700.0), "newest sample maps to the right edge");

    check(nearlyEqual(lab::angleFromDirection({1.0, 0.0}), 0.0), "atan2 maps right to zero");
    check(nearlyEqual(lab::angleFromDirection({0.0, 1.0}), lab::kPi / 2.0), "atan2 maps up to pi over two");
    check(nearlyEqual(lab::angleFromDirection({0.0, -1.0}), 3.0 * lab::kPi / 2.0), "atan2 normalizes a negative result");
    check(nearlyEqual(lab::angleFromDirection({}), 0.0), "zero direction has a stable fallback angle");
    for (int step = 0; step < 24; ++step) {
        const double original = lab::kTau * double(step) / 24.0;
        const double restored = lab::angleFromDirection(lab::unitDirection(original));
        check(nearlyEqual(restored, original), "unitDirection and angleFromDirection round-trip");
    }

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 07 validation checks passed\n";
    return EXIT_SUCCESS;
}
