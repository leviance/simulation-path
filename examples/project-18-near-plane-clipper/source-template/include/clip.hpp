#pragma once
#include "types.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 2
// Half-space chính xác: epsilon chỉ nhận diện on-plane, không nới vùng inside.
inline double signedDistance(const ClipVertex& vertex, const Plane& plane) {
    if (!isFinite(vertex) || !std::isfinite(plane.normal.x) || !std::isfinite(plane.normal.y) || !std::isfinite(plane.normal.z) || !std::isfinite(plane.offset)) {
        return std::numeric_limits<double>::quiet_NaN();
    }
    return plane.normal.x * vertex.position.x + plane.normal.y * vertex.position.y + plane.normal.z * vertex.position.z + plane.offset;
}

inline double signedDistanceToNearPlane(const ClipVertex& vertex, double nearPlane) {
    return signedDistance(vertex, {{0.0, 0.0, 1.0}, -nearPlane});
}

inline bool isInsideNearPlane(const ClipVertex& vertex, double nearPlane) {
    const double d = signedDistanceToNearPlane(vertex, nearPlane);
    return std::isfinite(nearPlane) && nearPlane > 0.0 && std::isfinite(d) && d >= 0.0;
}

inline NearPlaneCounts classifyTriangle(const Triangle3& triangle, double nearPlane, double epsilon = 1e-9) {
    NearPlaneCounts counts{};
    if (!std::isfinite(nearPlane) || nearPlane <= 0.0 || !std::isfinite(epsilon) || epsilon < 0.0) {
        counts.valid = false;
        return counts;
    }
    for (int i = 0; i < 3; ++i) {
        const double d = signedDistanceToNearPlane(vertexAt(triangle, i), nearPlane);
        if (!std::isfinite(d)) {
            return {0, 0, 0, false};
        }
        if (std::abs(d) <= epsilon) {
            ++counts.onPlane;
        }
        if (d >= 0.0) {
            ++counts.inside;
        } else {
            ++counts.outside;
        }
    }
    return counts;
}
#endif

#if LAB_CHECKPOINT >= 3
inline double mix(double start, double end, double t) {
    return start + (end - start) * t;
}

inline ClipVertex interpolateVertex(const ClipVertex& start, const ClipVertex& end, double t) {
    return {{mix(start.position.x, end.position.x, t), mix(start.position.y, end.position.y, t), mix(start.position.z, end.position.z, t)}, {mix(start.color.red, end.color.red, t), mix(start.color.green, end.color.green, t), mix(start.color.blue, end.color.blue, t)}};
}

inline std::optional<ClipVertex> intersectNearPlane(const ClipVertex& start, const ClipVertex& end, double nearPlane) {
    if (!isFinite(start) || !isFinite(end) || !std::isfinite(nearPlane) || nearPlane <= 0.0) {
        return std::nullopt;
    }
    // Endpoint trên plane được trả nguyên vẹn để tránh sinh bản sao hơi lệch.
    if (start.position.z == nearPlane) {
        return start;
    }
    if (end.position.z == nearPlane) {
        return end;
    }
    const double change = end.position.z - start.position.z;
    if (!std::isfinite(change) || change == 0.0) {
        return std::nullopt;
    }
    const double t = (nearPlane - start.position.z) / change;
    if (!std::isfinite(t) || t < 0.0 || t > 1.0) {
        return std::nullopt;
    }
    ClipVertex result = interpolateVertex(start, end, t);
    if (!isFinite(result)) {
        return std::nullopt;
    }
    result.position.z = nearPlane;
    return result;
}
#endif

#if LAB_CHECKPOINT >= 4
inline bool samePosition(const ClipVertex& a, const ClipVertex& b) {
    return a.position.x == b.position.x && a.position.y == b.position.y && a.position.z == b.position.z;
}

