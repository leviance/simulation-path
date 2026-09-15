#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#if LAB_CHECKPOINT >= 5
#include <algorithm>
#endif
#if LAB_CHECKPOINT >= 1
#include <cmath>
#endif
namespace lab {
#if LAB_CHECKPOINT >= 1
struct Vec2 {
    double x{};
    double y{};
    friend bool operator==(Vec2, Vec2) = default;
};
#endif
#if LAB_CHECKPOINT >= 5
inline Vec2 operator+(Vec2 left, Vec2 right) {
    return {left.x + right.x, left.y + right.y};
}
#endif
#if LAB_CHECKPOINT >= 2
inline Vec2 operator-(Vec2 left, Vec2 right) {
    return {left.x - right.x, left.y - right.y};
}
#endif
#if LAB_CHECKPOINT >= 6
inline double distance(Vec2 start, Vec2 end) {
    return std::hypot(end.x - start.x, end.y - start.y);
}
#endif
#if LAB_CHECKPOINT >= 1

// Camera2D là nơi duy nhất biết quan hệ giữa world space và screen space.
struct Camera2D {
    Vec2 centerWorld{};
    double pixelsPerUnit{55.0};
    Vec2 viewportPixels{960.0, 540.0};

    [[nodiscard]] double scale() const {
        if (!std::isfinite(pixelsPerUnit) || pixelsPerUnit <= 0.0) {
            return 20.0;
        }
        return pixelsPerUnit;
    }
#if LAB_CHECKPOINT >= 2

    // Forward transform: world -> screen.
    [[nodiscard]] Vec2 worldToScreen(Vec2 world) const {
        const Vec2 relative = world - centerWorld;
        const double pixelsPerWorldUnit = scale();
        return {
            viewportPixels.x * 0.5 + relative.x * pixelsPerWorldUnit,
            viewportPixels.y * 0.5 - relative.y * pixelsPerWorldUnit,
        };
    }
#endif
#if LAB_CHECKPOINT >= 3

    // Inverse transform: screen -> world.
    [[nodiscard]] Vec2 screenToWorld(Vec2 screen) const {
        const double pixelsPerWorldUnit = scale();
        return {
            centerWorld.x + (screen.x - viewportPixels.x * 0.5) / pixelsPerWorldUnit,
            centerWorld.y - (screen.y - viewportPixels.y * 0.5) / pixelsPerWorldUnit,
        };
    }
#endif
#if LAB_CHECKPOINT >= 4
    void pan(Vec2 deltaPixels) {
        const double pixelsPerWorldUnit = scale();
        centerWorld.x -= deltaPixels.x / pixelsPerWorldUnit;
        centerWorld.y += deltaPixels.y / pixelsPerWorldUnit;
    }
#endif
#if LAB_CHECKPOINT >= 5

    // Bù camera center để world point dưới cursor không trôi khi zoom.
    void zoomAt(Vec2 screen, double factor) {
        const Vec2 worldBeforeZoom = screenToWorld(screen);
        double safeFactor = 1.0;
        if (std::isfinite(factor) && factor > 0.0) {
            safeFactor = factor;
        }
        pixelsPerUnit = std::clamp(scale() * safeFactor, 20.0, 160.0);
        const Vec2 worldAfterZoom = screenToWorld(screen);
        centerWorld = centerWorld + (worldBeforeZoom - worldAfterZoom);
    }
#endif
};
#endif
} // namespace lab
