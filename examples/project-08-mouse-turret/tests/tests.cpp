#include "lab.hpp"

#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

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
    // Kiểm tra các phép toán nền trước khi ghép chúng thành hành vi của tháp pháo.
    check(nearlyEqual(lab::add({2.0, 3.0}, {-1.0, 4.0}), {1.0, 7.0}), "vector addition");
    check(nearlyEqual(lab::subtract({2.0, 3.0}, {-1.0, 4.0}), {3.0, -1.0}), "vector subtraction");
    check(nearlyEqual(lab::length({3.0, 4.0}), 5.0), "vector length");
    check(nearlyEqual(lab::normalize({3.0, 4.0}), {0.6, 0.8}), "vector normalization");
    check(nearlyEqual(lab::normalize({}), {}), "zero vector normalization is stable");

    check(nearlyEqual(lab::dot({1.0, 0.0}, {1.0, 0.0}), 1.0), "aligned unit vectors have dot one");
    check(nearlyEqual(lab::dot({1.0, 0.0}, {0.0, 1.0}), 0.0), "perpendicular vectors have dot zero");
    check(nearlyEqual(lab::dot({1.0, 0.0}, {-1.0, 0.0}), -1.0), "opposite unit vectors have dot negative one");
    check(nearlyEqual(lab::dot({2.0, 0.0}, {3.0, 0.0}), 6.0), "raw dot includes both lengths");

    check(nearlyEqual(lab::cosineBetween({2.0, 0.0}, {5.0, 0.0}), 1.0), "cosine ignores vector length");
    check(nearlyEqual(lab::angleBetween({1.0, 0.0}, {0.0, 1.0}), lab::kPi / 2.0), "perpendicular vectors form a right angle");
    check(nearlyEqual(lab::angleBetween({1.0, 0.0}, {-1.0, 0.0}), lab::kPi), "opposite vectors form pi radians");
    check(nearlyEqual(lab::clampCosine(1.0 + 1e-12), 1.0), "cosine clamp protects acos upper bound");
    check(nearlyEqual(lab::clampCosine(-1.0 - 1e-12), -1.0), "cosine clamp protects acos lower bound");

    // Hai thành phần phải ghép lại thành vector ban đầu và vuông góc với nhau.
    const lab::Vec2 projected = lab::vectorProjection({3.0, 4.0}, {1.0, 0.0});
    const lab::Vec2 rejected = lab::rejection({3.0, 4.0}, {1.0, 0.0});
    check(nearlyEqual(lab::scalarProjection({3.0, 4.0}, {1.0, 0.0}), 3.0), "scalar projection keeps signed distance along axis");
    check(nearlyEqual(projected, {3.0, 0.0}), "vector projection lies on the target axis");
    check(nearlyEqual(rejected, {0.0, 4.0}), "rejection is perpendicular remainder");
    check(nearlyEqual(lab::add(projected, rejected), {3.0, 4.0}), "projection plus rejection reconstructs vector");
    check(nearlyEqual(lab::dot(projected, rejected), 0.0), "projection and rejection are perpendicular");

    check(lab::crossZ({1.0, 0.0}, {0.0, 1.0}) > 0.0, "positive cross means target is counter-clockwise");
    check(lab::crossZ({1.0, 0.0}, {0.0, -1.0}) < 0.0, "negative cross means target is clockwise");
    check(nearlyEqual(lab::signedAngleBetween({1.0, 0.0}, {0.0, 1.0}), lab::kPi / 2.0), "signed angle turns counter-clockwise");
    check(nearlyEqual(lab::signedAngleBetween({1.0, 0.0}, {0.0, -1.0}), -lab::kPi / 2.0), "signed angle turns clockwise");

    // rotateTowards vừa giữ tốc độ tối đa vừa phải dừng đúng tại đích.
    const double firstTurn = lab::rotateTowards(0.0, {0.0, 1.0}, 0.25);
    check(nearlyEqual(firstTurn, 0.25), "rotateTowards respects maximum step");
    const double finishedTurn = lab::rotateTowards(firstTurn, lab::directionFromAngle(0.30), 0.25);
    check(nearlyEqual(finishedTurn, 0.30), "rotateTowards does not overshoot target");
    check(nearlyEqual(lab::rotateTowards(0.75, {}, 0.25), 0.75), "zero target direction keeps current angle");

    const lab::Vec2 forward{1.0, 0.0};
    check(lab::isWithinViewCone(forward, lab::directionFromAngle(20.0 * lab::kPi / 180.0), 30.0 * lab::kPi / 180.0), "target inside cone is accepted");
    check(!lab::isWithinViewCone(forward, lab::directionFromAngle(40.0 * lab::kPi / 180.0), 30.0 * lab::kPi / 180.0), "target outside cone is rejected");
    check(!lab::isWithinViewCone(forward, {}, 30.0 * lab::kPi / 180.0), "zero target direction is never locked");
    check(!lab::isWithinViewCone(forward, {1.0, 0.0}, std::numeric_limits<double>::quiet_NaN()), "non-finite cone angle is rejected");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 08 validation checks passed\n";
    return EXIT_SUCCESS;
}
