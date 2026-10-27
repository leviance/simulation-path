#pragma once

#include "analysis.hpp"
#include "star-render.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <numeric>
#include <span>
#include <vector>

namespace project31 {

// Renderer chỉ đọc simulation state; mọi phép tính lực vẫn nằm trong namespace lab.
inline constexpr int kInitialWidth = 1120;
inline constexpr int kInitialHeight = 760;
inline constexpr std::uint32_t kBackground = 0x0b1020ffU;
inline constexpr std::uint32_t kBody = 0xabb2bfffU;
inline constexpr std::uint32_t kCentralBody = 0xe06c75ffU;
inline constexpr std::uint32_t kSelectedBody = 0xe5c07bffU;
inline constexpr std::uint32_t kTree = 0x3f5878b0U;
inline constexpr std::uint32_t kForce = 0xe5c07bffU;
inline constexpr std::uint32_t kAxis = 0x42516bffU;

struct ScreenPoint {
    int x{};
    int y{};
    double depth{};
    bool visible{};
};

inline void putPixel(
    std::span<std::uint32_t> pixels,
    int width,
    int height,
    int x,
    int y,
    std::uint32_t color
) {
    if (x < 0 || y < 0 || x >= width || y >= height) {
        return;
    }
    pixels[std::size_t(y) * std::size_t(width) + std::size_t(x)] = color;
}

inline void drawLine(
    std::span<std::uint32_t> pixels,
    int width,
    int height,
    int x0,
    int y0,
    int x1,
    int y1,
    std::uint32_t color
) {
    const int deltaX = std::abs(x1 - x0);
    int stepX = -1;
    if (x0 < x1) {
        stepX = 1;
    }
    const int deltaY = -std::abs(y1 - y0);
    int stepY = -1;
    if (y0 < y1) {
        stepY = 1;
    }
    int error = deltaX + deltaY;
    while (true) {
        putPixel(pixels, width, height, x0, y0, color);
        if (x0 == x1 && y0 == y1) {
            break;
        }
        const int doubledError = error * 2;
        if (doubledError >= deltaY) {
            error += deltaY;
            x0 += stepX;
        }
        if (doubledError <= deltaX) {
            error += deltaX;
            y0 += stepY;
        }
    }
}

inline void drawFilledCircle(
    std::span<std::uint32_t> pixels,
    int width,
    int height,
    int centerX,
    int centerY,
    int radius,
    std::uint32_t color
) {
    for (int offsetY = -radius; offsetY <= radius; ++offsetY) {
        for (int offsetX = -radius; offsetX <= radius; ++offsetX) {
            if (offsetX * offsetX + offsetY * offsetY <= radius * radius) {
                putPixel(
                    pixels,
                    width,
                    height,
                    centerX + offsetX,
                    centerY + offsetY,
                    color
                );
            }
        }
    }
}

inline ScreenPoint projectToScreen(
    const lab::Vec3& point,
    const lab::OrbitCamera& camera,
    int width,
    int height
) {
    lab::OrbitCamera adjusted = camera;
    adjusted.aspect = double(width) / double(std::max(1, height));
    const lab::ProjectedPoint projected = lab::projectBodyPoint(point, adjusted);
    if (!std::isfinite(projected.x) || !std::isfinite(projected.y) || !projected.visible || std::abs(projected.x) > 4 || std::abs(projected.y) > 4) {
        return {0, 0, projected.depth, false};
    }
    return {
        int(std::lround(double(width) * 0.5 + projected.x * double(width) * 0.5)),
        int(std::lround(double(height) * 0.47 - projected.y * double(height) * 0.5)),
        projected.depth,
        projected.visible && std::abs(projected.x) < 4 && std::abs(projected.y) < 4,
    };
}

inline std::size_t drawBodies(
    std::span<std::uint32_t> pixels,
    int width,
    int height,
    std::span<const lab::Body> bodies,
    const lab::OrbitCamera& camera,
    std::vector<StarLight>& light
) {
    // Event loop giữ buffer để tái sử dụng capacity, không cấp phát lại mỗi frame.
    return renderStarField(pixels, width, height, bodies, camera, light);
}

inline void drawForceArrow(
    std::span<std::uint32_t> pixels,
    int width,
    int height,
    const lab::Body& body,
    const lab::Vec3& acceleration,
    const lab::OrbitCamera& camera
) {
    const ScreenPoint start = projectToScreen(body.position, camera, width, height);
    const double accelerationLength = lab::length(acceleration);
    if (!start.visible || accelerationLength <= 1.0e-12) {
        return;
    }
    const lab::Vec3 endPosition = body.position + acceleration * (0.08 / accelerationLength);
    const ScreenPoint end = projectToScreen(endPosition, camera, width, height);
    if (!end.visible) {
        return;
    }
    drawLine(pixels, width, height, start.x, start.y, end.x, end.y, kForce);
    drawFilledCircle(pixels, width, height, end.x, end.y, 2, kForce);
}

inline void drawTargetMarker(std::span<std::uint32_t> pixels, int width, int height, const lab::Body& body, const lab::OrbitCamera& camera) {
    const auto target = projectToScreen(body.position, camera, width, height);
    if (!target.visible) {
        return;
    }
    for (int step = 0; step < 40; ++step) {
        const double angle = double(step) * 6.283185307179586 / 40.0;
        putPixel(pixels, width, height, target.x + int(std::lround(std::cos(angle) * 7)), target.y + int(std::lround(std::sin(angle) * 7)), kSelectedBody);
    }
}

#if LAB_CHECKPOINT >= 5
inline std::array<lab::Vec3, 8> boxCorners(const lab::Bounds3D& bounds) {
    return {{
        {bounds.minimum.x, bounds.minimum.y, bounds.minimum.z},
        {bounds.maximum.x, bounds.minimum.y, bounds.minimum.z},
        {bounds.minimum.x, bounds.maximum.y, bounds.minimum.z},
        {bounds.maximum.x, bounds.maximum.y, bounds.minimum.z},
        {bounds.minimum.x, bounds.minimum.y, bounds.maximum.z},
        {bounds.maximum.x, bounds.minimum.y, bounds.maximum.z},
        {bounds.minimum.x, bounds.maximum.y, bounds.maximum.z},
        {bounds.maximum.x, bounds.maximum.y, bounds.maximum.z},
    }};
}

inline void drawBoxWireframe(
    std::span<std::uint32_t> pixels,
    int width,
    int height,
    const lab::Bounds3D& bounds,
    const lab::OrbitCamera& camera,
    std::uint32_t color
) {
    constexpr std::array<std::array<int, 2>, 12> edges{{
        {0, 1},
        {0, 2},
        {1, 3},
        {2, 3},
        {4, 5},
        {4, 6},
        {5, 7},
        {6, 7},
        {0, 4},
        {1, 5},
        {2, 6},
        {3, 7},
    }};
    const std::array<lab::Vec3, 8> corners = boxCorners(bounds);
    std::array<ScreenPoint, 8> projected{};
    for (std::size_t index = 0; index < corners.size(); ++index) {
        projected[index] = projectToScreen(corners[index], camera, width, height);
    }
    for (const auto& edge : edges) {
        const ScreenPoint& from = projected[std::size_t(edge[0])];
        const ScreenPoint& to = projected[std::size_t(edge[1])];
        if (from.visible && to.visible) {
            drawLine(pixels, width, height, from.x, from.y, to.x, to.y, color);
        }
    }
}

inline void drawMassOctree(
    std::span<std::uint32_t> pixels,
    int width,
    int height,
    const lab::BarnesHutTree& tree,
    const lab::OrbitCamera& camera
) {
    const std::size_t stride = std::max<std::size_t>(1U, tree.leafCount / 700U);
    std::size_t leafIndex = 0;
    for (const lab::BarnesHutNode& node : tree.nodes) {
        if (!node.isLeaf() || node.totalMass <= 0.0) {
            continue;
        }
        if (leafIndex % stride == 0U) {
            drawBoxWireframe(pixels, width, height, node.bounds, camera, kTree);
        }
        ++leafIndex;
    }
}
#endif

#if LAB_CHECKPOINT >= 8
inline void printAccuracyTable(std::span<const lab::AccuracyRow> rows) {
    std::printf("\nTheta accuracy: exact oracle uses the same bodies and softening\n");
    std::printf(" theta | mean error | max error | visited | aggregate | exact pairs\n");
    for (const lab::AccuracyRow& row : rows) {
        std::printf(
            " %5.2f | %9.4f%% | %8.4f%% | %7zu | %9zu | %11zu\n",
            row.theta,
            row.meanRelativeError * 100.0,
            row.maximumRelativeError * 100.0,
            row.metrics.visitedNodes,
            row.metrics.approximatedNodes,
            row.metrics.exactInteractions
        );
    }
}
#endif

#if LAB_CHECKPOINT >= 9
inline void printScalingTable(std::span<const lab::ScalingRow> rows) {
    std::printf("\nScaling study: full-system acceleration pass\n");
    std::printf(" bodies | direct us | Barnes-Hut us | direct pairs | BH work\n");
    for (const lab::ScalingRow& row : rows) {
        const std::size_t barnesHutWork =
            row.barnesHutMetrics.approximatedNodes + row.barnesHutMetrics.exactInteractions;
        std::printf(
            " %6zu | %9.1f | %13.1f | %12zu | %7zu\n",
            row.bodyCount,
            row.directMicroseconds,
            row.barnesHutMicroseconds,
            row.directInteractions,
            barnesHutWork
        );
    }
}
#endif

} // namespace project31
