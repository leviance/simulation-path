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
    // Kiểm tra các phép Vec3 cơ bản trước khi ghép chúng thành normal của tam giác.
    check(nearlyEqual(lab::add({1.0, 2.0, 3.0}, {-4.0, 5.0, 1.0}), {-3.0, 7.0, 4.0}), "Vec3 addition");
    check(nearlyEqual(lab::subtract({1.0, 2.0, 3.0}, {-4.0, 5.0, 1.0}), {5.0, -3.0, 2.0}), "Vec3 subtraction");
    check(nearlyEqual(lab::dot({1.0, 2.0, 3.0}, {4.0, -5.0, 2.0}), 0.0), "3D dot product");

    const lab::Vec3 xAxis{1.0, 0.0, 0.0};
    const lab::Vec3 yAxis{0.0, 1.0, 0.0};
    const lab::Vec3 zAxis{0.0, 0.0, 1.0};
    check(nearlyEqual(lab::cross(xAxis, yAxis), zAxis), "X cross Y is Z");
    check(nearlyEqual(lab::cross(yAxis, xAxis), lab::scale(zAxis, -1.0)), "cross order changes sign");

    // Tam giác vuông 3×4 có raw normal dài 12 và diện tích 6.
    const lab::Triangle rightTriangle{{0.0, 0.0, 0.0}, {3.0, 0.0, 0.0}, {0.0, 4.0, 0.0}};
    const auto [edgeAB, edgeAC] = lab::triangleEdges(rightTriangle);
    const lab::Vec3 rawNormal = lab::triangleRawNormal(rightTriangle);
    check(nearlyEqual(edgeAB, {3.0, 0.0, 0.0}), "edge AB");
    check(nearlyEqual(edgeAC, {0.0, 4.0, 0.0}), "edge AC");
    check(nearlyEqual(rawNormal, {0.0, 0.0, 12.0}), "raw normal magnitude and direction");
    check(nearlyEqual(lab::dot(rawNormal, edgeAB), 0.0), "normal perpendicular to AB");
    check(nearlyEqual(lab::dot(rawNormal, edgeAC), 0.0), "normal perpendicular to AC");
    check(nearlyEqual(lab::magnitude(lab::triangleUnitNormal(rightTriangle)), 1.0), "unit normal length");
    check(nearlyEqual(lab::triangleArea(rightTriangle), 6.0), "triangle area from cross");

    const lab::Triangle reversed = lab::reverseWinding(rightTriangle);
    check(nearlyEqual(lab::triangleRawNormal(reversed), lab::scale(rawNormal, -1.0)), "reversed winding flips normal");
    check(nearlyEqual(lab::triangleArea(reversed), lab::triangleArea(rightTriangle)), "reversed winding preserves area");

    // Trường hợp suy biến phải được báo rõ và không sinh NaN.
    const lab::Triangle collinear{{-1.0, -1.0, -1.0}, {0.0, 0.0, 0.0}, {2.0, 2.0, 2.0}};
    check(lab::isDegenerate(collinear), "collinear triangle is degenerate");
    check(nearlyEqual(lab::triangleUnitNormal(collinear), {}), "degenerate normal stays finite zero");
    check(std::isfinite(lab::facingAmount(collinear, {1.0, -1.0, 1.0})), "degenerate facing is finite");
    check(nearlyEqual(lab::orthogonalityError(rightTriangle), 0.0), "orthogonality validation");

    const lab::Vec2 projectedOrigin = lab::projectIsometric({0.0, 0.0, 0.0});
    check(nearlyEqual(projectedOrigin.x, 0.0) && nearlyEqual(projectedOrigin.y, 0.0), "diagram keeps origin");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 10 validation checks passed\n";
    return EXIT_SUCCESS;
}
