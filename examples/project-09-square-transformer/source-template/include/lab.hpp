#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include <array>
#include <cmath>

namespace lab {
inline constexpr double kPi = 3.14159265358979323846;

struct Vec2 {
    double x{};
    double y{};
};

using Square = std::array<Vec2, 4>;

struct TransformParameters {
    double scaleX{1.0};
    double scaleY{1.0};
    double angle{};
    double shearX{};
    double shearY{};
    Vec2 translation{};
};

inline Vec2 add(Vec2 a, Vec2 b) {
    return {a.x + b.x, a.y + b.y};
}

inline Square makeSquare(double halfExtent) {
    return {Vec2{-halfExtent, -halfExtent}, Vec2{halfExtent, -halfExtent}, Vec2{halfExtent, halfExtent}, Vec2{-halfExtent, halfExtent}};
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
    return {cosine * point.x - sine * point.y, sine * point.x + cosine * point.y};
}
#endif

#if LAB_CHECKPOINT >= 4
// Hai phương trình cùng dùng tọa độ cũ, không sửa x trước khi tính y.
inline Vec2 shearPoint(Vec2 point, double shearX, double shearY) {
    return {point.x + shearX * point.y, shearY * point.x + point.y};
}

// Row-major storage; vector là cột. Hai cột là ảnh của (1,0) và (0,1).
struct Mat2 {
    std::array<double, 4> values{};

    [[nodiscard]] double at(int row, int column) const {
        return values[static_cast<std::size_t>(row * 2 + column)];
    }
};

inline Vec2 transformVector(Mat2 matrix, Vec2 vector) {
    return {matrix.at(0, 0) * vector.x + matrix.at(0, 1) * vector.y, matrix.at(1, 0) * vector.x + matrix.at(1, 1) * vector.y};
}

inline Mat2 multiply(Mat2 left, Mat2 right) {
    Mat2 result{};
    for (int row = 0; row < 2; ++row) {
        for (int column = 0; column < 2; ++column) {
            double value = 0.0;
            for (int index = 0; index < 2; ++index) {
                value += left.at(row, index) * right.at(index, column);
            }
            result.values[static_cast<std::size_t>(row * 2 + column)] = value;
        }
    }
    return result;
}
#endif

#if LAB_CHECKPOINT >= 5
// Affine 3x3: hàng cuối luôn là [0,0,1]. Không phải API projection tổng quát.
struct Mat3 {
    std::array<double, 9> values{};

    [[nodiscard]] double at(int row, int column) const {
        return values[static_cast<std::size_t>(row * 3 + column)];
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
            result.values[static_cast<std::size_t>(row * 3 + column)] = value;
        }
    }
    return result;
}

inline Vec2 transformPoint(Mat3 matrix, Vec2 point) {
    const double x = matrix.at(0, 0) * point.x + matrix.at(0, 1) * point.y + matrix.at(0, 2);
    const double y = matrix.at(1, 0) * point.x + matrix.at(1, 1) * point.y + matrix.at(1, 2);
    return {x, y};
}

inline Mat2 linearPart(Mat3 matrix) {
    return {{{matrix.at(0, 0), matrix.at(0, 1), matrix.at(1, 0), matrix.at(1, 1)}}};
}

inline Vec2 transformDirection(Mat3 matrix, Vec2 direction) {
    return transformVector(linearPart(matrix), direction);
}
#endif

#if LAB_CHECKPOINT >= 6
enum class TransformOrder {
    ScaleShearRotate,
    RotateShearScale,
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
#endif

#if LAB_CHECKPOINT >= 8
inline double determinantLinearPart(Mat3 matrix) {
    return matrix.at(0, 0) * matrix.at(1, 1) - matrix.at(0, 1) * matrix.at(1, 0);
}

// Diện tích có dấu: giữ thông tin hướng, không gọi det=0 là giữ chiều.
inline double signedArea(const Square& polygon) {
    double doubledArea = 0.0;
    for (std::size_t index = 0; index < polygon.size(); ++index) {
        const Vec2 current = polygon[index];
        const Vec2 next = polygon[(index + 1) % polygon.size()];
        doubledArea += current.x * next.y - current.y * next.x;
    }
    return doubledArea * 0.5;
}

inline double polygonArea(const Square& polygon) {
    return std::abs(signedArea(polygon));
}
#endif
} // namespace lab
