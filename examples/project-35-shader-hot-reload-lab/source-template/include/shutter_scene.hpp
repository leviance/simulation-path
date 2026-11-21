#pragma once

#include <algorithm>
#include <array>
#include <cmath>
#include <numbers>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

namespace lab {

// Không giữ VAO/texture ở đây: hai lượt vẽ phải dùng đúng cùng một cảnh.
struct Vec3 {
    float x{}, y{}, z{};
};

inline Vec3 add(Vec3 a, Vec3 b) { return {a.x + b.x, a.y + b.y, a.z + b.z}; }
inline Vec3 sub(Vec3 a, Vec3 b) { return {a.x - b.x, a.y - b.y, a.z - b.z}; }
inline Vec3 scale(Vec3 v, float k) { return {v.x * k, v.y * k, v.z * k}; }
inline float dot(Vec3 a, Vec3 b) { return a.x * b.x + a.y * b.y + a.z * b.z; }
inline Vec3 cross(Vec3 a, Vec3 b) {
    return {a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x};
}
inline Vec3 unit(Vec3 v) {
    const float lengthSquared = dot(v, v);
    if (lengthSquared < 1.0e-12F) return {};
    return scale(v, 1.0F / std::sqrt(lengthSquared));
}
inline float shutterRadians(float degrees) {
    return degrees * std::numbers::pi_v<float> / 180.0F;
}

// Column-major như GLSL: một điểm đi qua model, view, projection theo thứ tự đó.
// Cột thứ tư lưu phép tịnh tiến; glUniformMatrix4fv dùng transpose = GL_FALSE.
struct Mat4 {
    std::array<float, 16> m{};
};

inline Mat4 mul(const Mat4& a, const Mat4& b) {
    Mat4 out{};
    for (int column = 0; column < 4; ++column) {
        for (int row = 0; row < 4; ++row) {
            for (int k = 0; k < 4; ++k) {
                out.m[column * 4 + row] += a.m[k * 4 + row] * b.m[column * 4 + k];
            }
        }
    }
    return out;
}

inline std::array<float, 4> transformHomogeneous(const Mat4& a, Vec3 p) {
    std::array<float, 4> result{};
    for (int row = 0; row < 4; ++row) {
        result[row] = a.m[row] * p.x + a.m[4 + row] * p.y + a.m[8 + row] * p.z + a.m[12 + row];
    }
    return result;
}

inline Vec3 transformPoint(const Mat4& a, Vec3 p) {
    const auto clip = transformHomogeneous(a, p);
    if (std::abs(clip[3]) < 1.0e-7F) return {};
    return {clip[0] / clip[3], clip[1] / clip[3], clip[2] / clip[3]};
}

inline Mat4 lookAt(Vec3 eye, Vec3 target, Vec3 up = {0, 1, 0}) {
    const Vec3 forward = unit(sub(target, eye));
    const Vec3 right = unit(cross(forward, up));
    const Vec3 top = cross(right, forward);
    return {{right.x, top.x, -forward.x, 0,
             right.y, top.y, -forward.y, 0,
             right.z, top.z, -forward.z, 0,
             -dot(right, eye), -dot(top, eye), dot(forward, eye), 1}};
}

inline Mat4 perspective(float verticalFovDegrees, float aspect, float nearPlane, float farPlane) {
    const float focal = 1.0F / std::tan(shutterRadians(verticalFovDegrees) * 0.5F);
    Mat4 projection{};
    projection.m[0] = focal / std::max(aspect, 0.01F);
    projection.m[5] = focal;
    projection.m[10] = -(farPlane + nearPlane) / (farPlane - nearPlane);
    projection.m[11] = -1;
    projection.m[14] = -2.0F * nearPlane * farPlane / (farPlane - nearPlane);
    return projection;
}

inline Mat4 ortho(float left, float right, float bottom, float top, float nearPlane, float farPlane) {
    Mat4 projection{};
    projection.m[0] = 2.0F / (right - left);
    projection.m[5] = 2.0F / (top - bottom);
    projection.m[10] = -2.0F / (farPlane - nearPlane);
    projection.m[12] = -(right + left) / (right - left);
    projection.m[13] = -(top + bottom) / (top - bottom);
    projection.m[14] = -(farPlane + nearPlane) / (farPlane - nearPlane);
    projection.m[15] = 1;
    return projection;
}

struct ShutterState {
    float angle{23.0F}, boxX{0.35F};
    float yaw{-33.0F}, pitch{20.0F}, zoom{1.0F};
    float sun{0.0F}, bias{0.0015F};
    bool shadows{true}, filtering{true}, paused{true}, inspect{false};
    int mode{0};
};

inline Mat4 cameraVP(const ShutterState& state, float aspect) {
    const Vec3 target{0.0F, 1.05F, 1.65F};
    const float yaw = shutterRadians(std::clamp(state.yaw, -55.0F, 65.0F));
    const float pitch = shutterRadians(std::clamp(state.pitch, 8.0F, 50.0F));
    const float distance = 8.7F / std::clamp(state.zoom, 0.65F, 2.4F);
    const float ring = std::cos(pitch);
    const Vec3 orbit{ring * std::sin(yaw), std::sin(pitch), ring * std::cos(yaw)};
    const Vec3 eye = add(target, scale(orbit, distance));
    return mul(perspective(44.0F, aspect, 0.10F, 55.0F), lookAt(eye, target));
}

// [snippet sun-direction]
inline Vec3 sunDirection(const ShutterState& state) {
    // Vector từ điểm trên sàn về phía Mặt Trời, ngược hướng tia sáng truyền.
    const float azimuth = shutterRadians(std::clamp(state.sun, -30.0F, 30.0F));
    const float c = std::cos(azimuth);
    const float s = std::sin(azimuth);
    return unit({-0.32F * c - 0.86F * s, 0.78F, 0.32F * s - 0.86F * c});
}

// [/snippet sun-direction]

#if LAB_CHECKPOINT >= 3
// [snippet sun-view]
inline Mat4 lightVP(const ShutterState& state) {
    const Vec3 focus{0.0F, 1.65F, 2.5F};
    const Vec3 eye = add(focus, scale(sunDirection(state), 15.0F));
    // Nắng chiếu song song nên dùng phép chiếu trực giao, không dùng camera của người xem.
    return mul(ortho(-7.6F, 7.6F, -7.2F, 7.2F, 1.0F, 32.0F), lookAt(eye, focus));
}
// [/snippet sun-view]
#endif

// Mesh chung có tâm tại gốc và mỗi cạnh dài một đơn vị (từ -0.5 đến +0.5).
// Đây là T * Rx * S; xoay quanh tâm khối, không xoay quanh gốc của cả căn phòng.
inline Mat4 unitCubeModel(Vec3 center, Vec3 size, float angleDegrees = 0.0F) {
    const float angle = shutterRadians(angleDegrees);
    const float c = std::cos(angle);
    const float s = std::sin(angle);
    return {{size.x, 0, 0, 0,
             0, c * size.y, s * size.y, 0,
             0, -s * size.z, c * size.z, 0,
             center.x, center.y, center.z, 1}};
}

struct Piece {
    Mat4 model;
    Vec3 color;
    int material;
};

inline constexpr int kSlatCount = 8;
inline constexpr float kFirstSlatY = 1.27F;
inline constexpr float kSlatPitch = 0.345F;
inline constexpr Vec3 kSlatSize{4.70F, 0.042F, 0.310F};

inline std::vector<Piece> makeRoom([[maybe_unused]] const ShutterState& state) {
    std::vector<Piece> room;
    room.reserve(32);
    auto block = [&](Vec3 center, Vec3 size, Vec3 color, int material, float angle = 0.0F) {
        room.push_back({unitCubeModel(center, size, angle), color, material});
    };
    // Sàn có mặt trên đúng y = 0. Starter chỉ vẽ tấm sàn này.
    block({0, -0.08F, 4}, {16.0F, 0.16F, 8.0F}, {0.57F, 0.43F, 0.31F}, 1);
#if LAB_CHECKPOINT >= 1
    const Vec3 plaster{0.90F, 0.85F, 0.74F};
    const Vec3 timber{0.42F, 0.27F, 0.16F};
    const Vec3 edgeWood{0.51F, 0.345F, 0.21F};

    // [snippet room-frame]
    // Bốn mảng tường để trống x = [-2.45, 2.45], y = [1.10, 3.85].
    // Chúng dày 0.18: ô cửa là khoảng trống xuyên qua tường, không phải màu sơn.
    block({-5.225F, 5.0F, 0}, {5.55F, 10.0F, 0.18F}, plaster, 0);
    block({ 5.225F, 5.0F, 0}, {5.55F, 10.0F, 0.18F}, plaster, 0);
    block({0, 0.55F, 0}, {4.90F, 1.10F, 0.18F}, plaster, 0);
    block({0, 6.925F, 0}, {4.90F, 6.15F, 0.18F}, plaster, 0);
    // [/snippet room-frame]
    block({-6.88F, 5.0F, 4}, {0.18F, 10.0F, 8.0F}, {0.78F, 0.77F, 0.71F}, 0);

    block({6.88F, 5.0F, 4}, {0.18F, 10.0F, 8.0F}, {0.82F, 0.80F, 0.73F}, 0);

    // Bệ cửa nhô về phía người xem; nẹp và gờ chân tường tạo các mép có chiều dày thật.
    block({0, 1.045F, 0.12F}, {5.28F, 0.11F, 0.48F}, edgeWood, 2);
    block({0, 0.952F, 0.12F}, {5.05F, 0.08F, 0.16F}, timber, 2);
    block({0, 3.927F, 0.11F}, {5.14F, 0.15F, 0.23F}, edgeWood, 2);
    for (float side : {-1.0F, 1.0F}) {
        block({side * 2.49F, 2.475F, 0.10F}, {0.145F, 2.75F, 0.24F}, edgeWood, 2);
        block({side * 2.375F, 2.475F, 0.01F}, {0.11F, 2.75F, 0.20F}, timber, 2);
    }
    block({0, 0.087F, 0.113F}, {16.0F, 0.174F, 0.07F}, {0.40F, 0.30F, 0.22F}, 2);
    block({-6.766F, 0.087F, 4}, {0.06F, 0.174F, 8}, {0.34F, 0.26F, 0.21F}, 2);

    block({6.766F, 0.087F, 4}, {0.06F, 0.174F, 8}, {0.36F, 0.29F, 0.23F}, 2);
    float boxX = 0.35F;
#if LAB_CHECKPOINT >= 2
    // [snippet slat-pivot]
    const float tilt = std::clamp(state.angle, -45.0F, 70.0F);
    for (int i = 0; i < kSlatCount; ++i) {
        const float y = kFirstSlatY + kSlatPitch * static_cast<float>(i);
        block({0, y, 0}, kSlatSize, timber, 2, tilt);
    }
    // [/snippet slat-pivot]
    boxX = std::clamp(state.boxX, -2.5F, 2.5F);
    // Một chi tiết đồng nhỏ ở tay nắm giúp nhận ra phía trong của cửa.
    const Vec3 brass{0.48F, 0.32F, 0.12F};
    block({2.45F, 1.86F, 0.242F}, {0.065F, 0.24F, 0.07F}, brass, 4);
#endif
    // Hộp cao 1 m, đặt sát sàn; dịch ngang chứ không xuyên qua cửa hay nâng khỏi đất.
    block({boxX, 0.50F, 2.20F}, {1, 1, 1}, {0.36F, 0.54F, 0.52F}, 3);
#endif
    return room;
}

} // namespace lab
