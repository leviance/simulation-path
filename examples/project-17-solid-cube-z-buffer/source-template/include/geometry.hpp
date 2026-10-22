#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <utility>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

namespace lab {
// Dữ liệu có sẵn trong Starter; mesh và depth được bổ sung theo bài.
struct Vec3 {
    double x{};
    double y{};
    double z{};
};

struct Color {
    std::uint8_t red{};
    std::uint8_t green{};
    std::uint8_t blue{};
    std::uint8_t alpha{255};
};

struct IndexedTriangle {
    std::array<std::size_t, 3> indices{};
    Color color{};
    const char* faceName{};
};

struct CubeMesh {
    std::array<Vec3, 8> vertices{};
    std::array<IndexedTriangle, 12> triangles{};
};

struct ScreenVertex {
    double x{};
    double y{};
    double ndcDepth{};
    bool valid{true};
};

struct ScreenTriangle {
    ScreenVertex a{};
    ScreenVertex b{};
    ScreenVertex c{};
    Color color{};
    const char* faceName{};
};

struct Barycentric {
    double a{};
    double b{};
    double c{};
};

struct RenderStats {
    std::size_t coveredCount{};
    std::size_t passedCount{};
    std::size_t rejectedCount{};
    std::size_t submittedCount{};
    std::size_t culledCount{};
    std::size_t invalidCount{};
};

struct FragmentTrace {
    std::size_t triangleIndex{};
    Barycentric weights{};
    double newDepth{};
    double storedDepth{1.0};
    bool passed{};
};

struct PixelProbe {
    int x{550};
    int y{300};
    std::vector<FragmentTrace> traces{};
};

inline Vec3 rotateCubeVertex(Vec3 point, double angleX, double angleY) {
    const double cosineY = std::cos(angleY);
    const double sineY = std::sin(angleY);
    const Vec3 afterY{
        point.x * cosineY + point.z * sineY,
        point.y,
        -point.x * sineY + point.z * cosineY,
    };

    const double cosineX = std::cos(angleX);
    const double sineX = std::sin(angleX);
    return {
        afterY.x,
        afterY.y * cosineX - afterY.z * sineX,
        afterY.y * sineX + afterY.z * cosineX,
    };
}

inline ScreenVertex projectVertex(Vec3 point, int width, int height, double nearPlane = 1.0, double farPlane = 10.0) {
    if (width <= 0 || height <= 0 || !std::isfinite(point.x) || !std::isfinite(point.y) || !std::isfinite(point.z) || !std::isfinite(nearPlane) || !std::isfinite(farPlane) || nearPlane <= 0.0 || farPlane <= nearPlane || point.z < nearPlane || point.z > farPlane) {
        return {0.0, 0.0, 0.0, false};
    }
    const double focalPixels = height * 0.5 / std::tan(3.14159265358979323846 / 6.0);
    const double depthRange = farPlane - nearPlane;
    const double ndcDepth = farPlane / depthRange - nearPlane * farPlane / (depthRange * point.z);
    return {width * 0.5 + focalPixels * point.x / point.z, height * 0.5 - focalPixels * point.y / point.z, ndcDepth, true};
}

#if LAB_CHECKPOINT >= 1
inline CubeMesh makeCubeMesh() {
    return {
        {
            Vec3{-1.0, -1.0, -1.0},
            Vec3{1.0, -1.0, -1.0},
            Vec3{1.0, 1.0, -1.0},
            Vec3{-1.0, 1.0, -1.0},
            Vec3{-1.0, -1.0, 1.0},
            Vec3{1.0, -1.0, 1.0},
            Vec3{1.0, 1.0, 1.0},
            Vec3{-1.0, 1.0, 1.0},
        },
        {
            IndexedTriangle{{0, 2, 1}, {239, 90, 102, 255}, "front"},
            IndexedTriangle{{0, 3, 2}, {239, 90, 102, 255}, "front"},
            IndexedTriangle{{5, 7, 4}, {92, 140, 246, 255}, "back"},
            IndexedTriangle{{5, 6, 7}, {92, 140, 246, 255}, "back"},
            IndexedTriangle{{4, 3, 0}, {169, 112, 232, 255}, "left"},
            IndexedTriangle{{4, 7, 3}, {169, 112, 232, 255}, "left"},
            IndexedTriangle{{1, 6, 5}, {74, 214, 166, 255}, "right"},
            IndexedTriangle{{1, 2, 6}, {74, 214, 166, 255}, "right"},
            IndexedTriangle{{3, 6, 2}, {246, 184, 72, 255}, "top"},
            IndexedTriangle{{3, 7, 6}, {246, 184, 72, 255}, "top"},
            IndexedTriangle{{4, 1, 5}, {55, 190, 220, 255}, "bottom"},
            IndexedTriangle{{4, 0, 1}, {55, 190, 220, 255}, "bottom"},
        },
    };
}

inline std::array<ScreenVertex, 8> projectCube(const CubeMesh& mesh, int width, int height, double angleX, double angleY, Vec3 camera = {}) {
    std::array<ScreenVertex, 8> result{};
    for (std::size_t index = 0; index < mesh.vertices.size(); ++index) {
        const Vec3 rotated = rotateCubeVertex(mesh.vertices[index], angleX, angleY);
        const Vec3 view{rotated.x - camera.x, rotated.y - camera.y, rotated.z + 4.2 - camera.z};
        result[index] = projectVertex(view, width, height);
    }
    return result;
}

inline ScreenTriangle screenTriangle(
    const IndexedTriangle& triangle,
    const std::array<ScreenVertex, 8>& vertices
) {
    return {
        vertices[triangle.indices[0]],
        vertices[triangle.indices[1]],
        vertices[triangle.indices[2]],
        triangle.color,
        triangle.faceName,
    };
}
#endif
} // namespace lab
