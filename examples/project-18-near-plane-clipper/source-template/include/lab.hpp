#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <limits>
#include <optional>
#include <utility>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
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

// Color dùng double để các vertex mới sinh ra khi clipping không bị làm tròn sớm.
struct Color {
    double red{};
    double green{};
    double blue{};
};

struct ClipVertex {
    Vec3 position{};
    Color color{};
};

struct Triangle3 {
    ClipVertex a{};
    ClipVertex b{};
    ClipVertex c{};
};

inline Triangle3 makeDefaultTriangle() {
    return {
        {{-1.15, -0.85, 0.45}, {255.0, 92.0, 106.0}},
        {{1.15, -0.70, 3.20}, {78.0, 232.0, 163.0}},
        {{0.00, 1.05, 2.25}, {93.0, 145.0, 255.0}},
    };
}

inline ClipVertex vertexAt(const Triangle3& triangle, int index) {
    if (index == 0) {
        return triangle.a;
    }
    if (index == 1) {
        return triangle.b;
    }
    return triangle.c;
}

inline Triangle3 moveAlongDepth(Triangle3 triangle, double depthOffset) {
    triangle.a.position.z += depthOffset;
    triangle.b.position.z += depthOffset;
    triangle.c.position.z += depthOffset;
    return triangle;
}
#endif

#if LAB_CHECKPOINT >= 2
struct NearPlaneCounts {
    int inside{};
    int outside{};
    int onPlane{};
};

inline double signedDistanceToNearPlane(const ClipVertex& vertex, double nearPlane) {
    return vertex.position.z - nearPlane;
}

inline bool isInsideNearPlane(
    const ClipVertex& vertex,
    double nearPlane,
    double epsilon = 1e-9
) {
    return signedDistanceToNearPlane(vertex, nearPlane) >= -epsilon;
}

inline NearPlaneCounts classifyTriangle(
    const Triangle3& triangle,
    double nearPlane,
    double epsilon = 1e-9
) {
    NearPlaneCounts counts{};
    for (int index = 0; index < 3; ++index) {
        const double distance = signedDistanceToNearPlane(vertexAt(triangle, index), nearPlane);
        if (std::abs(distance) <= epsilon) {
            ++counts.onPlane;
            ++counts.inside;
        } else if (distance > 0.0) {
            ++counts.inside;
        } else {
            ++counts.outside;
        }
    }
    return counts;
}
#endif

#if LAB_CHECKPOINT >= 3
inline double mix(double start, double end, double t) {
    return start + (end - start) * t;
}

inline ClipVertex interpolateVertex(const ClipVertex& start, const ClipVertex& end, double t) {
    return {
        {
            mix(start.position.x, end.position.x, t),
            mix(start.position.y, end.position.y, t),
            mix(start.position.z, end.position.z, t),
        },
        {
            mix(start.color.red, end.color.red, t),
            mix(start.color.green, end.color.green, t),
            mix(start.color.blue, end.color.blue, t),
        },
    };
}

inline ClipVertex intersectNearPlane(
    const ClipVertex& start,
    const ClipVertex& end,
    double nearPlane
) {
    const double depthChange = end.position.z - start.position.z;
    if (std::abs(depthChange) <= 1e-12) {
        ClipVertex result = start;
        result.position.z = nearPlane;
        return result;
    }

    const double unclampedT = (nearPlane - start.position.z) / depthChange;
    const double t = std::clamp(unclampedT, 0.0, 1.0);
    ClipVertex result = interpolateVertex(start, end, t);
    result.position.z = nearPlane;
    return result;
}
#endif

#if LAB_CHECKPOINT >= 4
struct ClippedPolygon {
    std::array<ClipVertex, 4> vertices{};
    std::size_t count{};
};

inline void appendVertex(ClippedPolygon& polygon, const ClipVertex& vertex) {
    if (polygon.count < polygon.vertices.size()) {
        polygon.vertices[polygon.count] = vertex;
        ++polygon.count;
    }
}

