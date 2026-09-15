#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <optional>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
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

struct Color {
    double red{};
    double green{};
    double blue{};
};

struct TexturedVertex {
    Vec3 position{};
    Vec2 uv{};
};

struct TexturedTriangle {
    std::array<TexturedVertex, 3> vertices{};
};

struct TexturedQuad {
    std::array<TexturedVertex, 4> vertices{};
    std::array<std::array<std::size_t, 3>, 2> faces{};
};

struct Viewport {
    int left{};
    int top{};
    int width{};
    int height{};
};

// U tăng sang phải, V tăng xuống dưới texture; winding hướng về camera tại origin.
inline TexturedQuad makeTiltedQuad(double nearDepth = 2.2, double farDepth = 6.2) {
    return {
        {{
            {{-1.6, -1.0, nearDepth}, {0.0, 1.0}},
            {{1.6, -1.0, farDepth}, {1.0, 1.0}},
            {{1.6, 1.0, farDepth}, {1.0, 0.0}},
            {{-1.6, 1.0, nearDepth}, {0.0, 0.0}},
        }},
        {{{0, 2, 1}, {0, 3, 2}}},
    };
}

inline TexturedTriangle quadTriangle(const TexturedQuad& quad, std::size_t faceIndex) {
    const auto& face = quad.faces[faceIndex];
    return {{
        quad.vertices[face[0]],
        quad.vertices[face[1]],
        quad.vertices[face[2]],
    }};
}

inline double mix(double start, double end, double t) {
    return start + (end - start) * t;
}

inline Vec2 mix(Vec2 start, Vec2 end, double t) {
    return {mix(start.x, end.x, t), mix(start.y, end.y, t)};
}

inline Vec3 mix(Vec3 start, Vec3 end, double t) {
    return {
        mix(start.x, end.x, t),
        mix(start.y, end.y, t),
        mix(start.z, end.z, t),
    };
}
#endif

#if LAB_CHECKPOINT >= 2
enum class AddressMode {
    clamp,
    repeat,
};

struct Texture2D {
    int width{};
    int height{};
    std::vector<Color> texels{};
};

inline Texture2D makeCheckerTexture(
    int width = 64,
    int height = 64,
    int cells = 8
) {
    Texture2D texture{};
    if (width <= 0 || height <= 0 || cells <= 0) {
        return texture;
    }

    texture.width = width;
    texture.height = height;
    texture.texels.resize(std::size_t(width) * std::size_t(height));
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            const int cellX = x * cells / width;
            const int cellY = y * cells / height;
            Color color{236.0, 240.0, 248.0};
            if ((cellX + cellY) % 2 != 0) {
                color = {38.0, 48.0, 72.0};
            }
            texture.texels[std::size_t(y) * std::size_t(width) + std::size_t(x)] = color;
        }
    }
    return texture;
}

inline double addressCoordinate(double value, AddressMode mode) {
    if (mode == AddressMode::clamp) {
        return std::clamp(value, 0.0, 1.0);
    }
    return value - std::floor(value);
}

inline std::array<int, 2> nearestTexelIndex(
    const Texture2D& texture,
    Vec2 uv,
    AddressMode mode
) {
    if (texture.width <= 0 || texture.height <= 0) {
        return {0, 0};
    }

    const double addressedU = addressCoordinate(uv.x, mode);
    const double addressedV = addressCoordinate(uv.y, mode);
    int x = int(std::floor(addressedU * double(texture.width)));
    int y = int(std::floor(addressedV * double(texture.height)));
    x = std::clamp(x, 0, texture.width - 1);
    y = std::clamp(y, 0, texture.height - 1);
    return {x, y};
}

inline Color sampleNearest(const Texture2D& texture, Vec2 uv, AddressMode mode) {
    if (texture.texels.empty()) {
        return {255.0, 0.0, 255.0};
    }
    const auto texel = nearestTexelIndex(texture, uv, mode);
    return texture.texels[std::size_t(texel[1]) * std::size_t(texture.width) + std::size_t(texel[0])];
}
#endif

#if LAB_CHECKPOINT >= 3
struct Barycentric {
    double a{};
    double b{};
    double c{};
};

struct ScreenVertex {
    Vec2 position{};
    Vec2 uv{};
    double cameraDepth{};
#if LAB_CHECKPOINT >= 5
    double oneOverZ{};
    double uOverZ{};
    double vOverZ{};
#endif
};

struct ScreenTriangle {
    std::array<ScreenVertex, 3> vertices{};
};

