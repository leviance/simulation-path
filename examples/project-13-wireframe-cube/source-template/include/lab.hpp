#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 5
#endif

namespace lab {
constexpr double kPi = 3.14159265358979323846;

struct Vec2 {
    double x{};
    double y{};
};

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

inline Vec3 add(Vec3 left, Vec3 right) {
    return {left.x + right.x, left.y + right.y, left.z + right.z};
}

inline Vec3 subtract(Vec3 left, Vec3 right) {
    return {left.x - right.x, left.y - right.y, left.z - right.z};
}

inline double magnitude(Vec3 vector) {
    return std::hypot(vector.x, vector.y, vector.z);
}

struct Camera3D {
    Vec3 position{};
};

struct PerspectiveLens {
    double verticalFovRadians{60.0 * kPi / 180.0};
};

enum class ProjectionStatus {
    Visible,
    BehindCamera,
    BeforeNearPlane,
    OutsideFrustum,
};

struct ProjectionResult {
    ProjectionStatus status{ProjectionStatus::BehindCamera};
    Vec3 cameraPoint{};
    Vec2 ndc{};
    Vec2 screen{};
};

inline Vec3 worldToCamera(Vec3 worldPoint, const Camera3D& camera) {
    return subtract(worldPoint, camera.position);
}

inline Vec2 cameraToNdc(Vec3 cameraPoint, const PerspectiveLens& lens, double aspectRatio) {
    const double focalScale = 1.0 / std::tan(lens.verticalFovRadians * 0.5);
    return {
        cameraPoint.x * focalScale / (cameraPoint.z * aspectRatio),
        cameraPoint.y * focalScale / cameraPoint.z,
    };
}

inline Vec2 ndcToScreen(Vec2 ndc, int width, int height) {
    return {
        (ndc.x + 1.0) * 0.5 * width,
        (1.0 - ndc.y) * 0.5 * height,
    };
}

inline ProjectionResult projectPerspective(
    Vec3 worldPoint,
    const Camera3D& camera,
    const PerspectiveLens& lens,
    double nearPlane,
    int width,
    int height
) {
    ProjectionResult result{};
    result.cameraPoint = worldToCamera(worldPoint, camera);
    if (result.cameraPoint.z <= 0.0) {
        result.status = ProjectionStatus::BehindCamera;
        return result;
    }
    if (result.cameraPoint.z < nearPlane) {
        result.status = ProjectionStatus::BeforeNearPlane;
        return result;
    }

    result.ndc = cameraToNdc(result.cameraPoint, lens, double(width) / double(height));
    result.screen = ndcToScreen(result.ndc, width, height);
    if (std::abs(result.ndc.x) > 1.0 || std::abs(result.ndc.y) > 1.0) {
        result.status = ProjectionStatus::OutsideFrustum;
        return result;
    }
    result.status = ProjectionStatus::Visible;
    return result;
}

#if LAB_CHECKPOINT >= 1
// Tám index đi theo hai lớp local Z; mỗi coordinate chỉ nhận -halfExtent hoặc +halfExtent.
constexpr std::size_t kCubeVertexCount = 8;
using CubeVertices = std::array<Vec3, kCubeVertexCount>;

inline CubeVertices makeCubeVertices(double halfExtent, Vec3 center = {}) {
    const double h = std::abs(halfExtent);
    return {{
        add(center, {-h, -h, -h}),
        add(center, {h, -h, -h}),
        add(center, {h, h, -h}),
        add(center, {-h, h, -h}),
        add(center, {-h, -h, h}),
        add(center, {h, -h, h}),
        add(center, {h, h, h}),
        add(center, {-h, h, h}),
    }};
}

struct ProjectedCube {
    std::array<ProjectionResult, kCubeVertexCount> vertices{};
    std::size_t projectionCount{};
};

inline ProjectedCube projectCube(
    const CubeVertices& worldVertices,
    const Camera3D& camera,
    const PerspectiveLens& lens,
    double nearPlane,
    int width,
    int height
) {
    ProjectedCube result{};
    for (std::size_t index = 0; index < worldVertices.size(); ++index) {
        result.vertices[index] = projectPerspective(
            worldVertices[index],
            camera,
            lens,
            nearPlane,
            width,
            height
        );
        ++result.projectionCount;
    }
    return result;
}

inline std::size_t countVisibleVertices(const ProjectedCube& cube) {
    return std::count_if(cube.vertices.begin(), cube.vertices.end(), [](const ProjectionResult& vertex) {
        return vertex.status == ProjectionStatus::Visible;
    });
}
#endif

#if LAB_CHECKPOINT >= 2
// Topology chỉ lưu index; nó không phụ thuộc world position, projection hoặc màu vẽ.
struct Edge {
    std::size_t from{};
    std::size_t to{};
};

inline constexpr std::array<Edge, 12> kCubeEdges{{
    {0, 1},
    {1, 2},
    {2, 3},
    {3, 0},
    {4, 5},
    {5, 6},
    {6, 7},
    {7, 4},
    {0, 4},
    {1, 5},
    {2, 6},
    {3, 7},
}};

inline bool isValidEdge(Edge edge) {
    return edge.from < kCubeVertexCount && edge.to < kCubeVertexCount && edge.from != edge.to;
}

inline std::array<int, kCubeVertexCount> cubeVertexDegrees() {
    std::array<int, kCubeVertexCount> degrees{};
    for (const Edge edge : kCubeEdges) {
        if (!isValidEdge(edge)) {
            continue;
        }
        ++degrees[edge.from];
        ++degrees[edge.to];
    }
    return degrees;
}

inline bool hasValidCubeTopology() {
    for (std::size_t left = 0; left < kCubeEdges.size(); ++left) {
        if (!isValidEdge(kCubeEdges[left])) {
            return false;
        }
        for (std::size_t right = left + 1; right < kCubeEdges.size(); ++right) {
            const Edge a = kCubeEdges[left];
            const Edge b = kCubeEdges[right];
            const bool sameDirection = a.from == b.from && a.to == b.to;
            const bool oppositeDirection = a.from == b.to && a.to == b.from;
            if (sameDirection || oppositeDirection) {
                return false;
            }
        }
    }
    const std::array<int, kCubeVertexCount> degrees = cubeVertexDegrees();
    return std::all_of(degrees.begin(), degrees.end(), [](int degree) {
        return degree == 3;
    });
}

inline bool isProjectedEdgeVisible(const ProjectedCube& cube, Edge edge) {
    if (!isValidEdge(edge)) {
        return false;
    }
    return cube.vertices[edge.from].status == ProjectionStatus::Visible &&
        cube.vertices[edge.to].status == ProjectionStatus::Visible;
}

inline std::size_t countVisibleEdges(const ProjectedCube& cube) {
    return std::count_if(kCubeEdges.begin(), kCubeEdges.end(), [&cube](Edge edge) {
        return isProjectedEdgeVisible(cube, edge);
    });
}
#endif

#if LAB_CHECKPOINT >= 3
// Euler rotation được giữ tường minh để người học thấy mỗi vertex đi qua cùng một pipeline.
struct EulerAngles {
    double pitch{};
    double yaw{};
    double roll{};
};

enum class RotationOrder {
    Xyz,
    Zyx,
};

inline Vec3 rotateX(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        point.x,
        cosine * point.y - sine * point.z,
        sine * point.y + cosine * point.z,
    };
}

