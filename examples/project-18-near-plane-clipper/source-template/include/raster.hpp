#pragma once
#include "types.hpp"

namespace lab {
// Projection có guard và top-left rasterizer từ Project 16.
inline std::optional<ScreenVertex> projectVertex(
    const ClipVertex& vertex,
    double verticalFovRadians,
    const Viewport& viewport,
    double nearPlane
) {
    if (!isFinite(vertex) || !std::isfinite(nearPlane) || nearPlane <= 0.0 || !std::isfinite(verticalFovRadians) || verticalFovRadians <= 0.0 || verticalFovRadians >= 3.141592653589793 || vertex.position.z < nearPlane || viewport.width <= 0 || viewport.height <= 0) {
        return std::nullopt;
    }

    const double aspectRatio = double(viewport.width) / double(viewport.height);
    const double focalScale = 1.0 / std::tan(verticalFovRadians * 0.5);
    const double ndcX = vertex.position.x * focalScale / (aspectRatio * vertex.position.z);
    const double ndcY = vertex.position.y * focalScale / vertex.position.z;

    if (!std::isfinite(ndcX) || !std::isfinite(ndcY)) {
        return std::nullopt;
    }
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
    if (framebufferWidth <= 0 || framebufferHeight <= 0 || !std::isfinite(area) || std::abs(area) <= 1e-9 || !std::isfinite(triangle.a.position.x) || !std::isfinite(triangle.a.position.y) || !std::isfinite(triangle.b.position.x) || !std::isfinite(triangle.b.position.y) || !std::isfinite(triangle.c.position.x) || !std::isfinite(triangle.c.position.y)) {
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

    if (maximumX < 0.0 || maximumY < 0.0 || minimumX >= framebufferWidth || minimumY >= framebufferHeight) {
        return stats;
    }
    const int minX = static_cast<int>(std::clamp(std::floor(minimumX), 0.0, double(framebufferWidth - 1)));
    const int minY = static_cast<int>(std::clamp(std::floor(minimumY), 0.0, double(framebufferHeight - 1)));
    const int maxX = static_cast<int>(std::clamp(std::ceil(maximumX) - 1.0, -1.0, double(framebufferWidth - 1)));
    const int maxY = static_cast<int>(std::clamp(std::ceil(maximumY) - 1.0, -1.0, double(framebufferHeight - 1)));
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
} // namespace lab