inline std::optional<ScreenVertex> projectVertex(
    const TexturedVertex& vertex,
    double verticalFovRadians,
    const Viewport& viewport,
    double nearPlane
) {
    if (vertex.position.z < nearPlane || viewport.width <= 0 || viewport.height <= 0) {
        return std::nullopt;
    }

    const double aspect = double(viewport.width) / double(viewport.height);
    const double focalScale = 1.0 / std::tan(verticalFovRadians * 0.5);
    const double ndcX = vertex.position.x * focalScale / (aspect * vertex.position.z);
    const double ndcY = vertex.position.y * focalScale / vertex.position.z;
    ScreenVertex result{};
    result.position = {
        double(viewport.left) + (ndcX * 0.5 + 0.5) * double(viewport.width),
        double(viewport.top) + (0.5 - ndcY * 0.5) * double(viewport.height),
    };
    result.uv = vertex.uv;
    result.cameraDepth = vertex.position.z;
#if LAB_CHECKPOINT >= 5
    result.oneOverZ = 1.0 / vertex.position.z;
    result.uOverZ = vertex.uv.x * result.oneOverZ;
    result.vOverZ = vertex.uv.y * result.oneOverZ;
#endif
    return result;
}

inline std::optional<ScreenTriangle> projectTriangle(
    const TexturedTriangle& triangle,
    double verticalFovRadians,
    const Viewport& viewport,
    double nearPlane
) {
    ScreenTriangle output{};
    for (std::size_t index = 0; index < triangle.vertices.size(); ++index) {
        const auto projected = projectVertex(
            triangle.vertices[index],
            verticalFovRadians,
            viewport,
            nearPlane
        );
        if (!projected) {
            return std::nullopt;
        }
        output.vertices[index] = *projected;
    }
    return output;
}

inline double edgeFunction(Vec2 start, Vec2 end, Vec2 point) {
    return (point.x - start.x) * (end.y - start.y) -
        (point.y - start.y) * (end.x - start.x);
}

inline bool isTopLeftEdge(Vec2 start, Vec2 end) {
    const double deltaX = end.x - start.x;
    const double deltaY = end.y - start.y;
    return deltaY < 0.0 || (std::abs(deltaY) <= 1e-12 && deltaX > 0.0);
}

inline Vec2 interpolateAffineUv(const ScreenTriangle& triangle, Barycentric weights) {
    return {
        weights.a * triangle.vertices[0].uv.x +
            weights.b * triangle.vertices[1].uv.x +
            weights.c * triangle.vertices[2].uv.x,
        weights.a * triangle.vertices[0].uv.y +
            weights.b * triangle.vertices[1].uv.y +
            weights.c * triangle.vertices[2].uv.y,
    };
}

struct RasterSample {
    int x{};
    int y{};
    Barycentric barycentric{};
};

struct RasterStats {
    std::size_t candidateCount{};
    std::size_t coveredCount{};
};

template <typename ShadePixel>
RasterStats rasterizeTriangle(
    ScreenTriangle triangle,
    int framebufferWidth,
    int framebufferHeight,
    ShadePixel shadePixel
) {
    RasterStats stats{};
    double area = edgeFunction(
        triangle.vertices[0].position,
        triangle.vertices[1].position,
        triangle.vertices[2].position
    );
    if (std::abs(area) <= 1e-9 || framebufferWidth <= 0 || framebufferHeight <= 0) {
        return stats;
    }
    if (area < 0.0) {
        std::swap(triangle.vertices[1], triangle.vertices[2]);
        area = -area;
    }

    const double minimumX = std::min({
        triangle.vertices[0].position.x,
        triangle.vertices[1].position.x,
        triangle.vertices[2].position.x,
    });
    const double maximumX = std::max({
        triangle.vertices[0].position.x,
        triangle.vertices[1].position.x,
        triangle.vertices[2].position.x,
    });
    const double minimumY = std::min({
        triangle.vertices[0].position.y,
        triangle.vertices[1].position.y,
        triangle.vertices[2].position.y,
    });
    const double maximumY = std::max({
        triangle.vertices[0].position.y,
        triangle.vertices[1].position.y,
        triangle.vertices[2].position.y,
    });
    const int left = std::max(0, int(std::floor(minimumX)));
    const int right = std::min(framebufferWidth - 1, int(std::ceil(maximumX)));
    const int top = std::max(0, int(std::floor(minimumY)));
    const int bottom = std::min(framebufferHeight - 1, int(std::ceil(maximumY)));
    const bool edge0TopLeft = isTopLeftEdge(
        triangle.vertices[1].position,
        triangle.vertices[2].position
    );
    const bool edge1TopLeft = isTopLeftEdge(
        triangle.vertices[2].position,
        triangle.vertices[0].position
    );
    const bool edge2TopLeft = isTopLeftEdge(
        triangle.vertices[0].position,
        triangle.vertices[1].position
    );

    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            ++stats.candidateCount;
            const Vec2 point{double(x) + 0.5, double(y) + 0.5};
            const double edge0 = edgeFunction(
                triangle.vertices[1].position,
                triangle.vertices[2].position,
                point
            );
            const double edge1 = edgeFunction(
                triangle.vertices[2].position,
                triangle.vertices[0].position,
                point
            );
            const double edge2 = edgeFunction(
                triangle.vertices[0].position,
                triangle.vertices[1].position,
                point
            );
            const bool inside0 = edge0 > 0.0 || (std::abs(edge0) <= 1e-9 && edge0TopLeft);
            const bool inside1 = edge1 > 0.0 || (std::abs(edge1) <= 1e-9 && edge1TopLeft);
            const bool inside2 = edge2 > 0.0 || (std::abs(edge2) <= 1e-9 && edge2TopLeft);
            if (inside0 && inside1 && inside2) {
                const Barycentric weights{edge0 / area, edge1 / area, edge2 / area};
                shadePixel(RasterSample{x, y, weights});
                ++stats.coveredCount;
            }
        }
    }
    return stats;
}
#endif

