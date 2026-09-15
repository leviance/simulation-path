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
#define LAB_CHECKPOINT 7
#endif

namespace lab {
#if LAB_CHECKPOINT >= 1
// Mesh chỉ giữ tám position; mười hai triangle tham chiếu chúng bằng index.
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
            IndexedTriangle{{0, 1, 2}, {239, 90, 102, 255}, "front"},
            IndexedTriangle{{0, 2, 3}, {239, 90, 102, 255}, "front"},
            IndexedTriangle{{5, 4, 7}, {92, 140, 246, 255}, "back"},
            IndexedTriangle{{5, 7, 6}, {92, 140, 246, 255}, "back"},
            IndexedTriangle{{4, 0, 3}, {169, 112, 232, 255}, "left"},
            IndexedTriangle{{4, 3, 7}, {169, 112, 232, 255}, "left"},
            IndexedTriangle{{1, 5, 6}, {74, 214, 166, 255}, "right"},
            IndexedTriangle{{1, 6, 2}, {74, 214, 166, 255}, "right"},
            IndexedTriangle{{3, 2, 6}, {246, 184, 72, 255}, "top"},
            IndexedTriangle{{3, 6, 7}, {246, 184, 72, 255}, "top"},
            IndexedTriangle{{4, 5, 1}, {55, 190, 220, 255}, "bottom"},
            IndexedTriangle{{4, 1, 0}, {55, 190, 220, 255}, "bottom"},
        },
    };
}

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

struct ScreenVertex {
    double x{};
    double y{};
    double ndcDepth{};
};

struct ScreenTriangle {
    ScreenVertex a{};
    ScreenVertex b{};
    ScreenVertex c{};
    Color color{};
    const char* faceName{};
};

inline ScreenVertex projectVertex(
    Vec3 point,
    int width,
    int height,
    double nearPlane = 1.0,
    double farPlane = 10.0
) {
    const double verticalFovRadians = 3.14159265358979323846 / 3.0;
    const double focalScale = 1.0 / std::tan(verticalFovRadians * 0.5);
    const double aspectRatio = double(width) / double(height);
    const double ndcX = point.x * focalScale / (aspectRatio * point.z);
    const double ndcY = point.y * focalScale / point.z;
    const double depthRange = farPlane - nearPlane;
    const double ndcDepth = farPlane / depthRange - nearPlane * farPlane / (depthRange * point.z);
    return {
        (ndcX * 0.5 + 0.5) * double(width),
        (0.5 - ndcY * 0.5) * double(height),
        ndcDepth,
    };
}

