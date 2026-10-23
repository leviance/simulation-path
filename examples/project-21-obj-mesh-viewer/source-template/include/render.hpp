#pragma once
#include "normalize.hpp"
#include "obj-parser.hpp"
#include "raster.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 7
// Final pipeline clip trước projection rồi chỉ ghi color khi fragment vượt Z-buffer.
struct DepthBuffer {
    int width{1};
    int height{1};
    std::vector<double> values{1, 1.0};

    DepthBuffer(int initialWidth, int initialHeight) {
        resize(initialWidth, initialHeight);
    }

    void resize(int newWidth, int newHeight) {
        width = std::max(1, newWidth);
        height = std::max(1, newHeight);
        values.assign(std::size_t(width) * std::size_t(height), 1.0);
    }

    void clear() {
        std::fill(values.begin(), values.end(), 1.0);
    }

    [[nodiscard]] std::size_t index(int x, int y) const {
        return std::size_t(y) * std::size_t(width) + std::size_t(x);
    }
};

inline Vec3 intersectNearPlane(Vec3 start, Vec3 end, double nearPlane) {
    // Cạnh dùng chung luôn được tính theo cùng chiều để khớp bit giao điểm.
    if (start.z > end.z) {
        std::swap(start, end);
    }
    const double denominator = end.z - start.z;
    if (std::abs(denominator) <= 1e-12) {
        return {start.x, start.y, nearPlane};
    }
    const double t = std::clamp((nearPlane - start.z) / denominator, 0.0, 1.0);
    Vec3 result = start + (end - start) * t;
    result.z = nearPlane;
    return result;
}

inline std::vector<Vec3> clipTriangleToNearPlane(
    Vec3 a,
    Vec3 b,
    Vec3 c,
    double nearPlane
) {
    const std::array<Vec3, 3> input{a, b, c};
    std::vector<Vec3> output{};
    Vec3 previous = input.back();
    bool previousInside = previous.z >= nearPlane;
    for (const Vec3 current : input) {
        const bool currentInside = current.z >= nearPlane;
        if (previousInside && currentInside) {
            output.push_back(current);
        } else if (previousInside && !currentInside) {
            output.push_back(intersectNearPlane(previous, current, nearPlane));
        } else if (!previousInside && currentInside) {
            output.push_back(intersectNearPlane(previous, current, nearPlane));
            output.push_back(current);
        }
        previous = current;
        previousInside = currentInside;
    }
    return output;
}

inline double interpolateDepth(const ScreenTriangle& triangle, Barycentric weights) {
    return weights.a * triangle.a.ndcDepth + weights.b * triangle.b.ndcDepth +
        weights.c * triangle.c.ndcDepth;
}

struct RenderOptions {
    double angleX{-0.35};
    double angleY{0.65};
    double distance{4.2};
    double cameraYaw{};
    double cameraPitch{};
    double nearPlane{0.7};
    bool cullBackfaces{true};
    bool reverseOrder{};
};

struct RenderStats {
    std::size_t sourceTriangles{};
    std::size_t culledTriangles{};
    std::size_t degenerateTriangles{};
    std::size_t clippedTriangles{};
    std::size_t rasterizedTriangles{};
    std::size_t coveredFragments{};
    std::size_t passedFragments{};
    std::size_t rejectedFragments{};
};

inline RenderStats renderObjMesh(
    const ObjMesh& mesh,
    int width,
    int height,
    const RenderOptions& options,
    std::vector<std::uint32_t>& colors,
    DepthBuffer& depths
) {
    constexpr std::uint32_t clearColor = 0x090f1dffU;
    colors.assign(std::size_t(width) * std::size_t(height), clearColor);
    if (depths.width != width || depths.height != height) {
        depths.resize(width, height);
    } else {
        depths.clear();
    }

    RenderStats stats{};
    stats.sourceTriangles = mesh.triangles.size();
    const Color base{92, 190, 246, 255};
    const OrbitCamera camera{options.cameraYaw, options.cameraPitch, options.distance};
    const Vec3 lightDirection = worldToCamera({-0.45, -0.75, -1.0}, camera) - worldToCamera({}, camera);
    // Mỗi position chỉ transform một lần, kể cả khi nhiều face cùng tham chiếu nó.
    std::vector<Vec3> cameraPositions{};
    cameraPositions.reserve(mesh.positions.size());
    for (const Vec3 position : mesh.positions) {
        cameraPositions.push_back(worldToCamera(rotateModelPoint(position, options.angleX, options.angleY), camera));
    }
    for (std::size_t position = 0; position < mesh.triangles.size(); ++position) {
        std::size_t triangleIndex = position;
        if (options.reverseOrder) {
            triangleIndex = mesh.triangles.size() - 1 - position;
        }
        const ObjTriangle& source = mesh.triangles[triangleIndex];
        const Vec3 a = cameraPositions[source.indices[0]];
        const Vec3 b = cameraPositions[source.indices[1]];
        const Vec3 c = cameraPositions[source.indices[2]];
        const std::optional<Vec3> normal = faceNormal(a, b, c);
        if (!normal) {
            ++stats.degenerateTriangles;
            continue;
        }
        if (options.cullBackfaces && !isFrontFacing(*normal, a, b, c)) {
            ++stats.culledTriangles;
            continue;
        }

        const std::vector<Vec3> polygon = clipTriangleToNearPlane(
            a,
            b,
            c,
            options.nearPlane
        );
        if (polygon.size() < 3) {
            ++stats.clippedTriangles;
            continue;
        }
        if (polygon.size() != 3) {
            ++stats.clippedTriangles;
        }
        const Color color = shadeColor(base, lambertIntensity(*normal, lightDirection));
        for (std::size_t fanIndex = 1; fanIndex + 1 < polygon.size(); ++fanIndex) {
            const std::optional<ScreenVertex> screenA = projectVertex(
                polygon[0],
                width,
                height,
                options.nearPlane
            );
            const std::optional<ScreenVertex> screenB = projectVertex(
                polygon[fanIndex],
                width,
                height,
                options.nearPlane
            );
            const std::optional<ScreenVertex> screenC = projectVertex(
                polygon[fanIndex + 1],
                width,
                height,
                options.nearPlane
            );
            if (!screenA || !screenB || !screenC) {
                continue;
            }
            ++stats.rasterizedTriangles;
            stats.coveredFragments += rasterizeTriangle(
                {*screenA, *screenB, *screenC, color, source.sourceFace},
                width,
                height,
                [&](int x, int y, Barycentric weights, const ScreenTriangle& triangle) {
                    const std::size_t index = depths.index(x, y);
                    const double newDepth = interpolateDepth(triangle, weights);
                    if (!std::isfinite(newDepth) || newDepth < -1e-9 || newDepth > 1.0 || newDepth >= depths.values[index]) {
                        ++stats.rejectedFragments;
                        return;
                    }
                    depths.values[index] = std::max(0.0, newDepth);
                    colors[index] = packColor(triangle.color);
                    ++stats.passedFragments;
                }
            );
        }
    }
    return stats;
}

inline bool depthBuffersNearlyEqual(
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
#endif

} // namespace lab
