#pragma once
#include "geometry.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 7
inline TexturedVertex intersectNearPlane(TexturedVertex start, TexturedVertex end, double nearPlane) {
    // Hai face dùng cạnh chung phải tính cùng giao điểm, dù duyệt cạnh ngược chiều.
    if (start.position.z > end.position.z) {
        std::swap(start, end);
    }
    const double t = (nearPlane - start.position.z) / (end.position.z - start.position.z);
    TexturedVertex output;
    output.position = {start.position.x + (end.position.x - start.position.x) * t, start.position.y + (end.position.y - start.position.y) * t, nearPlane};
    output.uv = {start.uv.x + (end.uv.x - start.uv.x) * t, start.uv.y + (end.uv.y - start.uv.y) * t};
    return output;
}

inline std::vector<TexturedVertex> clipTriangleToNearPlane(const TexturedTriangle& triangle, double nearPlane) {
    std::vector<TexturedVertex> output;
    if (!std::isfinite(nearPlane) || nearPlane <= 0) {
        return output;
    }
    for (const auto& vertex : triangle) {
        if (!isFinite(vertex.position) || !isFinite(vertex.uv)) {
            return {};
        }
    }
    TexturedVertex previous = triangle.back();
    bool previousInside = previous.position.z >= nearPlane;
    for (const TexturedVertex& current : triangle) {
        const bool inside = current.position.z >= nearPlane;
        if (inside != previousInside) {
            output.push_back(intersectNearPlane(previous, current, nearPlane));
        }
        if (inside) {
            output.push_back(current);
        }
        previous = current;
        previousInside = inside;
    }
    return output;
}
#endif
} // namespace lab
