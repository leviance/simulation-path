#pragma once

#include "geometry_math.hpp"

#include <algorithm>
#include <array>

namespace geometry {

using Mat4 = std::array<float, 16>;

inline Mat4 multiply(const Mat4& a, const Mat4& b) {
    Mat4 result{};
    for (int column = 0; column < 4; ++column) {
        for (int row = 0; row < 4; ++row) {
            for (int inner = 0; inner < 4; ++inner) {
                result[column * 4 + row] += a[inner * 4 + row] * b[column * 4 + inner];
            }
        }
    }
    return result;
}

struct OrbitCamera {
    Vec3 target{0.0, 0.28, 0.0};
    double yaw{-0.78};
    double pitch{0.44};
    double distance{6.7};

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
        yaw = std::remainder(yaw - dx * 0.007, fullTurn);
        pitch = std::clamp(pitch + dy * 0.007, -1.47, 1.47);
    }

    void pan(double dx, double dy) {
        const Vec3 cameraRight = right();
        const Vec3 cameraUp = cross(cameraRight, forward());
        const double scale = distance * 0.0014;
        target = target + cameraRight * (-dx * scale) + cameraUp * (dy * scale);
    }

    void zoom(double wheel) {
        distance = std::clamp(distance * std::exp(-wheel * 0.14), 1.1, 40.0);
    }

    Mat4 viewProjection(double aspect) const {
        const Vec3 f = forward();
        const Vec3 r = right();
        const Vec3 u = cross(r, f);
        const Vec3 position = eye();

        // OpenGL consumes column-major matrices. The last column translates the eye to the origin.
        const Mat4 view = {
            static_cast<float>(r.x),
            static_cast<float>(u.x),
            static_cast<float>(-f.x),
            0.0F,
            static_cast<float>(r.y),
            static_cast<float>(u.y),
            static_cast<float>(-f.y),
            0.0F,
            static_cast<float>(r.z),
            static_cast<float>(u.z),
            static_cast<float>(-f.z),
            0.0F,
            static_cast<float>(-dot(r, position)),
            static_cast<float>(-dot(u, position)),
            static_cast<float>(dot(f, position)),
            1.0F,
        };
        constexpr float nearPlane = 0.04F;
        constexpr float farPlane = 100.0F;
        const float focal = 1.0F / std::tan(0.42F);
        Mat4 projection{};
        projection[0] = focal / static_cast<float>(std::max(0.01, aspect));
        projection[5] = focal;
        projection[10] = -(farPlane + nearPlane) / (farPlane - nearPlane);
        projection[11] = -1.0F;
        projection[14] = -2.0F * farPlane * nearPlane / (farPlane - nearPlane);
        return multiply(projection, view);
    }
};

} // namespace geometry