inline bool appendVertex(ClippedPolygon& polygon, const ClipVertex& vertex) {
    if (!polygon.valid) {
        return false;
    }
    if (!isFinite(vertex) || polygon.count > polygon.vertices.size()) {
        polygon = {};
        polygon.valid = false;
        return false;
    }
    if (polygon.count > 0 && samePosition(polygon.vertices[polygon.count - 1], vertex)) {
        return true;
    }
    if (polygon.count >= polygon.vertices.size()) {
        polygon = {};
        polygon.valid = false;
        return false;
    }
    polygon.vertices[polygon.count++] = vertex;
    return true;
}

inline ClippedPolygon clipTriangleToNearPlane(const Triangle3& triangle, double nearPlane, double epsilon = 1e-9) {
    ClippedPolygon output{};
    if (!classifyTriangle(triangle, nearPlane, epsilon).valid) {
        output.valid = false;
        return output;
    }
    ClipVertex previous = triangle.c;
    bool previousInside = isInsideNearPlane(previous, nearPlane);
    for (int i = 0; i < 3; ++i) {
        const ClipVertex current = vertexAt(triangle, i);
        const bool currentInside = isInsideNearPlane(current, nearPlane);
        if (currentInside != previousInside) {
            const auto intersection = intersectNearPlane(previous, current, nearPlane);
            if (!intersection || !appendVertex(output, *intersection)) {
                output = {};
                output.valid = false;
                return output;
            }
        }
        if (currentInside && !appendVertex(output, current)) {
            return output;
        }
        previous = current;
        previousInside = currentInside;
    }
    if (output.count > 1 && samePosition(output.vertices[0], output.vertices[output.count - 1])) {
        --output.count;
    }
    return output;
}
#endif

#if LAB_CHECKPOINT >= 5
inline double triangleAreaSquared(const Triangle3& triangle) {
    const Vec3 a{triangle.b.position.x - triangle.a.position.x, triangle.b.position.y - triangle.a.position.y, triangle.b.position.z - triangle.a.position.z};
    const Vec3 b{triangle.c.position.x - triangle.a.position.x, triangle.c.position.y - triangle.a.position.y, triangle.c.position.z - triangle.a.position.z};
    const Vec3 n{a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
    return n.x * n.x + n.y * n.y + n.z * n.z;
}

inline TriangleBatch triangulateFan(const ClippedPolygon& polygon) {
    TriangleBatch batch{};
    if (!polygon.valid || polygon.count > 4) {
        batch.valid = false;
        return batch;
    }
    for (std::size_t i = 1; i + 1 < polygon.count; ++i) {
        const Triangle3 t{polygon.vertices[0], polygon.vertices[i], polygon.vertices[i + 1]};
        const double area = triangleAreaSquared(t);
        if (!isFinite(t.a) || !isFinite(t.b) || !isFinite(t.c) || !std::isfinite(area)) {
            return {{}, 0, false};
        }
        if (area > 0.0) {
            batch.triangles[batch.count++] = t;
        }
    }
    return batch;
}
#endif

#if LAB_CHECKPOINT >= 6
inline ClipResult clipForRender(const Triangle3& triangle, double nearPlane) {
    ClipResult result{};
    result.inputCounts = classifyTriangle(triangle, nearPlane);
    result.polygon = clipTriangleToNearPlane(triangle, nearPlane);
    result.batch = triangulateFan(result.polygon);
    return result;
}
#endif

#if LAB_CHECKPOINT >= 7
inline double maximumNearPlaneViolation(const ClippedPolygon& polygon, double nearPlane) {
    if (!polygon.valid || polygon.count > 4 || !std::isfinite(nearPlane)) {
        return std::numeric_limits<double>::infinity();
    }
    double maximum = 0.0;
    for (std::size_t i = 0; i < polygon.count; ++i) {
        if (!isFinite(polygon.vertices[i])) {
            return std::numeric_limits<double>::infinity();
        }
        maximum = std::max(maximum, nearPlane - polygon.vertices[i].position.z);
    }
    return maximum;
}
#endif
} // namespace lab
