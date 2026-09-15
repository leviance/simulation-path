#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <numbers>
#include <type_traits>
#include <vector>

namespace lab {

struct Vec2 {
    float x{};
    float y{};
};

struct Color {
    float red{};
    float green{};
    float blue{};
};

inline float length(Vec2 value) {
    return std::sqrt(value.x * value.x + value.y * value.y);
}

inline Vec2 subtract(Vec2 left, Vec2 right) {
    return {left.x - right.x, left.y - right.y};
}

// Checkpoint 3: C++ struct và GLSL attributes cùng đọc một contract năm float.
#if LAB_CHECKPOINT >= 3
struct GpuVertex {
    float positionX{};
    float positionY{};
    float red{};
    float green{};
    float blue{};
};

static_assert(std::is_standard_layout_v<GpuVertex>);
static_assert(sizeof(GpuVertex) == sizeof(float) * 5U);
static_assert(offsetof(GpuVertex, positionX) == 0U);
static_assert(offsetof(GpuVertex, red) == sizeof(float) * 2U);

inline constexpr std::array<GpuVertex, 3> kSourceTriangle{
    GpuVertex{0.0F, 0.66F, 0.97F, 0.42F, 0.35F},
    GpuVertex{-0.70F, -0.58F, 0.35F, 0.78F, 0.48F},
    GpuVertex{0.70F, -0.58F, 0.38F, 0.68F, 0.94F},
};

struct Transform2D {
    float angleRadians{};
    float scale{1.0F};
    Vec2 translation{};
};

inline Vec2 transformPosition(Vec2 position, const Transform2D& transform) {
    const float cosine = std::cos(transform.angleRadians);
    const float sine = std::sin(transform.angleRadians);
    const float rotatedX = position.x * cosine - position.y * sine;
    const float rotatedY = position.x * sine + position.y * cosine;
    return {
        rotatedX * transform.scale + transform.translation.x,
        rotatedY * transform.scale + transform.translation.y,
    };
}

inline std::array<GpuVertex, 3> transformedTriangle(
    const std::array<GpuVertex, 3>& triangle,
    const Transform2D& transform
) {
    std::array<GpuVertex, 3> result = triangle;
    for (GpuVertex& vertex : result) {
        const Vec2 transformed = transformPosition({vertex.positionX, vertex.positionY}, transform);
        vertex.positionX = transformed.x;
        vertex.positionY = transformed.y;
    }
    return result;
}
#endif

// Checkpoint 4: CPU reference giữ framebuffer top-left và rasterize không gọi OpenGL.
#if LAB_CHECKPOINT >= 4
struct Framebuffer {
    int width{};
    int height{};
    std::vector<std::uint8_t> rgba{};

    void resize(int nextWidth, int nextHeight) {
        width = std::max(1, nextWidth);
        height = std::max(1, nextHeight);
        rgba.resize(std::size_t(width) * std::size_t(height) * 4U);
    }

    void clear(Color color) {
        const std::uint8_t red = std::uint8_t(std::lround(std::clamp(color.red, 0.0F, 1.0F) * 255.0F));
        const std::uint8_t green = std::uint8_t(std::lround(std::clamp(color.green, 0.0F, 1.0F) * 255.0F));
        const std::uint8_t blue = std::uint8_t(std::lround(std::clamp(color.blue, 0.0F, 1.0F) * 255.0F));
        for (std::size_t offset = 0; offset < rgba.size(); offset += 4U) {
            rgba[offset] = red;
            rgba[offset + 1U] = green;
            rgba[offset + 2U] = blue;
            rgba[offset + 3U] = 255U;
        }
    }

