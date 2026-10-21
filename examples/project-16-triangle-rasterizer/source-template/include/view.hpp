#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
struct FrameStats {
    RasterStats primary{};
    RasterStats secondary{};
    CoverageSample sample{};
    std::size_t overlap{};
    bool rejected{};
    double area{};
};

// Cắt trước int/Bresenham, không cho một cạnh ngoài viewport chạy hàng triệu bước.
inline bool clipLine(Vec2& a, Vec2& b, int width, int height) {
    if (!finite(a) || !finite(b) || width <= 0 || height <= 0) {
        return false;
    }
    const Vec2 delta{b.x - a.x, b.y - a.y};
    double first = 0.0;
    double last = 1.0;
    const auto boundary = [&](double direction, double distance) {
        if (direction == 0.0) {
            return distance >= 0.0;
        }
        const double fraction = distance / direction;
        if (direction < 0.0) {
            first = std::max(first, fraction);
        } else {
            last = std::min(last, fraction);
        }
        return first <= last;
    };
    if (!boundary(-delta.x, a.x) || !boundary(delta.x, width - 1.0 - a.x) || !boundary(-delta.y, a.y) || !boundary(delta.y, height - 1.0 - a.y)) {
        return false;
    }
    b = {a.x + last * delta.x, a.y + last * delta.y};
    a = {a.x + first * delta.x, a.y + first * delta.y};
    return true;
}

inline void screenLine(Framebuffer& image, Vec2 a, Vec2 b, int height, std::uint32_t color) {
    if (clipLine(a, b, Framebuffer::width, height)) {
        drawLine(image, static_cast<int>(std::lround(a.x)), static_cast<int>(std::lround(a.y)), static_cast<int>(std::lround(b.x)), static_cast<int>(std::lround(b.y)), color);
    }
}

inline void worldLine(Framebuffer& image, Vec3 a, Vec3 b, const Scene& scene, std::uint32_t color) {
    const auto first = projectWorld(a, scene.camera, Framebuffer::width, viewportHeight(scene));
    const auto second = projectWorld(b, scene.camera, Framebuffer::width, viewportHeight(scene));
    if (first && second) {
        screenLine(image, *first, *second, viewportHeight(scene), color);
    }
}