inline Vec3 rotateY(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        cosine * point.x + sine * point.z,
        point.y,
        -sine * point.x + cosine * point.z,
    };
}

inline Vec3 rotateZ(Vec3 point, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {
        cosine * point.x - sine * point.y,
        sine * point.x + cosine * point.y,
        point.z,
    };
}

inline Vec3 rotateEuler(Vec3 point, EulerAngles angles, RotationOrder order) {
    if (order == RotationOrder::Zyx) {
        Vec3 rotated = rotateZ(point, angles.roll);
        rotated = rotateY(rotated, angles.yaw);
        return rotateX(rotated, angles.pitch);
    }
    Vec3 rotated = rotateX(point, angles.pitch);
    rotated = rotateY(rotated, angles.yaw);
    return rotateZ(rotated, angles.roll);
}

inline CubeVertices rotateCube(
    const CubeVertices& localVertices,
    EulerAngles angles,
    RotationOrder order
) {
    CubeVertices rotated{};
    for (std::size_t index = 0; index < localVertices.size(); ++index) {
        rotated[index] = rotateEuler(localVertices[index], angles, order);
    }
    return rotated;
}

inline CubeVertices translateCube(const CubeVertices& vertices, Vec3 translation) {
    CubeVertices translated{};
    for (std::size_t index = 0; index < vertices.size(); ++index) {
        translated[index] = add(vertices[index], translation);
    }
    return translated;
}
#endif

#if LAB_CHECKPOINT >= 4
// VisibleEdgeList giữ tối đa 12 edge và được sort từ camera-space Z lớn tới nhỏ.
struct VisibleEdge {
    std::size_t edgeIndex{};
    double averageDepth{};
    double depthFactor{};
};

struct VisibleEdgeList {
    std::array<VisibleEdge, kCubeEdges.size()> items{};
    std::size_t count{};
};

