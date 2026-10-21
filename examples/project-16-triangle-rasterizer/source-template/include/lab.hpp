#pragma once
#include <algorithm>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <utility>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

namespace lab {
// Các kiểu dữ liệu có sẵn trong Starter; thuật toán được thêm qua từng bài.
struct Vec2 {
    double x{};
    double y{};
};

struct Triangle2 {
    Vec2 a{};
    Vec2 b{};
    Vec2 c{};
};

struct IntRect {
    int minX{};
    int minY{};
    int maxX{-1};
    int maxY{-1};
};
enum class Winding {
    Positive,
    Negative,
    Degenerate
};

enum class FillRule {
    Inclusive,
    TopLeft
};

struct Barycentric {
    double a{};
    double b{};
    double c{};
};

struct CoverageSample {
    Vec2 position{};
    double edgeAB{};
    double edgeBC{};
    double edgeCA{};
    Barycentric barycentric{};
    bool inside{};
};

struct RasterStats {
    IntRect bounds{};
    std::size_t candidateCount{};
    std::size_t testedCount{};
    std::size_t coveredCount{};
    bool degenerate{};
};

struct Color {
    std::uint8_t red{};
    std::uint8_t green{};
    std::uint8_t blue{};
    std::uint8_t alpha{255};
};

inline bool finite(Vec2 point) {
    return std::isfinite(point.x) && std::isfinite(point.y);
}

inline bool finite(const Triangle2& triangle) {
    return finite(triangle.a) && finite(triangle.b) && finite(triangle.c);
}

#if LAB_CHECKPOINT >= 1
inline Vec2 vertexAt(const Triangle2& triangle, int index) {
    if (index == 0) {
        return triangle.a;
    }
    if (index == 1) {
        return triangle.b;
    }
    return triangle.c;
}
#endif

#if LAB_CHECKPOINT >= 2
inline bool isEmpty(IntRect bounds) {
    return bounds.maxX < bounds.minX || bounds.maxY < bounds.minY;
}

inline IntRect triangleBounds(const Triangle2& triangle, int width, int height) {
    if (width <= 0 || height <= 0 || !finite(triangle)) {
        return {};
    }
    const double minimumX = std::min({triangle.a.x, triangle.b.x, triangle.c.x});
    const double minimumY = std::min({triangle.a.y, triangle.b.y, triangle.c.y});
    const double maximumX = std::max({triangle.a.x, triangle.b.x, triangle.c.x});
    const double maximumY = std::max({triangle.a.y, triangle.b.y, triangle.c.y});
    // Phải kiểm rời nhau trước clamp; triangle ngoài màn hình có bounds rỗng.
    if (maximumX < 0.0 || maximumY < 0.0 || minimumX >= width || minimumY >= height) {
        return {};
    }
    IntRect bounds{};
    // Clamp double trước int: không cast NaN/Inf hoặc số vượt miền int.
    bounds.minX = static_cast<int>(std::clamp(std::floor(minimumX), 0.0, double(width - 1)));
    bounds.minY = static_cast<int>(std::clamp(std::floor(minimumY), 0.0, double(height - 1)));
    bounds.maxX = static_cast<int>(std::clamp(std::ceil(maximumX) - 1.0, -1.0, double(width - 1)));
    bounds.maxY = static_cast<int>(std::clamp(std::ceil(maximumY) - 1.0, -1.0, double(height - 1)));
    return bounds;
}

inline std::size_t candidatePixelCount(IntRect bounds) {
    if (isEmpty(bounds)) {
        return 0;
    }
    return static_cast<std::size_t>(bounds.maxX - bounds.minX + 1) * static_cast<std::size_t>(bounds.maxY - bounds.minY + 1);
}
#endif

#if LAB_CHECKPOINT >= 3
inline double orient2D(Vec2 a, Vec2 b, Vec2 point) {
    const Vec2 edge{b.x - a.x, b.y - a.y};
    const Vec2 offset{point.x - a.x, point.y - a.y};
    return edge.x * offset.y - edge.y * offset.x;
}

inline double signedDoubleArea(const Triangle2& triangle) {
    return orient2D(triangle.a, triangle.b, triangle.c);
}

inline Winding classifyWinding(const Triangle2& triangle, double epsilon = 1e-9) {
    const double area = signedDoubleArea(triangle);
    if (!finite(triangle) || !std::isfinite(area)) {
        return Winding::Degenerate;
    }
    if (area > epsilon) {
        return Winding::Positive;
    }
    if (area < -epsilon) {
        return Winding::Negative;
    }
    return Winding::Degenerate;
}

inline Triangle2 normalizePositiveWinding(Triangle2 triangle) {
    if (classifyWinding(triangle) == Winding::Negative) {
        std::swap(triangle.b, triangle.c);
    }
    return triangle;
}
#endif

#if LAB_CHECKPOINT >= 4
inline Vec2 pixelCenter(int x, int y) {
    return {double(x) + 0.5, double(y) + 0.5};
}
#if LAB_CHECKPOINT >= 6
inline bool isTopLeftEdge(Vec2 a, Vec2 b, double epsilon = 1e-9) {
    const double deltaX = b.x - a.x;
    const double deltaY = b.y - a.y;
    const bool goesUp = deltaY < -epsilon;
    const bool horizontalTop = std::abs(deltaY) <= epsilon && deltaX > epsilon;
    return goesUp || horizontalTop;
}

inline bool acceptsEdge(double edgeValue, bool topLeft, FillRule rule, double epsilon = 1e-9) {
    if (edgeValue > epsilon) {
        return true;
    }
    if (edgeValue < -epsilon) {
        return false;
    }
    if (rule == FillRule::Inclusive) {
        return true;
    }
    return topLeft;
}
#endif
inline CoverageSample sampleTriangle(Triangle2 triangle, Vec2 samplePosition, FillRule rule) {
    CoverageSample sample{};
    sample.position = samplePosition;
    if (!finite(samplePosition) || classifyWinding(triangle) == Winding::Degenerate) {
        return sample;
    }
    const bool reversed = classifyWinding(triangle) == Winding::Negative;
    triangle = normalizePositiveWinding(triangle);
    const double area = signedDoubleArea(triangle);
    sample.edgeAB = orient2D(triangle.a, triangle.b, samplePosition);
    sample.edgeBC = orient2D(triangle.b, triangle.c, samplePosition);
    sample.edgeCA = orient2D(triangle.c, triangle.a, samplePosition);
    if (!std::isfinite(sample.edgeAB) || !std::isfinite(sample.edgeBC) || !std::isfinite(sample.edgeCA)) {
        return sample;
    }
    sample.barycentric = {sample.edgeBC / area, sample.edgeCA / area, sample.edgeAB / area};
    // Edge dùng triangle chuẩn hóa; weights vẫn thuộc A/B/C của input gốc.
    if (reversed) {
        std::swap(sample.barycentric.b, sample.barycentric.c);
    }
#if LAB_CHECKPOINT >= 6
    const bool insideAB = acceptsEdge(sample.edgeAB, isTopLeftEdge(triangle.a, triangle.b), rule);
    const bool insideBC = acceptsEdge(sample.edgeBC, isTopLeftEdge(triangle.b, triangle.c), rule);
    const bool insideCA = acceptsEdge(sample.edgeCA, isTopLeftEdge(triangle.c, triangle.a), rule);
    sample.inside = insideAB && insideBC && insideCA;
#else
    static_cast<void>(rule);
    sample.inside = sample.edgeAB >= -1e-9 && sample.edgeBC >= -1e-9 && sample.edgeCA >= -1e-9;
#endif
    return sample;
}
#endif

#if LAB_CHECKPOINT >= 5
// Callback chỉ được gọi cho pixel đạt coverage; không phụ thuộc SDL.
template <typename ShadePixel>
RasterStats rasterizeTriangle(Triangle2 triangle, int width, int height, FillRule rule, std::size_t candidateLimit, ShadePixel shadePixel) {
    RasterStats stats{};
    stats.bounds = triangleBounds(triangle, width, height);
    stats.candidateCount = candidatePixelCount(stats.bounds);
    stats.degenerate = classifyWinding(triangle) == Winding::Degenerate;
    if (stats.degenerate || stats.candidateCount == 0) {
        return stats;
    }
    const std::size_t safeLimit = std::min(candidateLimit, stats.candidateCount);
    for (int y = stats.bounds.minY; y <= stats.bounds.maxY; ++y) {
        for (int x = stats.bounds.minX; x <= stats.bounds.maxX; ++x) {
            if (stats.testedCount >= safeLimit) {
                return stats;
            }
            const CoverageSample sample = sampleTriangle(triangle, pixelCenter(x, y), rule);
            ++stats.testedCount;
            if (!sample.inside) {
                continue;
            }
            ++stats.coveredCount;
            shadePixel(x, y, sample.barycentric);
        }
    }
    return stats;
}

template <typename ShadePixel>
RasterStats rasterizeTriangle(Triangle2 triangle, int width, int height, FillRule rule, ShadePixel shadePixel) {
    return rasterizeTriangle(triangle, width, height, rule, std::numeric_limits<std::size_t>::max(), shadePixel);
}
#endif

#if LAB_CHECKPOINT >= 7
inline std::uint8_t toByte(double value) {
    if (!std::isfinite(value)) {
        return 0;
    }
    return static_cast<std::uint8_t>(std::lround(std::clamp(value, 0.0, 255.0)));
}

inline Color interpolateColor(Color colorA, Color colorB, Color colorC, Barycentric weights) {
    return {
        toByte(weights.a * colorA.red + weights.b * colorB.red + weights.c * colorC.red),
        toByte(weights.a * colorA.green + weights.b * colorB.green + weights.c * colorC.green),
        toByte(weights.a * colorA.blue + weights.b * colorB.blue + weights.c * colorC.blue),
        toByte(weights.a * colorA.alpha + weights.b * colorB.alpha + weights.c * colorC.alpha),
    };
}

inline double barycentricSumError(Barycentric weights) {
    return std::abs(weights.a + weights.b + weights.c - 1.0);
}

inline int sharedEdgeCoverageCount(Triangle2 first, Triangle2 second, Vec2 samplePosition, FillRule rule) {
    int count = 0;
    if (sampleTriangle(first, samplePosition, rule).inside) {
        ++count;
    }
    if (sampleTriangle(second, samplePosition, rule).inside) {
        ++count;
    }
    return count;
}
#endif
} // namespace lab