inline void drawWorldGrid(Framebuffer& image, const Scene& scene) {
    for (int x = -6; x <= 6; ++x) {
        worldLine(image, {double(x), -1.5, 2.0}, {double(x), -1.5, 16.0}, scene, kGrid);
    }
    for (int z = 2; z <= 16; ++z) {
        worldLine(image, {-6.0, -1.5, double(z)}, {6.0, -1.5, double(z)}, scene, kGrid);
    }
}
#if LAB_CHECKPOINT >= 1
inline void drawOutline(Framebuffer& image, const Triangle2& triangle, int height, std::uint32_t color) {
    screenLine(image, triangle.a, triangle.b, height, color);
    screenLine(image, triangle.b, triangle.c, height, color);
    screenLine(image, triangle.c, triangle.a, height, color);
}
#endif
#if LAB_CHECKPOINT >= 7
inline std::uint32_t packColor(Color color) {
    return (std::uint32_t(color.red) << 24U) | (std::uint32_t(color.green) << 16U) | (std::uint32_t(color.blue) << 8U) | color.alpha;
}
#endif
inline FrameStats renderScene(Framebuffer& image, std::vector<std::uint8_t>& coverage, const Scene& scene) {
    image.clear(kBackground);
    std::fill(coverage.begin(), coverage.end(), std::uint8_t(0));
    FrameStats result;
#if LAB_CHECKPOINT >= 8
    if (scene.worldMode) {
        drawWorldGrid(image, scene);
    }
#endif
#if LAB_CHECKPOINT >= 1
    const auto projected = screenTriangle(scene);
    if (!projected) {
        result.rejected = true;
        return result;
    }
    const Triangle2 triangle = *projected;
    const int height = viewportHeight(scene);
#if LAB_CHECKPOINT >= 3
    result.area = signedDoubleArea(triangle);
    result.sample.position = scene.sample;
    result.sample.edgeAB = orient2D(triangle.a, triangle.b, scene.sample);
    result.sample.edgeBC = orient2D(triangle.b, triangle.c, scene.sample);
    result.sample.edgeCA = orient2D(triangle.c, triangle.a, scene.sample);
#endif
#if LAB_CHECKPOINT >= 2
    result.primary.bounds = triangleBounds(triangle, Framebuffer::width, height);
    result.primary.candidateCount = candidatePixelCount(result.primary.bounds);
#endif
#if LAB_CHECKPOINT >= 4
    result.sample = sampleTriangle(triangle, {std::floor(scene.sample.x) + 0.5, std::floor(scene.sample.y) + 0.5}, scene.rule);
#endif
#if LAB_CHECKPOINT >= 5
    FillRule rule = FillRule::Inclusive;
#if LAB_CHECKPOINT >= 6
    rule = scene.rule;
#endif
    const auto shade = [&](int x, int y, Barycentric weights) {
        const std::size_t index = static_cast<std::size_t>(y) * Framebuffer::width + static_cast<std::size_t>(x);
        ++coverage[index];
        std::uint32_t color = kShape;
#if LAB_CHECKPOINT >= 7
        if (scene.barycentricColor) {
            color = packColor(interpolateColor(scene.colors[0], scene.colors[1], scene.colors[2], weights));
        }
#else
        (void)weights;
#endif
        image.putPixel(x, y, color);
    };
    result.primary = rasterizeTriangle(triangle, Framebuffer::width, height, rule, scene.candidateLimit, shade);
#if LAB_CHECKPOINT >= 6
    if (scene.shared && !scene.worldMode) {
        // Một budget chung cho cả hai triangle; triangle thứ hai không chạy lén khi pause.
        const std::size_t remaining = scene.candidateLimit - result.primary.testedCount;
        result.secondary = rasterizeTriangle(scene.second, Framebuffer::width, height, rule, remaining, [&](int x, int y, Barycentric) {
            const std::size_t index = static_cast<std::size_t>(y) * Framebuffer::width + static_cast<std::size_t>(x);
            ++coverage[index];
            std::uint32_t color = kGhost;
            if (coverage[index] > 1) {
                ++result.overlap;
                color = kAxisX;
            }
            image.putPixel(x, y, color);
        });
    }
#endif
#endif
    if (scene.debug) {
        drawOutline(image, triangle, height, kWhite);
        for (int i = 0; i < 3; ++i) {
            const Vec2 point = vertexAt(triangle, i);
            if (point.x >= 0.0 && point.x < Framebuffer::width && point.y >= 0.0 && point.y < height) {
                disc(image, static_cast<int>(std::lround(point.x)), static_cast<int>(std::lround(point.y)), 5, kMarker);
            }
        }
#if LAB_CHECKPOINT >= 2
        const IntRect bounds = result.primary.bounds;
        if (!isEmpty(bounds)) {
            const Vec2 a{double(bounds.minX), double(bounds.minY)};
            const Vec2 b{double(bounds.maxX), double(bounds.minY)};
            const Vec2 c{double(bounds.maxX), double(bounds.maxY)};
            const Vec2 d{double(bounds.minX), double(bounds.maxY)};
            screenLine(image, a, b, height, kMarker);
            screenLine(image, b, c, height, kMarker);
            screenLine(image, c, d, height, kMarker);
            screenLine(image, d, a, height, kMarker);
        }
#endif
#if LAB_CHECKPOINT >= 3
        screenLine(image, {scene.sample.x - 4.0, scene.sample.y}, {scene.sample.x + 4.0, scene.sample.y}, height, kAxisX);
        screenLine(image, {scene.sample.x, scene.sample.y - 4.0}, {scene.sample.x, scene.sample.y + 4.0}, height, kAxisX);
#endif
    }
#else
    (void)scene;
#endif
    return result;
}
} // namespace lab
