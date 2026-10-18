#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include <algorithm>
#include <cmath>
#include <initializer_list>

namespace lab {
// World dùng Y hướng lên; screen dùng Y hướng xuống.
struct Vec2 {
    double x{};
    double y{};
    friend bool operator==(Vec2, Vec2) = default;
};

inline double distance(Vec2 a, Vec2 b) {
    return std::hypot(a.x - b.x, a.y - b.y);
}

inline bool finite(Vec2 point) {
    return std::isfinite(point.x) && std::isfinite(point.y);
}

#if LAB_CHECKPOINT >= 1
struct Camera2D {
    Vec2 centerWorld{};
    double pixelsPerUnit{55.0};
    Vec2 viewportPixels{960.0, 540.0};

    [[nodiscard]] double scale() const {
        if (!std::isfinite(pixelsPerUnit) || pixelsPerUnit <= 0.0) {
            return 55.0;
        }
        return std::clamp(pixelsPerUnit, 5.0, 800.0);
    }

#if LAB_CHECKPOINT >= 2
    // Chỉ đổi hệ ở đây, không đảo Y lần nữa trong hàm vẽ.
    [[nodiscard]] Vec2 worldToScreen(Vec2 world) const {
        const double relativeX = world.x - centerWorld.x;
        const double relativeY = world.y - centerWorld.y;
        return {
            viewportPixels.x * 0.5 + relativeX * scale(),
            viewportPixels.y * 0.5 - relativeY * scale(),
        };
    }

#endif
#if LAB_CHECKPOINT >= 3
    [[nodiscard]] Vec2 screenToWorld(Vec2 screen) const {
        return {
            centerWorld.x + (screen.x - viewportPixels.x * 0.5) / scale(),
            centerWorld.y - (screen.y - viewportPixels.y * 0.5) / scale(),
        };
    }

#endif
#if LAB_CHECKPOINT >= 4
    void pan(Vec2 deltaPixels) {
        if (!finite(deltaPixels)) {
            return;
        }
        centerWorld.x -= deltaPixels.x / scale();
        centerWorld.y += deltaPixels.y / scale();
    }

#endif
#if LAB_CHECKPOINT >= 5
    // Đo hai lần để tìm đúng lượng bù cho tâm camera.
    void zoomAt(Vec2 screen, double factor) {
        if (!finite(screen) || !std::isfinite(factor) || factor <= 0.0) {
            return;
        }
        const Vec2 worldBeforeZoom = screenToWorld(screen);
        pixelsPerUnit = std::clamp(scale() * factor, 5.0, 800.0);
        const Vec2 worldAfterZoom = screenToWorld(screen);
        centerWorld.x += worldBeforeZoom.x - worldAfterZoom.x;
        centerWorld.y += worldBeforeZoom.y - worldAfterZoom.y;
    }

#endif
};
#endif

#if LAB_CHECKPOINT >= 4
// Chọn bước 1, 2 hoặc 5 nhân lũy thừa của 10, cách nhau ít nhất 40 px.
inline double gridSpacing(double pixelsPerUnit) {
    if (!std::isfinite(pixelsPerUnit) || pixelsPerUnit <= 0.0) {
        return 1.0;
    }
    const double target = 40.0 / pixelsPerUnit;
    const double power = std::pow(10.0, std::floor(std::log10(target)));
    for (double multiplier : {1.0, 2.0, 5.0, 10.0}) {
        const double step = multiplier * power;
        if (step >= target) {
            return step;
        }
    }
    return power * 10.0;
}
#endif
} // namespace lab
