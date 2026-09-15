#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 1
#include <array>
#include <cmath>

namespace lab {

inline constexpr double kPi = 3.14159265358979323846;

struct Vec2 {
    double x{};
    double y{};
};

using Square = std::array<Vec2, 4>;

inline Vec2 add(Vec2 left, Vec2 right) {
    return {left.x + right.x, left.y + right.y};
}

inline Square makeSquare(double halfExtent) {
    return {
        Vec2{-halfExtent, -halfExtent},
        Vec2{halfExtent, -halfExtent},
        Vec2{halfExtent, halfExtent},
        Vec2{-halfExtent, halfExtent},
    };
}

#if LAB_CHECKPOINT >= 2
inline Vec2 scalePoint(Vec2 point, double scaleX, double scaleY) {
    return {point.x * scaleX, point.y * scaleY};
}
#endif

#if LAB_CHECKPOINT >= 3
inline Vec2 rotatePoint(Vec2 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        cosine * point.x - sine * point.y,
        sine * point.x + cosine * point.y,
    };
}
#endif

#if LAB_CHECKPOINT >= 4
inline Vec2 shearPoint(Vec2 point, double shearX, double shearY) {
    return {
        point.x + shearX * point.y,
        shearY * point.x + point.y,
    };
}
#endif

#if LAB_CHECKPOINT >= 5
// Mat3 dùng row-major storage và nhân với column vector [x y 1]^T.
struct Mat3 {
    std::array<double, 9> values{};

    [[nodiscard]] double at(int row, int column) const {
        return values[std::size_t(row * 3 + column)];
    }
};

inline Mat3 identityMatrix() {
    return {{{1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0}}};
}

inline Mat3 translationMatrix(Vec2 offset) {
    return {{{1.0, 0.0, offset.x, 0.0, 1.0, offset.y, 0.0, 0.0, 1.0}}};
}

inline Mat3 scaleMatrix(double scaleX, double scaleY) {
    return {{{scaleX, 0.0, 0.0, 0.0, scaleY, 0.0, 0.0, 0.0, 1.0}}};
}

inline Mat3 rotationMatrix(double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {{{cosine, -sine, 0.0, sine, cosine, 0.0, 0.0, 0.0, 1.0}}};
}

inline Mat3 shearMatrix(double shearX, double shearY) {
    return {{{1.0, shearX, 0.0, shearY, 1.0, 0.0, 0.0, 0.0, 1.0}}};
}

inline Mat3 multiply(Mat3 left, Mat3 right) {
    Mat3 result{};
    for (int row = 0; row < 3; ++row) {
        for (int column = 0; column < 3; ++column) {
            double value = 0.0;
            for (int index = 0; index < 3; ++index) {
                value += left.at(row, index) * right.at(index, column);
            }
            result.values[std::size_t(row * 3 + column)] = value;
        }
    }
    return result;
}

inline Vec2 transformPoint(Mat3 matrix, Vec2 point) {
    const double x = matrix.at(0, 0) * point.x + matrix.at(0, 1) * point.y + matrix.at(0, 2);
    const double y = matrix.at(1, 0) * point.x + matrix.at(1, 1) * point.y + matrix.at(1, 2);
    const double w = matrix.at(2, 0) * point.x + matrix.at(2, 1) * point.y + matrix.at(2, 2);
    if (!std::isfinite(w) || std::abs(w) <= 1e-12) {
        return {};
    }
    return {x / w, y / w};
}

inline Square transformSquare(Square square, Mat3 matrix) {
    Square result{};
    for (std::size_t index = 0; index < square.size(); ++index) {
        result[index] = transformPoint(matrix, square[index]);
    }
    return result;
}
#endif

#if LAB_CHECKPOINT >= 6
enum class TransformOrder {
    ScaleShearRotate,
    RotateShearScale,
};

struct TransformParameters {
    double scaleX{1.0};
    double scaleY{1.0};
    double angle{};
    double shearX{};
    double shearY{};
    Vec2 translation{};
};

inline Mat3 composeTransform(TransformParameters parameters, TransformOrder order) {
    const Mat3 translation = translationMatrix(parameters.translation);
    const Mat3 scale = scaleMatrix(parameters.scaleX, parameters.scaleY);
    const Mat3 shear = shearMatrix(parameters.shearX, parameters.shearY);
    const Mat3 rotation = rotationMatrix(parameters.angle);

    if (order == TransformOrder::RotateShearScale) {
        return multiply(translation, multiply(scale, multiply(shear, rotation)));
    }
    return multiply(translation, multiply(rotation, multiply(shear, scale)));
}

inline double determinantLinearPart(Mat3 matrix) {
    return matrix.at(0, 0) * matrix.at(1, 1) - matrix.at(0, 1) * matrix.at(1, 0);
}

inline double polygonArea(const Square& polygon) {
    double doubledArea = 0.0;
    for (std::size_t index = 0; index < polygon.size(); ++index) {
        const Vec2 current = polygon[index];
        const Vec2 next = polygon[(index + 1) % polygon.size()];
        doubledArea += current.x * next.y - current.y * next.x;
    }
    return std::abs(doubledArea) * 0.5;
}
#endif

} // namespace lab
#endif
