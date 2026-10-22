#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <optional>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

namespace lab {
struct Vec2 {
    double x{};
    double y{};
};

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

struct Color {
    double red{};
    double green{};
    double blue{};
};

#if LAB_CHECKPOINT >= 1
struct Face {
    std::array<std::size_t, 3> indices{};
    std::size_t side{};
};

struct CubeMesh {
    std::array<Vec3, 8> vertices{};
    std::array<Face, 12> faces{};
};
#endif

using Triangle3 = std::array<Vec3, 3>;

// Vector math kế thừa Project 10.
inline Vec3 add(Vec3 a, Vec3 b) {
    return {a.x + b.x, a.y + b.y, a.z + b.z};
}

inline Vec3 subtract(Vec3 a, Vec3 b) {
    return {a.x - b.x, a.y - b.y, a.z - b.z};
}

inline Vec3 scale(Vec3 a, double s) {
    return {a.x * s, a.y * s, a.z * s};
}

inline double dot(Vec3 a, Vec3 b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
}

inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}

inline bool isFinite(Vec3 a) {
    return std::isfinite(a.x) && std::isfinite(a.y) && std::isfinite(a.z);
}

inline double length(Vec3 a) {
    return std::sqrt(dot(a, a));
}

inline Vec3 normalize(Vec3 a) {
    const double magnitude = length(a);
    if (!std::isfinite(magnitude) || magnitude <= 1e-12) {
        return {};
    }
    return scale(a, 1.0 / magnitude);
}

inline Vec3 rotateX(Vec3 p, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {p.x, p.y * cosine - p.z * sine, p.y * sine + p.z * cosine};
}

inline Vec3 rotateY(Vec3 p, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {p.x * cosine + p.z * sine, p.y, -p.x * sine + p.z * cosine};
}

#if LAB_CHECKPOINT >= 1
// Hai triangle mỗi mặt dùng chung material. Độ sáng không tra theo side.
inline CubeMesh makeCube() {
    CubeMesh mesh;
    mesh.vertices = {
        Vec3{-1.0, -1.0, -1.0},
        Vec3{1.0, -1.0, -1.0},
        Vec3{1.0, 1.0, -1.0},
        Vec3{-1.0, 1.0, -1.0},
        Vec3{-1.0, -1.0, 1.0},
        Vec3{1.0, -1.0, 1.0},
        Vec3{1.0, 1.0, 1.0},
        Vec3{-1.0, 1.0, 1.0},
    };

    // Mỗi cặp triangle tạo một mặt vuông, winding cùng hướng ra ngoài.
    mesh.faces = {
        Face{{0, 2, 1}, 0},
        Face{{0, 3, 2}, 0},
        Face{{5, 7, 4}, 1},
        Face{{5, 6, 7}, 1},
        Face{{4, 3, 0}, 2},
        Face{{4, 7, 3}, 2},
        Face{{1, 6, 5}, 3},
        Face{{1, 2, 6}, 3},
        Face{{3, 6, 2}, 4},
        Face{{3, 7, 6}, 4},
        Face{{4, 1, 5}, 5},
        Face{{4, 0, 1}, 5},
    };
    return mesh;
}

inline Triangle3 faceVertices(const CubeMesh& mesh, const Face& face) {
    return {mesh.vertices[face.indices[0]], mesh.vertices[face.indices[1]], mesh.vertices[face.indices[2]]};
}

inline CubeMesh transformMesh(const CubeMesh& mesh, double pitch, double yaw) {
    CubeMesh world = mesh;
    for (std::size_t i = 0; i < mesh.vertices.size(); ++i) {
        world.vertices[i] = rotateY(rotateX(mesh.vertices[i], pitch), yaw);
    }
    return world;
}
#endif

inline Vec3 faceCentroid(const Triangle3& vertices) {
    return scale(add(add(vertices[0], vertices[1]), vertices[2]), 1.0 / 3.0);
}
#if LAB_CHECKPOINT >= 2
inline Vec3 faceUnitNormal(const Triangle3& vertices) {
    const Vec3 edgeAB = subtract(vertices[1], vertices[0]);
    const Vec3 edgeAC = subtract(vertices[2], vertices[0]);
    return normalize(cross(edgeAB, edgeAC));
}

inline bool hasOutwardWinding(const Triangle3& vertices, Vec3 meshCenter = {}) {
    return dot(faceUnitNormal(vertices), subtract(faceCentroid(vertices), meshCenter)) > 0.0;
}
#endif

// Camera nhìn vào origin; +Z trong view hướng vào màn hình, +Y hướng lên.
struct Camera {
    double yaw{};
    double pitch{};
    double distance{5.5};
};

inline Vec3 cameraPosition(const Camera& camera) {
    return rotateY(rotateX({0, 0, -camera.distance}, camera.pitch), camera.yaw);
}

inline Vec3 worldToView(Vec3 p, const Camera& camera) {
    return rotateX(rotateY(subtract(p, cameraPosition(camera)), -camera.yaw), -camera.pitch);
}

inline Vec3 directionToView(Vec3 direction, const Camera& camera) {
    return rotateX(rotateY(direction, -camera.yaw), -camera.pitch);
}
} // namespace lab