    void putPixel(int x, int y, Color color) {
        if (x < 0 || y < 0 || x >= width || y >= height) {
            return;
        }
        const std::size_t offset = (std::size_t(y) * std::size_t(width) + std::size_t(x)) * 4U;
        rgba[offset] = std::uint8_t(std::lround(std::clamp(color.red, 0.0F, 1.0F) * 255.0F));
        rgba[offset + 1U] = std::uint8_t(std::lround(std::clamp(color.green, 0.0F, 1.0F) * 255.0F));
        rgba[offset + 2U] = std::uint8_t(std::lround(std::clamp(color.blue, 0.0F, 1.0F) * 255.0F));
        rgba[offset + 3U] = 255U;
    }
};

struct ScreenVertex {
    Vec2 position{};
    Color color{};
};

struct BarycentricSample {
    bool inside{};
    std::array<float, 3> weights{};
    Color color{};
};

inline Vec2 ndcToCpuScreen(Vec2 position, int width, int height) {
    return {
        (position.x * 0.5F + 0.5F) * float(width),
        (1.0F - (position.y * 0.5F + 0.5F)) * float(height),
    };
}

inline Vec2 cpuScreenToNdc(Vec2 position, int width, int height) {
    return {
        position.x / float(width) * 2.0F - 1.0F,
        1.0F - position.y / float(height) * 2.0F,
    };
}

inline float edge(Vec2 a, Vec2 b, Vec2 point) {
    return (point.x - a.x) * (b.y - a.y) - (point.y - a.y) * (b.x - a.x);
}

inline BarycentricSample barycentricAtPoint(
    const std::array<ScreenVertex, 3>& triangle,
    Vec2 point,
    bool smoothColor
) {
    const float signedArea = edge(triangle[0].position, triangle[1].position, triangle[2].position);
    if (std::abs(signedArea) <= 1.0e-8F) {
        return {};
    }
    const float weight0 = edge(triangle[1].position, triangle[2].position, point) / signedArea;
    const float weight1 = edge(triangle[2].position, triangle[0].position, point) / signedArea;
    const float weight2 = edge(triangle[0].position, triangle[1].position, point) / signedArea;
    const float epsilon = 1.0e-6F;
    const bool inside = weight0 >= -epsilon && weight1 >= -epsilon && weight2 >= -epsilon;
    Color color{0.38F, 0.68F, 0.94F};
    if (smoothColor) {
        color = {
            triangle[0].color.red * weight0 + triangle[1].color.red * weight1 + triangle[2].color.red * weight2,
            triangle[0].color.green * weight0 + triangle[1].color.green * weight1 + triangle[2].color.green * weight2,
            triangle[0].color.blue * weight0 + triangle[1].color.blue * weight1 + triangle[2].color.blue * weight2,
        };
    }
    return {inside, {weight0, weight1, weight2}, color};
}

inline void rasterizeCpuTriangle(
    Framebuffer& framebuffer,
    const std::array<GpuVertex, 3>& triangle,
    const Transform2D& transform,
    bool smoothColor
) {
    framebuffer.clear({11.0F / 255.0F, 16.0F / 255.0F, 32.0F / 255.0F});
    const std::array<GpuVertex, 3> transformed = transformedTriangle(triangle, transform);
    std::array<ScreenVertex, 3> screen{};
    for (std::size_t index = 0; index < screen.size(); ++index) {
        screen[index] = {
            ndcToCpuScreen({transformed[index].positionX, transformed[index].positionY}, framebuffer.width, framebuffer.height),
            {transformed[index].red, transformed[index].green, transformed[index].blue},
        };
    }

    const float minimumX = std::min({screen[0].position.x, screen[1].position.x, screen[2].position.x});
    const float maximumX = std::max({screen[0].position.x, screen[1].position.x, screen[2].position.x});
    const float minimumY = std::min({screen[0].position.y, screen[1].position.y, screen[2].position.y});
    const float maximumY = std::max({screen[0].position.y, screen[1].position.y, screen[2].position.y});
    const int left = std::clamp(int(std::floor(minimumX)), 0, framebuffer.width - 1);
    const int right = std::clamp(int(std::ceil(maximumX)), 0, framebuffer.width - 1);
    const int top = std::clamp(int(std::floor(minimumY)), 0, framebuffer.height - 1);
    const int bottom = std::clamp(int(std::ceil(maximumY)), 0, framebuffer.height - 1);

    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            const BarycentricSample sample = barycentricAtPoint(screen, {float(x) + 0.5F, float(y) + 0.5F}, smoothColor);
            if (sample.inside) {
                framebuffer.putPixel(x, y, sample.color);
            }
        }
    }
}

inline std::uint64_t framebufferChecksum(const Framebuffer& framebuffer) {
    std::uint64_t checksum = 1469598103934665603ULL;
    for (const std::uint8_t value : framebuffer.rgba) {
        checksum ^= value;
        checksum *= 1099511628211ULL;
    }
    return checksum;
}
#endif

// Checkpoint 6: OpenGL window coordinates dùng gốc bottom-left, khác CPU framebuffer.
#if LAB_CHECKPOINT >= 6
struct Viewport {
    int x{};
    int y{};
    int width{1};
    int height{1};
};

inline Vec2 ndcToGpuWindow(Vec2 position, const Viewport& viewport) {
    return {
        float(viewport.x) + (position.x * 0.5F + 0.5F) * float(viewport.width),
        float(viewport.y) + (position.y * 0.5F + 0.5F) * float(viewport.height),
    };
}

inline Vec2 gpuWindowToNdc(Vec2 position, const Viewport& viewport) {
    return {
        (position.x - float(viewport.x)) / float(viewport.width) * 2.0F - 1.0F,
        (position.y - float(viewport.y)) / float(viewport.height) * 2.0F - 1.0F,
    };
}
#endif

