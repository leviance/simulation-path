#include "view.hpp"
#include <cmath>
#include <cstdlib>
#include <iostream>
#include <limits>
#include <string_view>

namespace {
int failures = 0;

bool near(double a, double b, double epsilon = 1e-9) {
    return std::isfinite(a) && std::isfinite(b) && std::abs(a - b) <= epsilon;
}

bool near(lab::Vec2 a, lab::Vec2 b) {
    return near(a.x, b.x) && near(a.y, b.y);
}

void check(bool condition, std::string_view label) {
    if (!condition) {
        std::cerr << "FAILED: " << label << '\n';
        ++failures;
    }
}

// Oracle khai triển theo hệ số, không gọi multiply/compose hay hàm biến đổi đang kiểm.
lab::Vec2 reference(lab::Vec2 v, const lab::TransformParameters& p, bool reverse) {
    const double c = std::cos(p.angle);
    const double s = std::sin(p.angle);
    double a = p.scaleX * (c - s * p.shearY);
    double b = p.scaleY * (c * p.shearX - s);
    double d = p.scaleX * (s + c * p.shearY);
    double e = p.scaleY * (s * p.shearX + c);
    if (reverse) {
        a = p.scaleX * (c + p.shearX * s);
        b = p.scaleX * (-s + p.shearX * c);
        d = p.scaleY * (p.shearY * c + s);
        e = p.scaleY * (-p.shearY * s + c);
    }
    return {a * v.x + b * v.y + p.translation.x, d * v.x + e * v.y + p.translation.y};
}
} // namespace

