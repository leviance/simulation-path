#pragma once
#include "rotation.hpp"
#include <array>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

namespace lab {
#if LAB_CHECKPOINT >= 1
constexpr std::size_t kCubeVertexCount = 8;
using CubeVertices = std::array<Vec3, kCubeVertexCount>;

// Hai vòng 0..3 và 4..7 có cùng thứ tự X/Y, chỉ khác dấu Z.
inline CubeVertices makeCubeVertices(double halfExtent) {
    const double h = std::abs(halfExtent);
    CubeVertices vertices{};
    vertices[0] = {-h, -h, -h};
    vertices[1] = {h, -h, -h};
    vertices[2] = {h, h, -h};
    vertices[3] = {-h, h, -h};
    vertices[4] = {-h, -h, h};
    vertices[5] = {h, -h, h};
    vertices[6] = {h, h, h};
    vertices[7] = {-h, h, h};
    return vertices;
}

inline CubeVertices translateCube(const CubeVertices& local, Vec3 position) {
    CubeVertices world{};
    for (std::size_t i = 0; i < local.size(); ++i) {
        world[i] = add(local[i], position);
    }
    return world;
}
#endif
#if LAB_CHECKPOINT >= 2
struct Edge {
    std::size_t from;
    std::size_t to;
};

// Chỉ lưu quan hệ giữa index; không chứa tọa độ screen.
constexpr std::array<Edge, 12> kCubeEdges{{
    {0, 1},
    {1, 2},
    {2, 3},
    {3, 0},
    {4, 5},
    {5, 6},
    {6, 7},
    {7, 4},
    {0, 4},
    {1, 5},
    {2, 6},
    {3, 7},
}};

inline bool isEdgeValid(Edge edge) {
    return edge.from < kCubeVertexCount && edge.to < kCubeVertexCount && edge.from != edge.to;
}
#endif
#if LAB_CHECKPOINT >= 3
inline CubeVertices rotateCube(const CubeVertices& local, EulerAngles angles, RotationOrder order) {
    CubeVertices rotated{};
    for (std::size_t i = 0; i < local.size(); ++i) {
        rotated[i] = rotateEuler(local[i], angles, order);
    }
    return rotated;
}
#endif
#if LAB_CHECKPOINT >= 7
inline bool hasValidCubeTopology() {
    std::array<int, kCubeVertexCount> degree{};
    for (std::size_t i = 0; i < kCubeEdges.size(); ++i) {
        const Edge edge = kCubeEdges[i];
        if (!isEdgeValid(edge)) {
            return false;
        }
        ++degree[edge.from];
        ++degree[edge.to];
        for (std::size_t j = 0; j < i; ++j) {
            const Edge other = kCubeEdges[j];
            if ((edge.from == other.from && edge.to == other.to) || (edge.from == other.to && edge.to == other.from)) {
                return false;
            }
        }
    }
    return std::all_of(degree.begin(), degree.end(), [](int value) {
        return value == 3;
    });
}

inline double maximumCubeEdgeLengthError(const CubeVertices& before, const CubeVertices& after) {
    double error = 0.0;
    for (const Edge edge : kCubeEdges) {
        const double a = magnitude(subtract(before[edge.to], before[edge.from]));
        const double b = magnitude(subtract(after[edge.to], after[edge.from]));
        error = std::max(error, std::abs(a - b));
    }
    return error;
}

inline double cubeRotationRoundTripError(const CubeVertices& local, EulerAngles angles, RotationOrder order) {
    double error = 0.0;
    for (const Vec3 point : local) {
        const Vec3 rotated = rotateEuler(point, angles, order);
        const Vec3 restored = inverseRotateEuler(rotated, angles, order);
        error = std::max(error, magnitude(subtract(restored, point)));
    }
    return error;
}
#endif
} // namespace lab
