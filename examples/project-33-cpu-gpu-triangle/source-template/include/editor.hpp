#pragma once
#include "pipeline.hpp"

#if LAB_CHECKPOINT >= 9
namespace lab {
struct PanelPoint {
    bool valid{};
    int panel{};
    Vec2 ndc{};
};

// SDL mouse coordinates are logical; split viewports use drawable pixels.
inline PanelPoint pointerToPanel(Vec2 point, int windowWidth, int windowHeight, int pixelWidth, int pixelHeight) {
    if (windowWidth <= 0 || windowHeight <= 0 || pixelWidth < 2 || pixelHeight <= 0 ||
        !std::isfinite(point.x) || !std::isfinite(point.y) ||
        point.x < 0 || point.y < 0 || point.x >= windowWidth || point.y >= windowHeight) {
        return {};
    }
    const float x = point.x * float(pixelWidth) / float(windowWidth);
    const float y = point.y * float(pixelHeight) / float(windowHeight);
    const int leftWidth = pixelWidth / 2;
    int panel = 1;
    int width = pixelWidth - leftWidth;
    int origin = leftWidth;
    if (x < float(leftWidth)) {
        panel = 0;
        width = leftWidth;
        origin = 0;
    }
    return {true, panel, {(x - float(origin)) / float(width) * 2 - 1, 1 - y / float(pixelHeight) * 2}};
}

inline Vec2 inverseTransformPosition(Vec2 ndc, const Transform2D& transform) {
    const float x = (ndc.x - transform.translation.x) / transform.scale;
    const float y = (ndc.y - transform.translation.y) / transform.scale;
    const float cosine = std::cos(transform.angleRadians);
    const float sine = std::sin(transform.angleRadians);
    return {x * cosine + y * sine, -x * sine + y * cosine};
}

inline int pickVertex(const std::array<GpuVertex, 3>& triangle, const Transform2D& transform, Vec2 point, int width, int height) {
    int selected = -1;
    float bestDistanceSquared = 20 * 20;
    for (int index = 0; index < 3; ++index) {
        const Vec2 ndc = transformPosition({triangle[index].positionX, triangle[index].positionY}, transform);
        const float dx = (ndc.x - point.x) * float(width) * 0.5F;
        const float dy = (ndc.y - point.y) * float(height) * 0.5F;
        const float distanceSquared = dx * dx + dy * dy;
        if (distanceSquared <= bestDistanceSquared) {
            selected = index;
            bestDistanceSquared = distanceSquared;
        }
    }
    return selected;
}
} // namespace lab
#endif