inline VisibleEdgeList visibleEdgesBackToFront(const ProjectedCube& cube) {
    VisibleEdgeList result{};
    double nearestDepth = 0.0;
    double farthestDepth = 0.0;
    bool hasDepth = false;

    for (std::size_t edgeIndex = 0; edgeIndex < kCubeEdges.size(); ++edgeIndex) {
        const Edge edge = kCubeEdges[edgeIndex];
        if (!isProjectedEdgeVisible(cube, edge)) {
            continue;
        }
        const double fromDepth = cube.vertices[edge.from].cameraPoint.z;
        const double toDepth = cube.vertices[edge.to].cameraPoint.z;
        const double depth = (fromDepth + toDepth) * 0.5;
        result.items[result.count] = {edgeIndex, depth, 1.0};
        ++result.count;
        if (!hasDepth) {
            nearestDepth = depth;
            farthestDepth = depth;
            hasDepth = true;
        } else {
            nearestDepth = std::min(nearestDepth, depth);
            farthestDepth = std::max(farthestDepth, depth);
        }
    }

    const double depthRange = farthestDepth - nearestDepth;
    for (std::size_t index = 0; index < result.count; ++index) {
        if (depthRange <= 1e-12) {
            result.items[index].depthFactor = 1.0;
        } else {
            result.items[index].depthFactor =
                (farthestDepth - result.items[index].averageDepth) / depthRange;
        }
    }

    std::sort(
        result.items.begin(),
        result.items.begin() + static_cast<std::ptrdiff_t>(result.count),
        [](const VisibleEdge& left, const VisibleEdge& right) {
            return left.averageDepth > right.averageDepth;
        }
    );
    return result;
}
#endif

#if LAB_CHECKPOINT >= 5
// Validation chạy trên dữ liệu thuần C++; không cần SDL window hoặc renderer.
inline Vec3 inverseRotateEuler(Vec3 point, EulerAngles angles, RotationOrder order) {
    if (order == RotationOrder::Zyx) {
        Vec3 restored = rotateX(point, -angles.pitch);
        restored = rotateY(restored, -angles.yaw);
        return rotateZ(restored, -angles.roll);
    }
    Vec3 restored = rotateZ(point, -angles.roll);
    restored = rotateY(restored, -angles.yaw);
    return rotateX(restored, -angles.pitch);
}

inline std::array<double, kCubeEdges.size()> cubeEdgeLengths(const CubeVertices& vertices) {
    std::array<double, kCubeEdges.size()> lengths{};
    for (std::size_t index = 0; index < kCubeEdges.size(); ++index) {
        const Edge edge = kCubeEdges[index];
        lengths[index] = magnitude(subtract(vertices[edge.to], vertices[edge.from]));
    }
    return lengths;
}

inline double maximumCubeEdgeLengthError(
    const CubeVertices& original,
    const CubeVertices& transformed
) {
    const std::array<double, kCubeEdges.size()> before = cubeEdgeLengths(original);
    const std::array<double, kCubeEdges.size()> after = cubeEdgeLengths(transformed);
    double error = 0.0;
    for (std::size_t index = 0; index < before.size(); ++index) {
        error = std::max(error, std::abs(before[index] - after[index]));
    }
    return error;
}

inline double cubeRotationRoundTripError(
    const CubeVertices& vertices,
    EulerAngles angles,
    RotationOrder order
) {
    double error = 0.0;
    for (const Vec3 vertex : vertices) {
        const Vec3 rotated = rotateEuler(vertex, angles, order);
        const Vec3 restored = inverseRotateEuler(rotated, angles, order);
        error = std::max(error, magnitude(subtract(restored, vertex)));
    }
    return error;
}

inline EulerAngles applyMouseDrag(
    EulerAngles angles,
    double deltaX,
    double deltaY,
    double sensitivity
) {
    constexpr double pitchLimit = 89.0 * kPi / 180.0;
    angles.yaw += deltaX * sensitivity;
    angles.pitch -= deltaY * sensitivity;
    angles.pitch = std::clamp(angles.pitch, -pitchLimit, pitchLimit);
    return angles;
}

inline EulerAngles advanceEulerAngles(
    EulerAngles angles,
    EulerAngles angularVelocity,
    double deltaTime
) {
    const double safeDeltaTime = std::clamp(deltaTime, 0.0, 0.1);
    angles.pitch += angularVelocity.pitch * safeDeltaTime;
    angles.yaw += angularVelocity.yaw * safeDeltaTime;
    angles.roll += angularVelocity.roll * safeDeltaTime;
    return angles;
}
#endif
} // namespace lab
