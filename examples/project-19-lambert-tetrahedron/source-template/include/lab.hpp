#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <optional>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
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

struct Face {
    std::array<std::size_t, 3> indices{};
    Color baseColor{};
};

struct TetrahedronMesh {
    std::array<Vec3, 4> vertices{};
    std::array<Face, 4> faces{};
};

// Bốn face dùng chung đúng bốn vertex. Thứ tự index được chọn để normal hướng ra ngoài.
inline TetrahedronMesh makeTetrahedron() {
    return {
        {{{1.0, 1.0, 1.0}, {-1.0, -1.0, 1.0}, {-1.0, 1.0, -1.0}, {1.0, -1.0, -1.0}}},
        {{
            {{{1, 2, 3}}, {244.0, 114.0, 126.0}},
            {{{0, 3, 2}}, {91.0, 197.0, 255.0}},
            {{{0, 1, 3}}, {255.0, 190.0, 92.0}},
            {{{0, 2, 1}}, {126.0, 231.0, 164.0}},
        }},
    };
}

inline std::array<Vec3, 3> faceVertices(const TetrahedronMesh& mesh, const Face& face) {
    return {
        mesh.vertices[face.indices[0]],
        mesh.vertices[face.indices[1]],
        mesh.vertices[face.indices[2]],
    };
}

inline Vec3 add(Vec3 left, Vec3 right) {
    return {left.x + right.x, left.y + right.y, left.z + right.z};
}

inline Vec3 subtract(Vec3 left, Vec3 right) {
    return {left.x - right.x, left.y - right.y, left.z - right.z};
}

inline Vec3 scale(Vec3 value, double scalar) {
    return {value.x * scalar, value.y * scalar, value.z * scalar};
}
#endif

#if LAB_CHECKPOINT >= 2
inline double dot(Vec3 left, Vec3 right) {
    return left.x * right.x + left.y * right.y + left.z * right.z;
}

inline Vec3 cross(Vec3 left, Vec3 right) {
    return {
        left.y * right.z - left.z * right.y,
        left.z * right.x - left.x * right.z,
        left.x * right.y - left.y * right.x,
    };
}

inline double length(Vec3 value) {
    return std::sqrt(dot(value, value));
}

inline Vec3 normalize(Vec3 value) {
    const double magnitude = length(value);
    if (magnitude <= 1e-12) {
        return {};
    }
    return scale(value, 1.0 / magnitude);
}

inline Vec3 faceCentroid(const std::array<Vec3, 3>& vertices) {
    return scale(add(add(vertices[0], vertices[1]), vertices[2]), 1.0 / 3.0);
}

inline Vec3 faceRawNormal(const std::array<Vec3, 3>& vertices) {
    const Vec3 edgeAB = subtract(vertices[1], vertices[0]);
    const Vec3 edgeAC = subtract(vertices[2], vertices[0]);
    return cross(edgeAB, edgeAC);
}

inline Vec3 faceUnitNormal(const std::array<Vec3, 3>& vertices) {
    return normalize(faceRawNormal(vertices));
}

inline bool hasOutwardWinding(
    const std::array<Vec3, 3>& vertices,
    Vec3 meshCentroid = {}
) {
    const Vec3 fromMeshToFace = subtract(faceCentroid(vertices), meshCentroid);
    return dot(faceRawNormal(vertices), fromMeshToFace) > 0.0;
}
#endif

#if LAB_CHECKPOINT >= 3
struct DirectionalLight {
    // surfaceToLight luôn chỉ từ bề mặt về phía nguồn sáng.
    Vec3 surfaceToLight{};
};

inline DirectionalLight makeDirectionalLight(Vec3 surfaceToLight) {
    DirectionalLight light{};
    light.surfaceToLight = normalize(surfaceToLight);
    return light;
}
#endif

#if LAB_CHECKPOINT >= 4
inline double lambertDiffuse(Vec3 unitNormal, Vec3 unitSurfaceToLight) {
    const double cosine = dot(normalize(unitNormal), normalize(unitSurfaceToLight));
    return std::max(0.0, cosine);
}
#endif

