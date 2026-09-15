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
    return lab::distance(left, right) <= epsilon;
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
    // Các số 3-4-5 giúp kiểm tra magnitude và normalize bằng kết quả tính tay.
    const lab::Vec2 a{3.0, 4.0};
    const lab::Vec2 b{-2.0, 5.0};

    check(a + b == lab::Vec2{1.0, 9.0}, "vector addition combines matching components");
    check(a - b == lab::Vec2{5.0, -1.0}, "vector subtraction combines matching components");
    check(a * 2.0 == lab::Vec2{6.0, 8.0}, "right scalar multiplication scales both components");
    check(2.0 * a == lab::Vec2{6.0, 8.0}, "left scalar multiplication scales both components");
    check(nearlyEqual(lab::length(a), 5.0), "length uses the Pythagorean theorem");
    check(nearlyEqual(lab::lengthSquared(a), 25.0), "lengthSquared avoids the square root");

    const lab::Vec2 unitA = lab::normalize(a);
    check(nearlyEqual(lab::length(unitA), 1.0), "normalizing a non-zero vector produces unit length");
    check(nearlyEqual(unitA, {0.6, 0.8}), "normalization preserves direction");
    check(lab::normalize({}) == lab::Vec2{}, "normalizing the zero vector returns zero");
    check(lab::normalize({1e-15, -1e-15}) == lab::Vec2{}, "normalizing a near-zero vector returns zero");
    check(lab::normalize({std::numeric_limits<double>::infinity(), 1.0}) == lab::Vec2{}, "normalizing infinity returns zero");
    check(lab::normalize({std::numeric_limits<double>::quiet_NaN(), 1.0}) == lab::Vec2{}, "normalizing NaN returns zero");
    check(nearlyEqual(lab::distance(a, b), std::sqrt(26.0)), "distance measures the difference vector");
    check(nearlyEqual(lab::distance(a, a), 0.0), "a point has zero distance from itself");
    check(nearlyEqual(lab::distance(a, b), lab::distance(b, a)), "distance is symmetric");

    check(lab::lerp(a, b, 0.0) == a, "lerp at zero returns the start");
    check(lab::lerp(a, b, 1.0) == b, "lerp at one returns the end");
    check(nearlyEqual(lab::lerp(a, b, 0.5), {0.5, 4.5}), "lerp at one half returns the midpoint");
    check(nearlyEqual(lab::lerp(a, b, -1.0), {8.0, 3.0}), "lerp extrapolates before the start");
    check(nearlyEqual(lab::lerp(a, b, 2.0), {-7.0, 6.0}), "lerp extrapolates beyond the end");

    // Ba đẳng thức dưới đây là phiên bản đại số của hình bình hành trên màn hình.
    const lab::Vec2 sum = a + b;
    check(nearlyEqual(a + b, b + a), "vector addition is commutative");
    check(nearlyEqual(sum - a, b), "parallelogram corner minus A restores B");
    check(nearlyEqual(sum - b, a), "parallelogram corner minus B restores A");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 06 validation checks passed\n";
    return EXIT_SUCCESS;
}