// Checkpoint 7: cùng barycentric weights tạo smooth color ở CPU và fragment input ở GPU.
#if LAB_CHECKPOINT >= 7
inline Vec2 triangleCentroid(
    const std::array<GpuVertex, 3>& triangle,
    const Transform2D& transform
) {
    const std::array<GpuVertex, 3> transformed = transformedTriangle(triangle, transform);
    return {
        (transformed[0].positionX + transformed[1].positionX + transformed[2].positionX) / 3.0F,
        (transformed[0].positionY + transformed[1].positionY + transformed[2].positionY) / 3.0F,
    };
}

inline BarycentricSample sampleTriangleAtNdc(
    const std::array<GpuVertex, 3>& triangle,
    const Transform2D& transform,
    Vec2 point,
    bool smoothColor
) {
    const std::array<GpuVertex, 3> transformed = transformedTriangle(triangle, transform);
    std::array<ScreenVertex, 3> ndcTriangle{};
    for (std::size_t index = 0; index < ndcTriangle.size(); ++index) {
        ndcTriangle[index] = {
            {transformed[index].positionX, transformed[index].positionY},
            {transformed[index].red, transformed[index].green, transformed[index].blue},
        };
    }
    return barycentricAtPoint(ndcTriangle, point, smoothColor);
}

inline Color quantizeRgba8(Color color) {
    return {
        float(std::lround(std::clamp(color.red, 0.0F, 1.0F) * 255.0F)) / 255.0F,
        float(std::lround(std::clamp(color.green, 0.0F, 1.0F) * 255.0F)) / 255.0F,
        float(std::lround(std::clamp(color.blue, 0.0F, 1.0F) * 255.0F)) / 255.0F,
    };
}

inline float maximumColorDifference(Color left, Color right) {
    return std::max({
        std::abs(left.red - right.red),
        std::abs(left.green - right.green),
        std::abs(left.blue - right.blue),
    });
}
#endif

// Checkpoint 9: validation dùng code CPU thuần để CTest không cần window hoặc GPU.
#if LAB_CHECKPOINT >= 9
struct PipelineValidationReport {
    bool vertexLayout{};
    bool transformOrder{};
    bool cpuRoundTrip{};
    bool gpuRoundTrip{};
    bool centroidWeights{};
    bool deterministicRaster{};
    bool rgba8Tolerance{};
};

inline PipelineValidationReport validateCpuGpuTriangleContract() {
    PipelineValidationReport report{};
    report.vertexLayout = sizeof(GpuVertex) == sizeof(float) * 5U && offsetof(GpuVertex, red) == sizeof(float) * 2U;

    const Transform2D transform{std::numbers::pi_v<float> * 0.5F, 0.5F, {0.2F, -0.1F}};
    const Vec2 transformed = transformPosition({1.0F, 0.0F}, transform);
    report.transformOrder = length(subtract(transformed, {0.2F, 0.4F})) <= 1.0e-5F;

    const Vec2 probe{0.37F, -0.42F};
    const Vec2 cpuRecovered = cpuScreenToNdc(ndcToCpuScreen(probe, 640, 720), 640, 720);
    report.cpuRoundTrip = length(subtract(probe, cpuRecovered)) <= 1.0e-6F;

    const Viewport viewport{640, 0, 640, 720};
    const Vec2 gpuRecovered = gpuWindowToNdc(ndcToGpuWindow(probe, viewport), viewport);
    report.gpuRoundTrip = length(subtract(probe, gpuRecovered)) <= 1.0e-6F;

    const Transform2D identity{};
    const BarycentricSample centroid = sampleTriangleAtNdc(kSourceTriangle, identity, triangleCentroid(kSourceTriangle, identity), true);
    report.centroidWeights = centroid.inside;
    for (const float weight : centroid.weights) {
        report.centroidWeights = report.centroidWeights && std::abs(weight - 1.0F / 3.0F) <= 1.0e-5F;
    }

    Framebuffer first{};
    first.resize(160, 120);
    rasterizeCpuTriangle(first, kSourceTriangle, identity, true);
    Framebuffer second{};
    second.resize(160, 120);
    rasterizeCpuTriangle(second, kSourceTriangle, identity, true);
    report.deterministicRaster = framebufferChecksum(first) == framebufferChecksum(second);

    const Color quantized = quantizeRgba8(centroid.color);
    report.rgba8Tolerance = maximumColorDifference(centroid.color, quantized) <= 0.5F / 255.0F + 1.0e-6F;
    return report;
}
#endif

} // namespace lab
