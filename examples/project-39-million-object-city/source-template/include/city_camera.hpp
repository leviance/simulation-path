#pragma once

#include "city_types.hpp"

#include <algorithm>
#include <array>
#include <cmath>

namespace city {

struct Mat4 {
    std::array<float, 16> values{};
};

inline Mat4 identityMatrix() {
    Mat4 result{};
    result.values[0] = result.values[5] = result.values[10] = result.values[15] = 1.0F;
    return result;
}

inline Mat4 multiply(const Mat4& a, const Mat4& b) {
    Mat4 result{};
    for (int column = 0; column < 4; ++column) {
        for (int row = 0; row < 4; ++row) {
            for (int inner = 0; inner < 4; ++inner) {
                result.values[column * 4 + row] += a.values[inner * 4 + row] * b.values[column * 4 + inner];
            }
        }
    }
    return result;
}

struct Camera {
    // Camera moves through world space; it is not an orbit around the city model.
    Vec3 position{0.0F, 95.0F, 180.0F};
    float yaw{-1.57F};
    float pitch{-0.27F};
    float fov{65.0F};
    float farPlane{1800.0F};

    Vec3 forward() const {
        return {std::cos(pitch) * std::cos(yaw), std::sin(pitch), std::cos(pitch) * std::sin(yaw)};
    }

    Vec3 right() const {
        return normalized(cross(forward(), {0.0F, 1.0F, 0.0F}));
    }

    Vec3 up() const {
        return cross(right(), forward());
    }

    void look(float dx, float dy) {
        yaw += dx * 0.004F;
        pitch = std::clamp(pitch - dy * 0.004F, -1.50F, 1.50F);
    }

    void move(float front, float side, float vertical, float dt, bool fast) {
        float speed = 70.0F;
        if (fast) {
            speed = 380.0F;
        }
        position = position + (forward() * front + right() * side + Vec3{0.0F, vertical, 0.0F}) * (speed * dt);
        position.y = std::clamp(position.y, 1.8F, 8000.0F);
    }

    Mat4 viewProjection(float aspect) const {
        const Vec3 f = forward();
        const Vec3 r = right();
        const Vec3 u = up();
        Mat4 view{};
        view.values = {r.x, u.x, -f.x, 0.0F, r.y, u.y, -f.y, 0.0F, r.z, u.z, -f.z, 0.0F, -dot(r, position), -dot(u, position), dot(f, position), 1.0F};
        const float cotangent = 1.0F / std::tan(fov * 3.14159265F / 360.0F);
        const float nearPlane = 0.5F;
        Mat4 projection{};
        projection.values[0] = cotangent / std::max(aspect, 0.01F);
        projection.values[5] = cotangent;
        projection.values[10] = -(farPlane + nearPlane) / (farPlane - nearPlane);
        projection.values[11] = -1.0F;
        projection.values[14] = -2.0F * farPlane * nearPlane / (farPlane - nearPlane);
        return multiply(projection, view);
    }

    Frustum frustum(float aspect) const {
        const auto m = viewProjection(aspect).values;
        Frustum result{};
        const std::array<int, 6> rows{0, 0, 1, 1, 2, 2};
        const std::array<float, 6> signs{1.0F, -1.0F, 1.0F, -1.0F, 1.0F, -1.0F};
        for (std::size_t i = 0; i < result.size(); ++i) {
            const int row = rows[i];
            const float sign = signs[i];
            Vec4 plane{m[3] + sign * m[row], m[7] + sign * m[4 + row], m[11] + sign * m[8 + row], m[15] + sign * m[12 + row]};
            const float magnitude = std::sqrt(plane.x * plane.x + plane.y * plane.y + plane.z * plane.z);
            plane.x /= magnitude;
            plane.y /= magnitude;
            plane.z /= magnitude;
            plane.w /= magnitude;
            result[i] = plane;
        }
        return result;
    }

    Vec3 ray(float x, float y, float aspect) const {
        const float tangent = std::tan(fov * 3.14159265F / 360.0F);
        return normalized(forward() + right() * (x * aspect * tangent) + up() * (y * tangent));
    }
};

// The benchmark always visits the same six camera snapshots, independent of frame rate.
inline Camera cameraSnapshot(unsigned index) {
    Camera camera{};
    const float angle = static_cast<float>(index % 6U) * 1.04719755F;
    camera.position = {std::cos(angle) * 350.0F, 180.0F, std::sin(angle) * 350.0F};
    camera.yaw = angle + 3.14159265F;
    camera.pitch = -0.38F;
    return camera;
}

} // namespace city