#if LAB_CHECKPOINT >= 5
struct Material {
    Color baseColor{};
    double ambient{0.16};
    double diffuseStrength{0.84};
};

struct LightingSample {
    double dotValue{};
    double diffuse{};
    double intensity{};
    Color shadedColor{};
};

inline Color multiplyColor(Color color, double intensity) {
    return {
        std::clamp(color.red * intensity, 0.0, 255.0),
        std::clamp(color.green * intensity, 0.0, 255.0),
        std::clamp(color.blue * intensity, 0.0, 255.0),
    };
}

inline LightingSample shadeMaterial(
    Vec3 unitNormal,
    const DirectionalLight& light,
    const Material& material
) {
    LightingSample sample{};
    sample.dotValue = dot(normalize(unitNormal), light.surfaceToLight);
    sample.diffuse = std::max(0.0, sample.dotValue);
    sample.intensity = std::clamp(
        material.ambient + material.diffuseStrength * sample.diffuse,
        0.0,
        1.0
    );
    sample.shadedColor = multiplyColor(material.baseColor, sample.intensity);
    return sample;
}
#endif

#if LAB_CHECKPOINT >= 6
inline Vec3 rotateX(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        point.x,
        point.y * cosine - point.z * sine,
        point.y * sine + point.z * cosine,
    };
}

inline Vec3 rotateY(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        point.x * cosine + point.z * sine,
        point.y,
        -point.x * sine + point.z * cosine,
    };
}

inline TetrahedronMesh transformMesh(
    const TetrahedronMesh& localMesh,
    double pitch,
    double yaw,
    Vec3 translation
) {
    TetrahedronMesh transformed = localMesh;
    for (std::size_t index = 0; index < localMesh.vertices.size(); ++index) {
        Vec3 point = rotateX(localMesh.vertices[index], pitch);
        point = rotateY(point, yaw);
        transformed.vertices[index] = add(point, translation);
    }
    return transformed;
}

inline bool isFrontFacing(const std::array<Vec3, 3>& cameraVertices) {
    const Vec3 unitNormal = faceUnitNormal(cameraVertices);
    const Vec3 toCamera = normalize(scale(faceCentroid(cameraVertices), -1.0));
    return dot(unitNormal, toCamera) > 0.0;
}
#endif

#if LAB_CHECKPOINT >= 7
struct Triangle3 {
    std::array<Vec3, 3> vertices{};
};

struct ClippedPolygon {
    std::array<Vec3, 4> vertices{};
    std::size_t count{};
};

inline bool isInsideNearPlane(Vec3 vertex, double nearPlane, double epsilon = 1e-9) {
    return vertex.z >= nearPlane - epsilon;
}

inline Vec3 intersectNearPlane(Vec3 start, Vec3 end, double nearPlane) {
    const double depthChange = end.z - start.z;
    if (std::abs(depthChange) <= 1e-12) {
        return {start.x, start.y, nearPlane};
    }

    const double t = std::clamp((nearPlane - start.z) / depthChange, 0.0, 1.0);
    Vec3 result = add(start, scale(subtract(end, start), t));
    result.z = nearPlane;
    return result;
}

inline void appendVertex(ClippedPolygon& polygon, Vec3 vertex) {
    if (polygon.count < polygon.vertices.size()) {
        polygon.vertices[polygon.count] = vertex;
        ++polygon.count;
    }
}