// Sutherland–Hodgman xử lý lần lượt ba cạnh có hướng của triangle.
inline ClippedPolygon clipTriangleToNearPlane(
    const Triangle3& triangle,
    double nearPlane,
    double epsilon = 1e-9
) {
    const std::array<ClipVertex, 3> input{triangle.a, triangle.b, triangle.c};
    ClippedPolygon output{};

    ClipVertex previous = input.back();
    bool previousInside = isInsideNearPlane(previous, nearPlane, epsilon);

    for (const ClipVertex& current : input) {
        const bool currentInside = isInsideNearPlane(current, nearPlane, epsilon);

        if (currentInside && !previousInside) {
            appendVertex(output, intersectNearPlane(previous, current, nearPlane));
        }
        if (currentInside) {
            appendVertex(output, current);
        }
        if (!currentInside && previousInside) {
            appendVertex(output, intersectNearPlane(previous, current, nearPlane));
        }

        previous = current;
        previousInside = currentInside;
    }
    return output;
}
#endif

#if LAB_CHECKPOINT >= 5
struct TriangleBatch {
    std::array<Triangle3, 2> triangles{};
    std::size_t count{};
};

inline TriangleBatch triangulateFan(const ClippedPolygon& polygon) {
    TriangleBatch batch{};
    if (polygon.count < 3) {
        return batch;
    }

    for (std::size_t index = 1; index + 1 < polygon.count; ++index) {
        batch.triangles[batch.count] = {
            polygon.vertices[0],
            polygon.vertices[index],
            polygon.vertices[index + 1],
        };
        ++batch.count;
    }
    return batch;
}
#endif

#if LAB_CHECKPOINT >= 6
struct Viewport {
    int left{};
    int top{};
    int width{};
    int height{};
};

struct ScreenVertex {
    Vec2 position{};
    Color color{};
};

struct ScreenTriangle {
    ScreenVertex a{};
    ScreenVertex b{};
    ScreenVertex c{};
};

struct RasterStats {
    std::size_t candidateCount{};
    std::size_t coveredCount{};
};

inline std::optional<ScreenVertex> projectVertex(
    const ClipVertex& vertex,
    double verticalFovRadians,
    const Viewport& viewport,
    double nearPlane
) {
    if (vertex.position.z < nearPlane || viewport.width <= 0 || viewport.height <= 0) {
        return std::nullopt;
    }

    const double aspectRatio = double(viewport.width) / double(viewport.height);
    const double focalScale = 1.0 / std::tan(verticalFovRadians * 0.5);
    const double ndcX = vertex.position.x * focalScale / (aspectRatio * vertex.position.z);
    const double ndcY = vertex.position.y * focalScale / vertex.position.z;

    return ScreenVertex{
        {
            double(viewport.left) + (ndcX + 1.0) * 0.5 * double(viewport.width),
            double(viewport.top) + (1.0 - ndcY) * 0.5 * double(viewport.height),
        },
        vertex.color,
    };
}

inline std::optional<ScreenTriangle> projectTriangle(
    const Triangle3& triangle,
    double verticalFovRadians,
    const Viewport& viewport,
    double nearPlane
) {
    const auto a = projectVertex(triangle.a, verticalFovRadians, viewport, nearPlane);
    const auto b = projectVertex(triangle.b, verticalFovRadians, viewport, nearPlane);
    const auto c = projectVertex(triangle.c, verticalFovRadians, viewport, nearPlane);
    if (!a || !b || !c) {
        return std::nullopt;
    }
    return ScreenTriangle{*a, *b, *c};
}

inline double orient2D(Vec2 a, Vec2 b, Vec2 point) {
    const double edgeX = b.x - a.x;
    const double edgeY = b.y - a.y;
    const double offsetX = point.x - a.x;
    const double offsetY = point.y - a.y;
    return edgeX * offsetY - edgeY * offsetX;
}

inline bool isTopLeftEdge(Vec2 a, Vec2 b, double epsilon = 1e-9) {
    const double deltaX = b.x - a.x;
    const double deltaY = b.y - a.y;
    return deltaY < -epsilon || (std::abs(deltaY) <= epsilon && deltaX > epsilon);
}

inline bool acceptsEdge(double value, bool topLeft, double epsilon = 1e-9) {
    if (value > epsilon) {
        return true;
    }
    if (value < -epsilon) {
        return false;
    }
    return topLeft;
}

