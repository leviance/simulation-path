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

void check(bool condition, std::string_view label) {
    if (condition) {
        return;
    }
    std::cerr << "FAILED: " << label << '\n';
    ++failures;
}
} // namespace

int main() {
    // Mỗi phép biến đổi riêng phải đúng trước khi kiểm tra ma trận ghép.
    check(nearlyEqual(lab::scalePoint({4.0, -2.0}, 2.0, 3.0), {8.0, -6.0}), "non-uniform scale");
    check(nearlyEqual(lab::scalePoint({4.0, -2.0}, -1.0, 1.0), {-4.0, -2.0}), "negative scale reflects X");
    check(nearlyEqual(lab::rotatePoint({1.0, 0.0}, lab::kPi / 2.0), {0.0, 1.0}), "quarter turn");
    check(nearlyEqual(lab::shearPoint({2.0, 4.0}, 0.5, 0.0), {4.0, 4.0}), "X shear");
    check(nearlyEqual(lab::shearPoint({2.0, 4.0}, 0.0, -0.25), {2.0, 3.5}), "Y shear");

    const lab::Vec2 point{2.0, -1.0};
    check(nearlyEqual(lab::transformPoint(lab::identityMatrix(), point), point), "identity keeps point");
    check(nearlyEqual(lab::transformPoint(lab::translationMatrix({3.0, 5.0}), point), {5.0, 4.0}), "translation moves point");
    check(nearlyEqual(lab::transformPoint(lab::scaleMatrix(2.0, 3.0), point), lab::scalePoint(point, 2.0, 3.0)), "scale matrix matches scalePoint");
    check(nearlyEqual(lab::transformPoint(lab::rotationMatrix(0.4), point), lab::rotatePoint(point, 0.4)), "rotation matrix matches rotatePoint");
    check(nearlyEqual(lab::transformPoint(lab::shearMatrix(0.3, -0.2), point), lab::shearPoint(point, 0.3, -0.2)), "shear matrix matches shearPoint");

    const lab::TransformParameters parameters{
        1.5,
        0.75,
        0.6,
        0.35,
        -0.1,
        {12.0, -8.0},
    };

    const lab::Vec2 scaled = lab::scalePoint(point, parameters.scaleX, parameters.scaleY);
    const lab::Vec2 sheared = lab::shearPoint(scaled, parameters.shearX, parameters.shearY);
    const lab::Vec2 rotated = lab::rotatePoint(sheared, parameters.angle);
    const lab::Vec2 directScaleFirst = lab::add(rotated, parameters.translation);
    const lab::Mat3 scaleFirstMatrix = lab::composeTransform(
        parameters,
        lab::TransformOrder::ScaleShearRotate
    );
    check(
        nearlyEqual(lab::transformPoint(scaleFirstMatrix, point), directScaleFirst),
        "composed matrix matches scale-shear-rotate sequence"
    );

    const lab::Vec2 rotatedFirst = lab::rotatePoint(point, parameters.angle);
    const lab::Vec2 shearedSecond = lab::shearPoint(rotatedFirst, parameters.shearX, parameters.shearY);
    const lab::Vec2 scaledLast = lab::scalePoint(shearedSecond, parameters.scaleX, parameters.scaleY);
    const lab::Vec2 directRotateFirst = lab::add(scaledLast, parameters.translation);
    const lab::Mat3 rotateFirstMatrix = lab::composeTransform(
        parameters,
        lab::TransformOrder::RotateShearScale
    );
    check(
        nearlyEqual(lab::transformPoint(rotateFirstMatrix, point), directRotateFirst),
        "composed matrix matches rotate-shear-scale sequence"
    );
    check(
        !nearlyEqual(
            lab::transformPoint(scaleFirstMatrix, point),
            lab::transformPoint(rotateFirstMatrix, point)
        ),
        "transform order is not commutative"
    );

    // Diện tích là một kiểm tra hình học độc lập với từng tọa độ đỉnh.
    const lab::Square square = lab::makeSquare(2.0);
    const lab::Square transformed = lab::transformSquare(square, scaleFirstMatrix);
    const double areaRatio = lab::polygonArea(transformed) / lab::polygonArea(square);
    const double determinant = lab::determinantLinearPart(scaleFirstMatrix);
    check(nearlyEqual(areaRatio, std::abs(determinant)), "absolute determinant matches area ratio");

    const lab::Mat3 reflection = lab::scaleMatrix(-1.0, 1.0);
    check(lab::determinantLinearPart(reflection) < 0.0, "negative determinant reports reflection");

    if (failures != 0) {
        std::cerr << failures << " validation check(s) failed\n";
        return EXIT_FAILURE;
    }
    std::cout << "All Project 09 validation checks passed\n";
    return EXIT_SUCCESS;
}