#if LAB_CHECKPOINT >= 4
inline Vec2 referenceUvFromCameraDepths(
    const ScreenTriangle& triangle,
    Barycentric weights
) {
    const double weightedA = weights.a / triangle.vertices[0].cameraDepth;
    const double weightedB = weights.b / triangle.vertices[1].cameraDepth;
    const double weightedC = weights.c / triangle.vertices[2].cameraDepth;
    const double denominator = weightedA + weightedB + weightedC;
    if (std::abs(denominator) <= 1e-12) {
        return {};
    }
    const double numeratorU = weightedA * triangle.vertices[0].uv.x + weightedB * triangle.vertices[1].uv.x + weightedC * triangle.vertices[2].uv.x;
    const double numeratorV = weightedA * triangle.vertices[0].uv.y + weightedB * triangle.vertices[1].uv.y + weightedC * triangle.vertices[2].uv.y;
    return {numeratorU / denominator, numeratorV / denominator};
}

inline double uvDistance(Vec2 left, Vec2 right) {
    const double deltaU = right.x - left.x;
    const double deltaV = right.y - left.y;
    return std::sqrt(deltaU * deltaU + deltaV * deltaV);
}
#endif

#if LAB_CHECKPOINT >= 5
inline double reciprocalDepthDenominator(
    const ScreenTriangle& triangle,
    Barycentric weights
) {
    return weights.a * triangle.vertices[0].oneOverZ +
        weights.b * triangle.vertices[1].oneOverZ +
        weights.c * triangle.vertices[2].oneOverZ;
}

inline std::optional<Vec2> interpolatePerspectiveUv(
    const ScreenTriangle& triangle,
    Barycentric weights
) {
    const double denominator = reciprocalDepthDenominator(triangle, weights);
    if (std::abs(denominator) <= 1e-12) {
        return std::nullopt;
    }
    const double uOverZ = weights.a * triangle.vertices[0].uOverZ +
        weights.b * triangle.vertices[1].uOverZ +
        weights.c * triangle.vertices[2].uOverZ;
    const double vOverZ = weights.a * triangle.vertices[0].vOverZ +
        weights.b * triangle.vertices[1].vOverZ +
        weights.c * triangle.vertices[2].vOverZ;
    return Vec2{uOverZ / denominator, vOverZ / denominator};
}
#endif

#if LAB_CHECKPOINT >= 6
enum class InterpolationMode {
    affine,
    perspectiveCorrect,
};

inline std::optional<Vec2> interpolateUv(
    const ScreenTriangle& triangle,
    Barycentric weights,
    InterpolationMode mode
) {
    if (mode == InterpolationMode::affine) {
        return interpolateAffineUv(triangle, weights);
    }
    return interpolatePerspectiveUv(triangle, weights);
}
#endif

#if LAB_CHECKPOINT >= 7
struct ClippedPolygon {
    std::array<TexturedVertex, 4> vertices{};
    std::size_t count{};
};

inline bool isInsideNearPlane(
    const TexturedVertex& vertex,
    double nearPlane,
    double epsilon = 1e-9
) {
    return vertex.position.z >= nearPlane - epsilon;
}

