#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include <algorithm>
#include <cmath>

namespace lab {
// Vec3 luôn ở world space, không chứa pixel hay góc camera.
struct Vec2 {
    double x{};
    double y{};
};

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline bool finite(Vec3 value) {
    return std::isfinite(value.x) && std::isfinite(value.y) && std::isfinite(value.z);
}

inline Vec3 add(Vec3 left, Vec3 right) {
    return {left.x + right.x, left.y + right.y, left.z + right.z};
}

inline Vec3 subtract(Vec3 left, Vec3 right) {
    return {left.x - right.x, left.y - right.y, left.z - right.z};
}

inline Vec3 scale(Vec3 vector, double scalar) {
    return {vector.x * scalar, vector.y * scalar, vector.z * scalar};
}

inline double dot(Vec3 left, Vec3 right) {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}

inline double magnitude(Vec3 vector) {
    return std::hypot(vector.x, vector.y, vector.z);
}

inline Vec3 normalize(Vec3 vector) {
    const double length = magnitude(vector);
    if (!std::isfinite(length) || length == 0.0) {
        return {};
    }
    return scale(vector, 1.0 / length);
}

#if LAB_CHECKPOINT >= 2
struct Triangle {
    Vec3 p0{-1.0, -1.0, 0.0};
    Vec3 p1{1.0, -1.0, 0.0};
    Vec3 p2{0.0, 1.0, 1.0};
};

struct Edges {
    Vec3 a{};
    Vec3 b{};
};

inline Edges triangleEdges(const Triangle& triangle) {
    return {subtract(triangle.p1, triangle.p0), subtract(triangle.p2, triangle.p0)};
}

inline Vec3 triangleCentroid(const Triangle& triangle) {
    return scale(add(add(triangle.p0, triangle.p1), triangle.p2), 1.0 / 3.0);
}
#endif

#if LAB_CHECKPOINT >= 3
inline Vec3 cross(Vec3 left, Vec3 right) {
    return {left.y * right.z - left.z * right.y, left.z * right.x - left.x * right.z, left.x * right.y - left.y * right.x};
}

inline Vec3 triangleRawNormal(const Triangle& triangle) {
    const Edges edges = triangleEdges(triangle);
    return cross(edges.a, edges.b);
}

// Miền editor: mỗi tọa độ trong [-2,2]. Tách ngưỡng diện tích và ngưỡng góc.
inline bool normalHasDirection(const Triangle& triangle) {
    const Edges edges = triangleEdges(triangle);
    const double lengthA = magnitude(edges.a);
    const double lengthB = magnitude(edges.b);
    const double crossLength = magnitude(triangleRawNormal(triangle));
    if (lengthA == 0.0 || lengthB == 0.0 || crossLength <= 1e-10) {
        return false;
    }
    return crossLength / (lengthA * lengthB) > 1e-6;
}
#endif

#if LAB_CHECKPOINT >= 4
inline Vec3 triangleUnitNormal(const Triangle& triangle) {
    if (!normalHasDirection(triangle)) {
        return {};
    }
    return normalize(triangleRawNormal(triangle));
}

inline double triangleArea(const Triangle& triangle) {
    return magnitude(triangleRawNormal(triangle)) * 0.5;
}
#endif

#if LAB_CHECKPOINT >= 5
inline Triangle reverseWinding(const Triangle& triangle) {
    return {triangle.p0, triangle.p2, triangle.p1};
}

// towardViewer trỏ từ centroid tới eye, không phải hướng từ eye nhìn vào cảnh.
inline double facingAmount(const Triangle& triangle, Vec3 towardViewer) {
    return dot(triangleUnitNormal(triangle), normalize(towardViewer));
}
#endif

#if LAB_CHECKPOINT >= 7
inline double orthogonalityError(const Triangle& triangle) {
    if (!normalHasDirection(triangle)) {
        return 0.0;
    }
    const Edges edges = triangleEdges(triangle);
    const Vec3 unit = triangleUnitNormal(triangle);
    return std::max(std::abs(dot(unit, normalize(edges.a))), std::abs(dot(unit, normalize(edges.b))));
}
#endif
} // namespace lab
