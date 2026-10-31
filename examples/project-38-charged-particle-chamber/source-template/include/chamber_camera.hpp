#pragma once
#include "chamber_math.hpp"

namespace chamber {

struct Mat4 {
    std::array<float, 16> values{};
};

inline Mat4 identityMatrix() {
    Mat4 result{};
    result.values[0] = result.values[5] = result.values[10] = result.values[15] = 1.0F;
    return result;
}

inline Mat4 multiply(Mat4 a, Mat4 b) {
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
    // Only the view/projection changes here. Particle positions remain in world space.
    Vec3 target{1.3F, 5.2F, 1.1F};
    float yaw{-0.85F};
    float pitch{0.25F};
    float distance{17.0F};

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
        yaw -= dx * 0.007F;
        pitch = std::clamp(pitch + dy * 0.007F, -1.45F, 1.45F);
    }

    void pan(float dx, float dy) {
        target = target + right() * (-dx * distance * 0.0014F) + up() * (dy * distance * 0.0014F);
    }

    void zoom(float wheel) {
        distance = std::clamp(distance * std::exp(-wheel * 0.14F), 0.35F, 400.0F);
    }

    void reset() {
        *this = {};
    }

    Mat4 viewProjection(float aspect) const {
        const Vec3 r = right();
        const Vec3 u = up();
        const Vec3 f = forward();
        const Vec3 e = eye();
        Mat4 view{};
        view.values = {r.x, u.x, -f.x, 0, r.y, u.y, -f.y, 0, r.z, u.z, -f.z, 0, -dot(r, e), -dot(u, e), dot(f, e), 1};
        const float cotangent = 1.0F / std::tan(0.48F);
        const float nearPlane = 0.05F;
        const float farPlane = 2000.0F;
        Mat4 projection{};
        projection.values[0] = cotangent / std::max(aspect, 0.01F);
        projection.values[5] = cotangent;
        projection.values[10] = -(farPlane + nearPlane) / (farPlane - nearPlane);
        projection.values[11] = -1.0F;
        projection.values[14] = -2.0F * farPlane * nearPlane / (farPlane - nearPlane);
        return multiply(projection, view);
    }
};

struct ScreenPoint {
    float x{}, y{};
    bool visible{};
};

inline ScreenPoint projectPoint(Vec3 point, const Mat4& matrix, int width, int height) {
    const auto& m = matrix.values;
    const float x = m[0] * point.x + m[4] * point.y + m[8] * point.z + m[12];
    const float y = m[1] * point.x + m[5] * point.y + m[9] * point.z + m[13];
    const float z = m[2] * point.x + m[6] * point.y + m[10] * point.z + m[14];
    const float w = m[3] * point.x + m[7] * point.y + m[11] * point.z + m[15];
    if (w <= 0.0F || std::abs(x) > w || std::abs(y) > w || std::abs(z) > w)
        return {};
    return {(x / w * 0.5F + 0.5F) * width, (0.5F - y / w * 0.5F) * height, true};
}

} // namespace chamber