inline TexturedVertex intersectNearPlane(
    const TexturedVertex& start,
    const TexturedVertex& end,
    double nearPlane
) {
    const double depthChange = end.position.z - start.position.z;
    if (std::abs(depthChange) <= 1e-12) {
        TexturedVertex result = start;
        result.position.z = nearPlane;
        return result;
    }

    const double t = std::clamp((nearPlane - start.position.z) / depthChange, 0.0, 1.0);
    TexturedVertex result{};
    result.position = mix(start.position, end.position, t);
    result.position.z = nearPlane;
    result.uv = mix(start.uv, end.uv, t);
    return result;
}

inline void appendVertex(ClippedPolygon& polygon, const TexturedVertex& vertex) {
    if (polygon.count < polygon.vertices.size()) {
        polygon.vertices[polygon.count] = vertex;
        ++polygon.count;
    }
}

inline ClippedPolygon clipTriangleToNearPlane(
    const TexturedTriangle& triangle,
    double nearPlane,
    double epsilon = 1e-9
) {
    ClippedPolygon output{};
    TexturedVertex previous = triangle.vertices.back();
    bool previousInside = isInsideNearPlane(previous, nearPlane, epsilon);

    for (const TexturedVertex& current : triangle.vertices) {
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

struct TriangleBatch {
    std::array<TexturedTriangle, 2> triangles{};
    std::size_t count{};
};

inline TriangleBatch triangulateFan(const ClippedPolygon& polygon) {
    TriangleBatch batch{};
    if (polygon.count < 3) {
        return batch;
    }
    for (std::size_t index = 1; index + 1 < polygon.count; ++index) {
        batch.triangles[batch.count] = {{
            polygon.vertices[0],
            polygon.vertices[index],
            polygon.vertices[index + 1],
        }};
        ++batch.count;
    }
    return batch;
}
#endif

#if LAB_CHECKPOINT >= 8
struct TextureRenderStats {
    std::size_t triangleCount{};
    std::size_t coveredCount{};
    double maximumUvError{};
};

// Callback của renderer nhận đúng dữ liệu đã dùng để tô pixel. Ứng dụng,
// inspector và test vì thế không cần tự dựng thêm một pipeline nội suy khác.
struct TexturedPixel {
    int x{};
    int y{};
    Barycentric barycentric{};
    Vec2 affineUv{};
    Vec2 correctedUv{};
    Vec2 selectedUv{};
    double denominator{};
    std::array<int, 2> texel{};
    Color color{};
};

template <typename PutPixel>
TextureRenderStats renderTexturedTriangle(
    const TexturedTriangle& triangle,
    const Texture2D& texture,
    const Viewport& viewport,
    double verticalFovRadians,
    double nearPlane,
    InterpolationMode mode,
    AddressMode addressMode,
    int framebufferWidth,
    int framebufferHeight,
    PutPixel putPixel
) {
    TextureRenderStats total{};
    const ClippedPolygon polygon = clipTriangleToNearPlane(triangle, nearPlane);
    const TriangleBatch batch = triangulateFan(polygon);
    total.triangleCount = batch.count;

    for (std::size_t index = 0; index < batch.count; ++index) {
        const auto screen = projectTriangle(
            batch.triangles[index],
            verticalFovRadians,
            viewport,
            nearPlane
        );
        if (!screen) {
            continue;
        }
        const RasterStats stats = rasterizeTriangle(
            *screen,
            framebufferWidth,
            framebufferHeight,
            [&](RasterSample sample) {
                const Vec2 affineUv = interpolateAffineUv(*screen, sample.barycentric);
                const auto correctedUv = interpolatePerspectiveUv(*screen, sample.barycentric);
                if (!correctedUv) {
                    return;
                }
                total.maximumUvError = std::max(
                    total.maximumUvError,
                    uvDistance(affineUv, *correctedUv)
                );
                const auto selectedUv = interpolateUv(*screen, sample.barycentric, mode);
                if (!selectedUv) {
                    return;
                }

                TexturedPixel pixel{};
                pixel.x = sample.x;
                pixel.y = sample.y;
                pixel.barycentric = sample.barycentric;
                pixel.affineUv = affineUv;
                pixel.correctedUv = *correctedUv;
                pixel.selectedUv = *selectedUv;
                pixel.denominator = reciprocalDepthDenominator(*screen, sample.barycentric);
                pixel.texel = nearestTexelIndex(texture, *selectedUv, addressMode);
                pixel.color = sampleNearest(texture, *selectedUv, addressMode);
                putPixel(pixel);
            }
        );
        total.coveredCount += stats.coveredCount;
    }
    return total;
}

inline bool isFinite(Vec2 value) {
    return std::isfinite(value.x) && std::isfinite(value.y);
}

inline bool isFinite(Vec3 value) {
    return std::isfinite(value.x) && std::isfinite(value.y) && std::isfinite(value.z);
}
#endif
} // namespace lab
