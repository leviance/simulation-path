#pragma once

#include "morph_math.hpp"

namespace morph {

using Mat4 = std::array<float, 16>;

inline Mat4 multiply(const Mat4 &a, const Mat4 &b) {
    Mat4 result{};
    for (int column = 0; column < 4; ++column) {
        for (int row = 0; row < 4; ++row) {
            for (int inner = 0; inner < 4; ++inner)
                result[column * 4 + row] += a[inner * 4 + row] * b[column * 4 + inner];
        }
    }
    return result;
}

// Supplied orbit/pan/perspective scaffold, shared in spirit with the mesh workshop.
struct OrbitCamera {
    Vec3 target{0.0, 0.2, 0.0};
    double yaw{-0.78};
    double pitch{0.44};
    double distance{7.4};

    Vec3 eye() const {
        const double horizontal = distance * std::cos(pitch);
        return target + Vec3{horizontal * std::cos(yaw), distance * std::sin(pitch), horizontal * std::sin(yaw)};
    }
    Vec3 forward() const {
        return unit(target - eye());
    }
    Vec3 right() const {
        return unit(cross(forward(), {0.0, 1.0, 0.0}));
    }
    void orbit(double dx, double dy) {
        yaw = std::remainder(yaw - dx * 0.007, tau);
        pitch = std::clamp(pitch + dy * 0.007, -1.47, 1.47);
    }
    void pan(double dx, double dy) {
        const Vec3 r = right();
        const Vec3 up = cross(r, forward());
        target = target + r * (-dx * distance * 0.0014) + up * (dy * distance * 0.0014);
    }
    void zoom(double wheel) {
        distance = std::clamp(distance * std::exp(-wheel * 0.14), 0.3, 40.0);
    }
    Mat4 viewProjection(double aspect) const {
        const Vec3 f = forward();
        const Vec3 r = right();
        const Vec3 u = cross(r, f);
        const Vec3 p = eye();
        // Column-major view matrix: translate the eye to the origin before projection.
        const Mat4 view{
            static_cast<float>(r.x),
            static_cast<float>(u.x),
            static_cast<float>(-f.x),
            0,
            static_cast<float>(r.y),
            static_cast<float>(u.y),
            static_cast<float>(-f.y),
            0,
            static_cast<float>(r.z),
            static_cast<float>(u.z),
            static_cast<float>(-f.z),
            0,
            static_cast<float>(-dot(r, p)),
            static_cast<float>(-dot(u, p)),
            static_cast<float>(dot(f, p)),
            1,
        };
        constexpr float nearPlane = 0.025F;
        constexpr float farPlane = 100.0F;
        const float focal = 1.0F / std::tan(0.42F);
        Mat4 projection{};
        projection[0] = focal / static_cast<float>(std::max(0.01, aspect));
        projection[5] = focal;
        projection[10] = -(farPlane + nearPlane) / (farPlane - nearPlane);
        projection[11] = -1;
        projection[14] = -2 * farPlane * nearPlane / (farPlane - nearPlane);
        return multiply(projection, view);
    }
};

} // namespace morph
