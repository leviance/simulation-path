#pragma once
#include "bulb_math.hpp"

namespace bulb {

struct Camera {
    Vec3 target{0.0, 0.0, 0.0};
    double yaw{0.85};
    double pitch{0.25};
    double distance{3.4};
    double tanHalfFov{std::tan(0.42)};

    Vec3 eye() const {
        const double horizontal = distance * std::cos(pitch);
        return target + Vec3{horizontal * std::cos(yaw), distance * std::sin(pitch), horizontal * std::sin(yaw)};
    }

    Vec3 forward() const {
        return unit(target - eye());
    }

    Vec3 right() const {
        return unit(cross(forward(), {0, 1, 0}));
    }

    Vec3 up() const {
        return cross(right(), forward());
    }

    void orbit(double dx, double dy) {
        yaw = std::remainder(yaw - dx * 0.006, 2 * pi);
        pitch = std::clamp(pitch + dy * 0.006, -1.48, 1.48);
    }

    void pan(double dx, double dy) {
        target = target + right() * (-dx * distance * 0.0012) + up() * (dy * distance * 0.0012);
        target.x = std::clamp(target.x, -2.5, 2.5);
        target.y = std::clamp(target.y, -2.5, 2.5);
        target.z = std::clamp(target.z, -2.5, 2.5);
    }

    void dolly(double wheel) {
        distance = std::clamp(distance * std::exp(-wheel * 0.12), 0.04, 18.0);
    }

    // snippet:bulb-camera-ray
    Vec3 ray(double x, double y, int width, int height) const {
        const double aspect = 960.0 / 540.0;
        const double u = (2 * x / width - 1) * aspect * tanHalfFov;
        const double v = (1 - 2 * y / height) * tanHalfFov;
        return unit(forward() + right() * u + up() * v);
    }

    // end-snippet:bulb-camera-ray
};

inline void validateCamera(const Camera& camera) {
    if (!finite(camera.target) || std::abs(camera.target.x) > 2.5 || std::abs(camera.target.y) > 2.5 || std::abs(camera.target.z) > 2.5 || !std::isfinite(camera.yaw) || !std::isfinite(camera.pitch) || std::abs(camera.pitch) > 1.48 || !std::isfinite(camera.distance) || camera.distance < 0.04 || camera.distance > 18.0 || !std::isfinite(camera.tanHalfFov) || camera.tanHalfFov < 0.2 || camera.tanHalfFov > 1.0)
        throw std::invalid_argument("Camera exceeds finite pan/pitch/dolly/field-of-view limits");
}

} // namespace bulb
