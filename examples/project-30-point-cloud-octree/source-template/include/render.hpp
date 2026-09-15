#pragma once

#include "lab.hpp"

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstdio>
#include <iostream>
#include <span>
#include <vector>

namespace project30 {

// Các hàm trong file này chỉ chuyển dữ liệu mô phỏng thành pixel và bảng số liệu.
inline constexpr int kInitialWidth = 1000;
inline constexpr int kInitialHeight = 760;
inline constexpr std::uint32_t kBackground = 0x0b1020ffU;
inline constexpr std::uint32_t kPoint = 0x60738fffU;
inline constexpr std::uint32_t kHit = 0xe5c07bffU;
inline constexpr std::uint32_t kTree = 0x3e5d82ffU;
inline constexpr std::uint32_t kQuery = 0x61afefffU;

struct ScreenPoint {
    int x{};
    int y{};
    bool visible{};
};

inline void putPixel(
    std::vector<std::uint32_t>& pixels,
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
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    ScreenPoint a,
    ScreenPoint b,
    std::uint32_t color
) {
    if (!a.visible || !b.visible) {
        return;
    }

    int x = a.x;
    int y = a.y;
    const int deltaX = std::abs(b.x - a.x);
    int stepX = -1;
    if (a.x < b.x) {
        stepX = 1;
    }
    const int deltaY = -std::abs(b.y - a.y);
    int stepY = -1;
    if (a.y < b.y) {
        stepY = 1;
    }
    int error = deltaX + deltaY;

    while (true) {
        putPixel(pixels, width, height, x, y, color);
        if (x == b.x && y == b.y) {
            break;
        }
        const int doubledError = error * 2;
        if (doubledError >= deltaY) {
            error += deltaY;
            x += stepX;
        }
        if (doubledError <= deltaX) {
            error += deltaX;
            y += stepY;
        }
    }
}

inline ScreenPoint projectToScreen(
    const lab::Vec3& point,
    lab::OrbitCamera camera,
    int width,
    int height
) {
    camera.aspect = double(width) / double(std::max(1, height));
    const lab::ProjectedPoint projected = lab::projectPointWithOrbit(point, camera);
    const double scale = double(std::min(width, height)) * 0.82;
    return {
        int(std::lround(double(width) * 0.5 + projected.x * scale * 0.5)),
        int(std::lround(double(height) * 0.5 - projected.y * scale * 0.5)),
        projected.visible,
    };
}

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
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::Bounds3D& bounds,
    const lab::OrbitCamera& camera,
    std::uint32_t color
) {
    const std::array<lab::Vec3, 8> corners = boxCorners(bounds);
    std::array<ScreenPoint, 8> screen{};
    for (std::size_t index = 0; index < corners.size(); ++index) {
        screen[index] = projectToScreen(corners[index], camera, width, height);
    }

    constexpr std::array<std::array<std::size_t, 2>, 12> edges{{
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
    for (const auto& edge : edges) {
        drawLine(pixels, width, height, screen[edge[0]], screen[edge[1]], color);
    }
}

inline void drawPointCloud(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    std::span<const lab::PointSample> points,
    std::span<const std::uint8_t> hitMask,
    const lab::OrbitCamera& camera
) {
    const std::size_t drawCount = std::min<std::size_t>(points.size(), 40'000U);
    for (std::size_t index = 0; index < drawCount; ++index) {
        const ScreenPoint screen = projectToScreen(points[index].position, camera, width, height);
        if (!screen.visible) {
            continue;
        }

        std::uint32_t color = kPoint;
        if (index < hitMask.size() && hitMask[index] != 0U) {
            color = kHit;
        }
        putPixel(pixels, width, height, screen.x, screen.y, color);
        if (color == kHit) {
            putPixel(pixels, width, height, screen.x + 1, screen.y, color);
            putPixel(pixels, width, height, screen.x, screen.y + 1, color);
        }
    }
}

#if LAB_CHECKPOINT >= 1
inline void drawRootOctants(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::Bounds3D& bounds,
    const lab::OrbitCamera& camera
) {
    for (int octant = 0; octant < 8; ++octant) {
        drawBoxWireframe(
            pixels,
            width,
            height,
            lab::octreeChildBounds(bounds, octant),
            camera,
            kTree
        );
    }
}
#endif

#if LAB_CHECKPOINT >= 2
inline void drawOctree(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const lab::Octree& tree,
    const lab::OrbitCamera& camera
) {
    const std::size_t stride = std::max<std::size_t>(1U, tree.leafCount / 3'000U);
    std::size_t leafIndex = 0;
    for (const lab::OctreeNode& node : tree.nodes) {
        if (!node.isLeaf()) {
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
inline void drawCapacityStudy(
    std::vector<std::uint32_t>& pixels,
    int width,
    int height,
    const std::vector<lab::CapacityStudyRow>& rows
) {
    if (rows.empty()) {
        return;
    }

    const int left = 32;
    const int right = width - 32;
    const int top = height - 82;
    const int bottom = height - 18;
    std::size_t maximumCandidates = 1U;
    std::size_t maximumNodes = 1U;
    for (const lab::CapacityStudyRow& row : rows) {
        maximumCandidates = std::max(maximumCandidates, row.metrics.totalCandidates);
        maximumNodes = std::max(maximumNodes, row.nodeCount);
    }

    const int slotWidth = std::max(1, (right - left) / int(rows.size()));
    for (std::size_t index = 0; index < rows.size(); ++index) {
        const int centerX = left + slotWidth * int(index) + slotWidth / 2;
        const int candidateHeight = int(std::lround(
            double(rows[index].metrics.totalCandidates) / double(maximumCandidates) *
            double(bottom - top)
        ));
        for (int x = centerX - 18; x <= centerX + 18; ++x) {
            drawLine(
                pixels,
                width,
                height,
                {x, bottom, true},
                {x, bottom - candidateHeight, true},
                kHit
            );
        }

        const int nodeY = bottom - int(std::lround(double(rows[index].nodeCount) / double(maximumNodes) * double(bottom - top)));
        for (int offsetY = -2; offsetY <= 2; ++offsetY) {
            for (int offsetX = -2; offsetX <= 2; ++offsetX) {
                putPixel(pixels, width, height, centerX + offsetX, nodeY + offsetY, kTree);
            }
        }
    }
}

inline void printCapacityTable(const std::vector<lab::CapacityStudyRow>& rows) {
    std::cout
        << "\nProject 30 capacity study\n"
        << "capacity\tnodes\tleaves\tdepth\tmaxLeaf\tvisited/query\tcandidates/query\trebuild us\tquery us\tchecksum\n";
    for (const lab::CapacityStudyRow& row : rows) {
        const double queryCount = double(std::max<std::size_t>(1U, row.metrics.queryCount));
        std::printf(
            "%zu\t%zu\t%zu\t%d\t%zu\t%.2f\t%.2f\t%.2f\t%.3f\t%08x\n",
            row.leafCapacity,
            row.nodeCount,
            row.leafCount,
            row.maximumObservedDepth,
            row.maximumLeafOccupancy,
            double(row.metrics.totalVisitedNodes) / queryCount,
            double(row.metrics.totalCandidates) / queryCount,
            row.rebuildMicroseconds,
            row.metrics.elapsedMicroseconds / queryCount,
            unsigned(row.metrics.checksum)
        );
    }
    std::cout << std::flush;
}
#endif

inline lab::Bounds3D volumeAround(const lab::Vec3& center, const lab::Vec3& halfSize) {
    return lab::normalizeVolume(
        {center.x - halfSize.x, center.y - halfSize.y, center.z - halfSize.z},
        {center.x + halfSize.x, center.y + halfSize.y, center.z + halfSize.z}
    );
}

inline void clampQueryCenter(lab::Vec3& center, const lab::Vec3& halfSize) {
    center.x = std::clamp(center.x, halfSize.x, 1.0 - halfSize.x);
    center.y = std::clamp(center.y, halfSize.y, 1.0 - halfSize.y);
    center.z = std::clamp(center.z, halfSize.z, 1.0 - halfSize.z);
}

} // namespace project30
