#pragma once

#include "sculpt_math.hpp"

namespace sculpt {

// Supplied camera scaffold; it changes the view, never the scalar field or mesh job.
struct Camera {
    Vec3 target;
    float yaw{0.85F}, pitch{0.32F}, distance{4.3F};
    float tanHalfFov{std::tan(0.42F)};

    Vec3 eye() const {
        const float horizontal = distance * std::cos(pitch);
        return target + Vec3{horizontal * std::cos(yaw), distance * std::sin(pitch), horizontal * std::sin(yaw)};
    }

    Vec3 forward() const {
        return normalized(target - eye());
    }

    Vec3 right() const {
        return normalized(cross(forward(), {0, 1, 0}));
    }

    Vec3 up() const {
        return cross(right(), forward());
    }

    void orbit(float dx, float dy) {
        yaw = std::remainder(yaw - dx * 0.006F, 6.28318530718F);
        pitch = std::clamp(pitch + dy * 0.006F, -1.48F, 1.48F);
    }

    void pan(float dx, float dy) {
        target = target + right() * (-dx * distance * 0.0012F) + up() * (dy * distance * 0.0012F);
        target.x = std::clamp(target.x, -2.5F, 2.5F);
        target.y = std::clamp(target.y, -2.5F, 2.5F);
        target.z = std::clamp(target.z, -2.5F, 2.5F);
    }

    void zoom(float wheel) {
        distance = std::clamp(distance * std::exp(-wheel * 0.12F), 0.3F, 12.0F);
    }

    Vec3 ray(float x, float y, float width, float height) const {
        const float u = (2 * x / width - 1) * (width / height) * tanHalfFov;
        const float v = (1 - 2 * y / height) * tanHalfFov;
        return normalized(forward() + right() * u + up() * v);
    }
};

} // namespace sculpt
