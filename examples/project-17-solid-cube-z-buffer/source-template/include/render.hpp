#pragma once
#include "depth.hpp"
#include "raster.hpp"

namespace lab {
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

#if LAB_CHECKPOINT >= 8
// Culling dùng winding gốc, tuyệt đối không xét sau normalizeWinding.
inline bool isFrontFacing(const ScreenTriangle& triangle) {
    return validTriangle(triangle) && orient2D(triangle.a, triangle.b, triangle.c.x, triangle.c.y) > 1e-9;
}
#endif

#if LAB_CHECKPOINT >= 1
inline RenderStats renderCube(const CubeMesh& mesh, int width, int height, double angleX, double angleY, bool reverseOrder, bool depthEnabled, std::vector<std::uint32_t>& colorBuffer, DepthBuffer& depthBuffer, bool cullEnabled = false, Vec3 camera = {}, PixelProbe* probe = nullptr) {
    RenderStats stats{};
    if (width <= 0 || height <= 0 || std::size_t(width) > colorBuffer.size() / std::size_t(height)) {
        return stats;
    }
#if LAB_CHECKPOINT >= 3
    if (depthBuffer.width() != width || depthBuffer.height() < height) {
        return stats;
    }
#else
    (void)depthBuffer;
#endif
    const auto vertices = projectCube(mesh, width, height, angleX, angleY, camera);
    for (std::size_t position = 0; position < mesh.triangles.size(); ++position) {
        std::size_t index = position;
#if LAB_CHECKPOINT >= 2
        index = triangleIndexAt(position, mesh.triangles.size(), reverseOrder);
#endif
        const auto& indexed = mesh.triangles[index];
        if (std::any_of(indexed.indices.begin(), indexed.indices.end(), [&](std::size_t v) {
                return v >= vertices.size();
            })) {
            ++stats.invalidCount;
            continue;
        }
        const ScreenTriangle triangle = screenTriangle(indexed, vertices);
        if (!validTriangle(triangle)) {
            ++stats.invalidCount;
            continue;
        }
#if LAB_CHECKPOINT >= 8
        if (cullEnabled && !isFrontFacing(triangle)) {
            ++stats.culledCount;
            continue;
        }
#endif
        ++stats.submittedCount;
        stats.coveredCount += rasterizeTriangle(triangle, width, height, [&](int x, int y, Barycentric weights, const ScreenTriangle& normalized) {
            double depth = 0.0;
#if LAB_CHECKPOINT >= 4
            depth = interpolateNdcDepth(normalized, weights);
#endif
            DepthTestResult test{1.0, depth, true};
#if LAB_CHECKPOINT >= 5
            test = depthTestAndWrite(depthBuffer, x, y, depth, depthEnabled);
#endif
            if (probe && x == probe->x && y == probe->y) {
                probe->traces.push_back({index, weights, depth, test.storedDepth, test.passed});
            }
            if (!test.passed) {
                ++stats.rejectedCount;
                return;
            }
            colorBuffer[std::size_t(y) * std::size_t(width) + std::size_t(x)] = packColor(normalized.color);
            ++stats.passedCount;
        });
    }
    (void)reverseOrder;
    (void)depthEnabled;
    (void)cullEnabled;
    return stats;
}
#endif

#if LAB_CHECKPOINT >= 7
inline bool buffersNearlyEqual(const std::vector<double>& first, const std::vector<double>& second, double epsilon = 1e-9) {
    if (first.size() != second.size() || !std::isfinite(epsilon) || epsilon < 0.0) {
        return false;
    }
    for (std::size_t i = 0; i < first.size(); ++i) {
        if (!std::isfinite(first[i]) || !std::isfinite(second[i]) || std::abs(first[i] - second[i]) > epsilon) {
            return false;
        }
    }
    return true;
}

inline std::uint8_t depthShade(double depth) {
    if (!std::isfinite(depth) || depth >= 1.0) {
        return 12;
    }
    return std::uint8_t(std::lround((1.0 - std::clamp(depth, 0.0, 1.0)) * 235.0 + 20.0));
}
#endif
} // namespace lab