inline Color interpolateColor(Color a, Color b, Color c, double weightA, double weightB, double weightC) {
    return {
        weightA * a.red + weightB * b.red + weightC * c.red,
        weightA * a.green + weightB * b.green + weightC * c.green,
        weightA * a.blue + weightB * b.blue + weightC * c.blue,
    };
}

template <typename ShadePixel>
RasterStats rasterizeScreenTriangle(
    ScreenTriangle triangle,
    int framebufferWidth,
    int framebufferHeight,
    ShadePixel shadePixel
) {
    RasterStats stats{};
    double area = orient2D(triangle.a.position, triangle.b.position, triangle.c.position);
    if (std::abs(area) <= 1e-9) {
        return stats;
    }
    if (area < 0.0) {
        std::swap(triangle.b, triangle.c);
        area = -area;
    }

    const double minimumX = std::min({
        triangle.a.position.x,
        triangle.b.position.x,
        triangle.c.position.x,
    });
    const double minimumY = std::min({
        triangle.a.position.y,
        triangle.b.position.y,
        triangle.c.position.y,
    });
    const double maximumX = std::max({
        triangle.a.position.x,
        triangle.b.position.x,
        triangle.c.position.x,
    });
    const double maximumY = std::max({
        triangle.a.position.y,
        triangle.b.position.y,
        triangle.c.position.y,
    });

    const int minX = std::clamp(int(std::floor(minimumX)), 0, framebufferWidth - 1);
    const int minY = std::clamp(int(std::floor(minimumY)), 0, framebufferHeight - 1);
    const int maxX = std::clamp(int(std::ceil(maximumX)) - 1, 0, framebufferWidth - 1);
    const int maxY = std::clamp(int(std::ceil(maximumY)) - 1, 0, framebufferHeight - 1);
    if (maxX < minX || maxY < minY) {
        return stats;
    }

    stats.candidateCount = std::size_t(maxX - minX + 1) * std::size_t(maxY - minY + 1);
    for (int y = minY; y <= maxY; ++y) {
        for (int x = minX; x <= maxX; ++x) {
            const Vec2 sample{double(x) + 0.5, double(y) + 0.5};
            const double edgeAB = orient2D(triangle.a.position, triangle.b.position, sample);
            const double edgeBC = orient2D(triangle.b.position, triangle.c.position, sample);
            const double edgeCA = orient2D(triangle.c.position, triangle.a.position, sample);
            const bool inside =
                acceptsEdge(edgeAB, isTopLeftEdge(triangle.a.position, triangle.b.position)) &&
                acceptsEdge(edgeBC, isTopLeftEdge(triangle.b.position, triangle.c.position)) &&
                acceptsEdge(edgeCA, isTopLeftEdge(triangle.c.position, triangle.a.position));
            if (!inside) {
                continue;
            }

            const double weightA = edgeBC / area;
            const double weightB = edgeCA / area;
            const double weightC = edgeAB / area;
            const Color color = interpolateColor(
                triangle.a.color,
                triangle.b.color,
                triangle.c.color,
                weightA,
                weightB,
                weightC
            );
            shadePixel(x, y, color);
            ++stats.coveredCount;
        }
    }
    return stats;
}
#endif

#if LAB_CHECKPOINT >= 7
struct ClipResult {
    NearPlaneCounts inputCounts{};
    ClippedPolygon polygon{};
    TriangleBatch batch{};
};

inline ClipResult clipForRender(const Triangle3& triangle, double nearPlane) {
    ClipResult result{};
    result.inputCounts = classifyTriangle(triangle, nearPlane);
    result.polygon = clipTriangleToNearPlane(triangle, nearPlane);
    result.batch = triangulateFan(result.polygon);
    return result;
}

inline bool isFinite(const ClipVertex& vertex) {
    return std::isfinite(vertex.position.x) && std::isfinite(vertex.position.y) &&
        std::isfinite(vertex.position.z) && std::isfinite(vertex.color.red) &&
        std::isfinite(vertex.color.green) && std::isfinite(vertex.color.blue);
}

inline double maximumNearPlaneViolation(const ClippedPolygon& polygon, double nearPlane) {
    double violation = 0.0;
    for (std::size_t index = 0; index < polygon.count; ++index) {
        violation = std::max(violation, nearPlane - polygon.vertices[index].position.z);
    }
    return violation;
}
#endif
} // namespace lab
