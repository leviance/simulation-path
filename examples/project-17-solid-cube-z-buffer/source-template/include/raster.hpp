#pragma once
#include "geometry.hpp"

namespace lab {
// Rasterizer top-left của Project 16: callback nhận triangle đã chuẩn hóa.
inline bool validTriangle(const ScreenTriangle& t) {
    for (const auto p : {t.a, t.b, t.c}) {
        if (!p.valid || !std::isfinite(p.x) || !std::isfinite(p.y) || !std::isfinite(p.ndcDepth)) {
            return false;
        }
    }
    return true;
}

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
    if (area <= 1e-9 || width <= 0 || height <= 0 || !validTriangle(triangle)) {
        return 0;
    }

    const double lowX = std::min({triangle.a.x, triangle.b.x, triangle.c.x});
    const double lowY = std::min({triangle.a.y, triangle.b.y, triangle.c.y});
    const double highX = std::max({triangle.a.x, triangle.b.x, triangle.c.x});
    const double highY = std::max({triangle.a.y, triangle.b.y, triangle.c.y});
    if (highX < 0.0 || highY < 0.0 || lowX >= width || lowY >= height) {
        return 0;
    }
    const int minX = static_cast<int>(std::clamp(std::floor(lowX), 0.0, double(width - 1)));
    const int minY = static_cast<int>(std::clamp(std::floor(lowY), 0.0, double(height - 1)));
    const int maxX = static_cast<int>(std::clamp(std::ceil(highX) - 1.0, -1.0, double(width - 1)));
    const int maxY = static_cast<int>(std::clamp(std::ceil(highY) - 1.0, -1.0, double(height - 1)));

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
} // namespace lab