inline ClippedPolygon clipTriangleToNearPlane(
    const Triangle3& triangle,
    double nearPlane,
    double epsilon = 1e-9
) {
    ClippedPolygon output{};
    Vec3 previous = triangle.vertices.back();
    bool previousInside = isInsideNearPlane(previous, nearPlane, epsilon);

    for (const Vec3 current : triangle.vertices) {
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
    std::array<Triangle3, 2> triangles{};
    std::size_t count{};
};

inline TriangleBatch triangulateFan(const ClippedPolygon& polygon) {
    TriangleBatch batch{};
    if (polygon.count < 3) {
        return batch;
    }

    for (std::size_t index = 1; index + 1 < polygon.count; ++index) {
        batch.triangles[batch.count] = {
            {polygon.vertices[0], polygon.vertices[index], polygon.vertices[index + 1]},
        };
        ++batch.count;
    }
    return batch;
}

struct Viewport {
    int width{};
    int height{};
};

struct ScreenTriangle {
    std::array<Vec2, 3> vertices{};
};

inline std::optional<Vec2> projectVertex(
    Vec3 vertex,
    double verticalFovRadians,
    const Viewport& viewport,
    double nearPlane
) {
    if (vertex.z < nearPlane || viewport.width <= 0 || viewport.height <= 0) {
        return std::nullopt;
    }

    const double aspect = double(viewport.width) / double(viewport.height);
    const double focalScale = 1.0 / std::tan(verticalFovRadians * 0.5);
    const double ndcX = vertex.x * focalScale / (aspect * vertex.z);
    const double ndcY = vertex.y * focalScale / vertex.z;
    return Vec2{
        (ndcX * 0.5 + 0.5) * double(viewport.width),
        (0.5 - ndcY * 0.5) * double(viewport.height),
    };
}

inline std::optional<ScreenTriangle> projectTriangle(
    const Triangle3& triangle,
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

struct RasterStats {
    std::size_t candidateCount{};
    std::size_t coveredCount{};
};

template <typename ShadePixel>
RasterStats rasterizeTriangle(
    ScreenTriangle triangle,
    int width,
    int height,
    ShadePixel shadePixel
) {
    RasterStats stats{};
    double area = edgeFunction(
        triangle.vertices[0],
        triangle.vertices[1],
        triangle.vertices[2]
    );
    if (std::abs(area) <= 1e-9 || width <= 0 || height <= 0) {
        return stats;
    }
    if (area < 0.0) {
        std::swap(triangle.vertices[1], triangle.vertices[2]);
        area = -area;
    }

    const double minimumX = std::min({
        triangle.vertices[0].x,
        triangle.vertices[1].x,
        triangle.vertices[2].x,
    });
    const double maximumX = std::max({
        triangle.vertices[0].x,
        triangle.vertices[1].x,
        triangle.vertices[2].x,
    });
    const double minimumY = std::min({
        triangle.vertices[0].y,
        triangle.vertices[1].y,
        triangle.vertices[2].y,
    });
    const double maximumY = std::max({
        triangle.vertices[0].y,
        triangle.vertices[1].y,
        triangle.vertices[2].y,
    });

    const int left = std::max(0, int(std::floor(minimumX)));
    const int right = std::min(width - 1, int(std::ceil(maximumX)));
    const int top = std::max(0, int(std::floor(minimumY)));
    const int bottom = std::min(height - 1, int(std::ceil(maximumY)));
    const bool edge0TopLeft = isTopLeftEdge(triangle.vertices[1], triangle.vertices[2]);
    const bool edge1TopLeft = isTopLeftEdge(triangle.vertices[2], triangle.vertices[0]);
    const bool edge2TopLeft = isTopLeftEdge(triangle.vertices[0], triangle.vertices[1]);

    for (int y = top; y <= bottom; ++y) {
        for (int x = left; x <= right; ++x) {
            ++stats.candidateCount;
            const Vec2 sample{double(x) + 0.5, double(y) + 0.5};
            const double edge0 = edgeFunction(
                triangle.vertices[1],
                triangle.vertices[2],
                sample
            );
            const double edge1 = edgeFunction(
                triangle.vertices[2],
                triangle.vertices[0],
                sample
            );
            const double edge2 = edgeFunction(
                triangle.vertices[0],
                triangle.vertices[1],
                sample
            );
            const bool inside0 = edge0 > 0.0 || (std::abs(edge0) <= 1e-9 && edge0TopLeft);
            const bool inside1 = edge1 > 0.0 || (std::abs(edge1) <= 1e-9 && edge1TopLeft);
            const bool inside2 = edge2 > 0.0 || (std::abs(edge2) <= 1e-9 && edge2TopLeft);
            if (inside0 && inside1 && inside2) {
                shadePixel(x, y);
                ++stats.coveredCount;
            }
        }
    }
    return stats;
}

inline bool isFinite(Vec3 value) {
    return std::isfinite(value.x) && std::isfinite(value.y) && std::isfinite(value.z);
}
#endif
} // namespace lab