inline std::array<ScreenVertex, 8> projectCube(
    const CubeMesh& mesh,
    int width,
    int height,
    double angleX,
    double angleY
) {
    std::array<ScreenVertex, 8> result{};
    for (std::size_t index = 0; index < mesh.vertices.size(); ++index) {
        Vec3 cameraPoint = rotateCubeVertex(mesh.vertices[index], angleX, angleY);
        cameraPoint.z += 4.2;
        result[index] = projectVertex(cameraPoint, width, height);
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

struct Barycentric {
    double a{};
    double b{};
    double c{};
};

inline double orient2D(const ScreenVertex& a, const ScreenVertex& b, double x, double y) {
    return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
}

inline bool isTopLeftEdge(const ScreenVertex& a, const ScreenVertex& b) {
    const double deltaX = b.x - a.x;
    const double deltaY = b.y - a.y;
    return deltaY < -1e-9 || (std::abs(deltaY) <= 1e-9 && deltaX > 1e-9);
}

inline bool acceptsEdge(double value, bool topLeft) {
    if (value > 1e-9) {
        return true;
    }
    if (value < -1e-9) {
        return false;
    }
    return topLeft;
}

inline ScreenTriangle normalizeWinding(ScreenTriangle triangle) {
    if (orient2D(triangle.a, triangle.b, triangle.c.x, triangle.c.y) < 0.0) {
        std::swap(triangle.b, triangle.c);
    }
    return triangle;
}

template <typename ShadeFragment>
inline std::size_t rasterizeTriangle(
    ScreenTriangle source,
    int width,
    int height,
    ShadeFragment shadeFragment
) {
    const ScreenTriangle triangle = normalizeWinding(source);
    const double area = orient2D(triangle.a, triangle.b, triangle.c.x, triangle.c.y);
    if (area <= 1e-9 || width <= 0 || height <= 0) {
        return 0;
    }

    const int minX = std::clamp(
        int(std::floor(std::min({triangle.a.x, triangle.b.x, triangle.c.x}))),
        0,
        width - 1
    );
    const int minY = std::clamp(
        int(std::floor(std::min({triangle.a.y, triangle.b.y, triangle.c.y}))),
        0,
        height - 1
    );
    const int maxX = std::clamp(
        int(std::ceil(std::max({triangle.a.x, triangle.b.x, triangle.c.x}))) - 1,
        0,
        width - 1
    );
    const int maxY = std::clamp(
        int(std::ceil(std::max({triangle.a.y, triangle.b.y, triangle.c.y}))) - 1,
        0,
        height - 1
    );

    std::size_t coveredCount = 0;
    for (int y = minY; y <= maxY; ++y) {
        for (int x = minX; x <= maxX; ++x) {
            const double sampleX = double(x) + 0.5;
            const double sampleY = double(y) + 0.5;
            const double edgeAB = orient2D(triangle.a, triangle.b, sampleX, sampleY);
            const double edgeBC = orient2D(triangle.b, triangle.c, sampleX, sampleY);
            const double edgeCA = orient2D(triangle.c, triangle.a, sampleX, sampleY);
            const bool inside = acceptsEdge(edgeAB, isTopLeftEdge(triangle.a, triangle.b)) &&
                acceptsEdge(edgeBC, isTopLeftEdge(triangle.b, triangle.c)) &&
                acceptsEdge(edgeCA, isTopLeftEdge(triangle.c, triangle.a));
            if (!inside) {
                continue;
            }

            const Barycentric weights{edgeBC / area, edgeCA / area, edgeAB / area};
            shadeFragment(x, y, weights, triangle);
            ++coveredCount;
        }
    }
    return coveredCount;
}

inline std::uint32_t packColor(Color color) {
    return (std::uint32_t(color.red) << 24U) | (std::uint32_t(color.green) << 16U) |
        (std::uint32_t(color.blue) << 8U) | std::uint32_t(color.alpha);
}
#endif

#if LAB_CHECKPOINT >= 2
inline std::size_t triangleIndexAt(std::size_t position, std::size_t count, bool reverseOrder) {
    if (position >= count) {
        return count;
    }
    if (reverseOrder) {
        return count - 1 - position;
    }
    return position;
}
#endif

#if LAB_CHECKPOINT >= 3
// Depth buffer dùng cùng row-major index với color buffer.
struct DepthBuffer {
    DepthBuffer(int width, int height, double clearDepth = 1.0) {
        resize(width, height, clearDepth);
    }

    void resize(int width, int height, double clearDepth = 1.0) {
        width_ = std::max(1, width);
        height_ = std::max(1, height);
        values_.assign(std::size_t(width_) * std::size_t(height_), clearDepth);
    }

    void clear(double clearDepth = 1.0) {
        std::fill(values_.begin(), values_.end(), clearDepth);
    }

    [[nodiscard]] std::size_t index(int x, int y) const {
        return std::size_t(y) * std::size_t(width_) + std::size_t(x);
    }

    [[nodiscard]] double at(int x, int y) const {
        return values_[index(x, y)];
    }

    double& at(int x, int y) {
        return values_[index(x, y)];
    }

    [[nodiscard]] int width() const {
        return width_;
    }

    [[nodiscard]] int height() const {
        return height_;
    }

    [[nodiscard]] const std::vector<double>& values() const {
        return values_;
    }

    int width_{1};
    int height_{1};
    std::vector<double> values_{1, 1.0};
};
#endif

#if LAB_CHECKPOINT >= 4
inline double interpolateNdcDepth(const ScreenTriangle& triangle, Barycentric weights) {
    return weights.a * triangle.a.ndcDepth + weights.b * triangle.b.ndcDepth +
        weights.c * triangle.c.ndcDepth;
}
#endif

#if LAB_CHECKPOINT >= 5
struct DepthTestResult {
    double storedDepth{};
    double newDepth{};
    bool passed{};
};

inline DepthTestResult depthTestAndWrite(
    DepthBuffer& depthBuffer,
    int x,
    int y,
    double newDepth,
    bool depthEnabled = true
) {
    double& storedDepth = depthBuffer.at(x, y);
    const DepthTestResult result{
        storedDepth,
        newDepth,
        !depthEnabled || newDepth < storedDepth,
    };
    if (result.passed) {
        storedDepth = newDepth;
    }
    return result;
}
#endif

#if LAB_CHECKPOINT >= 6
struct RenderStats {
    std::size_t coveredCount{};
    std::size_t passedCount{};
    std::size_t rejectedCount{};
};

inline RenderStats renderCube(
    const CubeMesh& mesh,
    int width,
    int height,
    double angleX,
    double angleY,
    bool reverseOrder,
    bool depthEnabled,
    std::vector<std::uint32_t>& colorBuffer,
    DepthBuffer& depthBuffer
) {
    const auto vertices = projectCube(mesh, width, height, angleX, angleY);
    RenderStats stats{};
    for (std::size_t position = 0; position < mesh.triangles.size(); ++position) {
        const std::size_t triangleIndex = triangleIndexAt(
            position,
            mesh.triangles.size(),
            reverseOrder
        );
        const ScreenTriangle triangle = screenTriangle(mesh.triangles[triangleIndex], vertices);
        stats.coveredCount += rasterizeTriangle(
            triangle,
            width,
            height,
            [&](int x, int y, Barycentric weights, const ScreenTriangle& normalized) {
                const double depth = interpolateNdcDepth(normalized, weights);
                const DepthTestResult test = depthTestAndWrite(
                    depthBuffer,
                    x,
                    y,
                    depth,
                    depthEnabled
                );
                if (!test.passed) {
                    ++stats.rejectedCount;
                    return;
                }
                colorBuffer[depthBuffer.index(x, y)] = packColor(normalized.color);
                ++stats.passedCount;
            }
        );
    }
    return stats;
}
#endif

#if LAB_CHECKPOINT >= 7
inline bool buffersNearlyEqual(
    const std::vector<double>& first,
    const std::vector<double>& second,
    double epsilon = 1e-9
) {
    if (first.size() != second.size()) {
        return false;
    }
    for (std::size_t index = 0; index < first.size(); ++index) {
        if (std::abs(first[index] - second[index]) > epsilon) {
            return false;
        }
    }
    return true;
}

inline std::uint8_t depthShade(double depth) {
    if (!std::isfinite(depth) || depth >= 1.0) {
        return 12;
    }
    const double brightness = (1.0 - std::clamp(depth, 0.0, 1.0)) * 235.0 + 20.0;
    return std::uint8_t(std::lround(brightness));
}
#endif
} // namespace lab
