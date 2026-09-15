#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <utility>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

namespace lab {
#if LAB_CHECKPOINT >= 1
struct Vec2 {
    double x{};
    double y{};
};

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline Vec3 add(Vec3 left, Vec3 right) {
    return {left.x + right.x, left.y + right.y, left.z + right.z};
}

inline Vec3 scale(Vec3 vector, double scalar) {
    return {vector.x * scalar, vector.y * scalar, vector.z * scalar};
}

// Đây là phép chiếu axonometric để vẽ sơ đồ, chưa phải perspective camera.
inline Vec2 projectIsometric(Vec3 point) {
    constexpr double cos30 = 0.86602540378443864676;
    return {
        (point.x - point.z) * cos30,
        point.y + (point.x + point.z) * 0.5,
    };
}
#endif

#if LAB_CHECKPOINT >= 2
struct Triangle {
    Vec3 a{};
    Vec3 b{};
    Vec3 c{};
};

inline Vec3 subtract(Vec3 left, Vec3 right) {
    return {left.x - right.x, left.y - right.y, left.z - right.z};
}

inline std::pair<Vec3, Vec3> triangleEdges(const Triangle& triangle) {
    return {
        subtract(triangle.b, triangle.a),
        subtract(triangle.c, triangle.a),
    };
}

inline Vec3 triangleCentroid(const Triangle& triangle) {
    return scale(add(add(triangle.a, triangle.b), triangle.c), 1.0 / 3.0);
}
#endif

#if LAB_CHECKPOINT >= 3
inline Vec3 cross(Vec3 left, Vec3 right) {
    return {
        left.y * right.z - left.z * right.y,
        left.z * right.x - left.x * right.z,
        left.x * right.y - left.y * right.x,
    };
}

inline Vec3 triangleRawNormal(const Triangle& triangle) {
    const auto [edgeAB, edgeAC] = triangleEdges(triangle);
    return cross(edgeAB, edgeAC);
}
#endif

#if LAB_CHECKPOINT >= 4
inline double dot(Vec3 left, Vec3 right) {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}

inline double magnitude(Vec3 vector) {
    return std::sqrt(dot(vector, vector));
}

inline Vec3 normalize(Vec3 vector, double epsilon = 1e-9) {
    const double length = magnitude(vector);
    if (length <= epsilon) {
        return {};
    }
    return scale(vector, 1.0 / length);
}

inline Vec3 triangleUnitNormal(const Triangle& triangle) {
    return normalize(triangleRawNormal(triangle));
}

inline double triangleArea(const Triangle& triangle) {
    return magnitude(triangleRawNormal(triangle)) * 0.5;
}
#endif

#if LAB_CHECKPOINT >= 5
inline Triangle reverseWinding(const Triangle& triangle) {
    return {triangle.a, triangle.c, triangle.b};
}

inline double facingAmount(const Triangle& triangle, Vec3 viewDirection) {
    return dot(triangleUnitNormal(triangle), normalize(viewDirection));
}
#endif

#if LAB_CHECKPOINT >= 6
inline bool isDegenerate(const Triangle& triangle, double epsilon = 1e-9) {
    return magnitude(triangleRawNormal(triangle)) <= epsilon;
}

inline double orthogonalityError(const Triangle& triangle) {
    const auto [edgeAB, edgeAC] = triangleEdges(triangle);
    const Vec3 normal = triangleRawNormal(triangle);
    return std::max(std::abs(dot(normal, edgeAB)), std::abs(dot(normal, edgeAC)));
}
#endif
} // namespace lab