int main() {
    // Số biết trước bắt lỗi quy ước trước khi so hai cách cài đặt.
    check(near(lab::scalePoint({4.0, -2.0}, 2.0, 3.0), {8.0, -6.0}), "scale components");
    check(near(lab::rotatePoint({1.0, 0.0}, lab::kPi / 2.0), {0.0, 1.0}), "quarter turn");
    check(near(lab::shearPoint({2.0, 4.0}, 0.5, -0.25), {4.0, 3.5}), "simultaneous shear uses old x and y");
    const lab::Mat2 a{{{1.0, 2.0, 3.0, 4.0}}};
    const lab::Mat2 b{{{2.0, 0.0, 1.0, 2.0}}};
    const lab::Mat2 product = lab::multiply(a, b);
    check(product.values == std::array<double, 4>{4.0, 4.0, 10.0, 8.0}, "Mat2 row by column numeric oracle");
    check(near(lab::transformVector(a, {2.0, -1.0}), {0.0, 2.0}), "Mat2 vector numeric oracle");
    const lab::Mat3 m{{{1.0, 2.0, 5.0, 3.0, 4.0, -2.0, 0.0, 0.0, 1.0}}};
    check(near(lab::transformPoint(m, {2.0, -1.0}), {5.0, 0.0}), "translation affects point");
    check(near(lab::transformDirection(m, {2.0, -1.0}), {0.0, 2.0}), "translation does not affect direction");
    check(lab::multiply(lab::identityMatrix(), m).values == m.values, "left identity Mat3");
    check(lab::multiply(m, lab::identityMatrix()).values == m.values, "right identity Mat3");

    const lab::Square original = lab::makeSquare(1.0);
    lab::Scene scene;
    for (std::size_t i = 0; i < original.size(); ++i) {
        check(near(lab::transformedSquare(scene)[i], original[i]), "identity keeps all vertices");
    }
    // Tập tham số hữu hạn, có số âm, 0, hai shear và hai order.
    for (int sample = 0; sample < 41; ++sample) {
        scene.parameters = {(sample - 20) / 10.0, (sample % 9 - 4) / 3.0, sample * 0.17, (sample % 7 - 3) / 4.0, (sample % 5 - 2) / 3.0, {0.5, -0.75}};
        for (int reverse = 0; reverse < 2; ++reverse) {
            scene.order = lab::TransformOrder::ScaleShearRotate;
            if (reverse != 0)
                scene.order = lab::TransformOrder::RotateShearScale;
            const lab::Mat3 matrix = lab::sceneMatrix(scene);
            const lab::Square square = lab::transformedSquare(scene);
            const auto& p = scene.parameters;
            const double expectedDet = p.scaleX * p.scaleY * (1.0 - p.shearX * p.shearY);
            check(near(lab::determinantLinearPart(matrix), expectedDet), "analytic determinant");
            check(near(lab::signedArea(square) / 4.0, expectedDet), "signed area tracks determinant sign");
            check(near(lab::polygonArea(square) / 4.0, std::abs(expectedDet)), "absolute area ratio");
            for (std::size_t i = 0; i < square.size(); ++i) {
                const lab::Vec2 expected = reference(original[i], p, reverse != 0);
                check(near(square[i], expected), "matrix matches expanded independent oracle");
                check(near(lab::directTransform(original[i], scene), expected), "direct chain matches oracle");
                check(near(lab::add(lab::transformVector(lab::sceneLinearMatrix(scene), original[i]), p.translation), expected), "Mat2 matches affine linear part");
            }
        }
    }

    lab::applyPreset(scene, 4);
    const lab::Vec2 first = lab::worldPoint({1.0, 1.0}, scene);
    scene.order = lab::TransformOrder::RotateShearScale;
    check(!near(first, lab::worldPoint({1.0, 1.0}, scene)), "noncommuting preset differs");
    lab::applyPreset(scene, 2);
    check(near(lab::determinantLinearPart(lab::sceneMatrix(scene)), 0.0), "zero scale is singular");
    lab::applyPreset(scene, 3);
    check(near(lab::polygonArea(lab::transformedSquare(scene)), 0.0), "two simultaneous shears can be singular");
    lab::applyPreset(scene, 1);
    check(lab::signedArea(lab::transformedSquare(scene)) < 0.0, "reflection reverses winding");

    // Input hình học độc lập với SDL, gồm hai đầu slider và phần bị clamp.
    lab::applyPreset(scene, 0);
    check(lab::hitSlider({960.0, 160.0}) == 0, "hit slider first end");
    check(lab::hitSlider({1230.0, 556.0}) == 6, "hit slider last end");
    check(lab::hitSlider({940.0, 160.0}) == -1, "outside slider");
    lab::updateSlider(scene, 0, 960.0);
    check(near(scene.parameters.scaleX, -2.0), "slider minimum");
    lab::updateSlider(scene, 0, 9999.0);
    check(near(scene.parameters.scaleX, 2.0), "slider maximum clamped");
    lab::setParameter(scene, 0, std::numeric_limits<double>::quiet_NaN());
    check(near(scene.parameters.scaleX, 2.0), "NaN slider ignored");
    check(near(lab::boundedTranslation({9.0, -9.0}), {2.0, -2.0}), "translation bounded");
    check(near(lab::screenToWorld(lab::worldToScreen({-1.2, 1.7})), {-1.2, 1.7}), "world screen roundtrip");
    const double before = scene.parameters.angle;
    lab::advanceScene(scene, -1.0);
    check(near(scene.parameters.angle, before), "negative dt ignored");

    // Kiểm pixel thật của renderer CPU, không chỉ kiểm công thức.
    lab::applyPreset(scene, 4);
    lab::Framebuffer image;
    lab::renderScene(image, scene, 0);
    check(image.pixels[400 * lab::Framebuffer::width] == lab::kBackground, "left viewport margin stays clear");
    check(image.pixels[400 * lab::Framebuffer::width + 890] == lab::kBackground, "right viewport margin stays clear");
    for (const auto color : {lab::kShape, lab::kAxisX, lab::kAxisY, lab::kMarker, 0x335E59FFu}) {
        bool found = false;
        for (const auto pixel : image.pixels) {
            if (pixel == color)
                found = true;
        }
        check(found, "shape/basis/grid/slider pixels visible");
    }
    if (failures != 0) {
        return EXIT_FAILURE;
    }
    std::cout << "Project 09 math, geometry and controls passed\n";
    return EXIT_SUCCESS;
}
