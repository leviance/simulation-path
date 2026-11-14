#pragma once

#include "atom_camera.hpp"
#include "atom_overlay.hpp"
#include <optional>

namespace atom {

struct ScreenPoint {
    float x, y;
};

inline std::optional<ScreenPoint> projectGuide(Vec3 point, const Camera& camera, float left, float width, float height) {
    const Vec3 relative = point - camera.eye();
    const float depth = dot(relative, camera.forward());
    if (depth <= 0.02F)
        return {};
    const float x = dot(relative, camera.right()) / (depth * camera.tanHalfFov * width / height);
    const float y = dot(relative, camera.up()) / (depth * camera.tanHalfFov);
    if (std::abs(x) > 1 || std::abs(y) > 1)
        return {};
    return ScreenPoint{left + (x + 1) * width / 2, (1 - y) * height / 2};
}

// Wire guides describe a measurement volume. They are not electron paths.
inline void sphereGuide(Overlay& overlay, Vec3 center, float radius, const Camera& camera, float left, float width, float height) {
    for (int plane = 0; plane < 3; ++plane) {
        std::optional<ScreenPoint> previous;
        for (int step = 0; step <= 96; ++step) {
            const float angle = static_cast<float>(2 * pi * step / 96);
            Vec3 local{radius * std::cos(angle), radius * std::sin(angle), 0};
            if (plane == 1)
                local = {local.x, 0, local.y};
            if (plane == 2)
                local = {0, local.x, local.y};
            const auto point = projectGuide(center + local, camera, left, width, height);
            if (point && previous)
                overlay.line(previous->x, previous->y, point->x, point->y, {0.12F, 0.45F, 0.35F});
            previous = point;
        }
    }
}

} // namespace atom
