#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 9
#endif

#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <limits>
#include <numbers>
#include <vector>

namespace lab {

#if LAB_CHECKPOINT >= 1
enum class RendererKind {
    cpu,
    gpu,
};

struct Vec3 {
    float x{};
    float y{};
    float z{};
};

struct Vec4 {
    float x{};
    float y{};
    float z{};
    float w{};
};

struct Rgb {
    std::uint8_t red{};
    std::uint8_t green{};
    std::uint8_t blue{};
};

inline const char* rendererLabel(RendererKind renderer) {
    if (renderer == RendererKind::cpu) {
        return "F1 CPU rasterizer";
    }
    return "F2 OpenGL GPU";
}
#endif

#if LAB_CHECKPOINT >= 3
// Mat4 giữ column-major storage để cùng 16 floats có thể truyền thẳng cho GLSL với transpose = GL_FALSE.
struct Mat4 {
    std::array<float, 16> values{};
};

inline Mat4 identityMatrix() {
    Mat4 result{};
    result.values = {1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1};
    return result;
}

inline Mat4 multiply(const Mat4& left, const Mat4& right) {
    Mat4 result{};
    for (int column = 0; column < 4; ++column) {
        for (int row = 0; row < 4; ++row) {
            float value = 0.0F;
            for (int inner = 0; inner < 4; ++inner) {
                value += left.values[std::size_t(inner * 4 + row)] * right.values[std::size_t(column * 4 + inner)];
            }
            result.values[std::size_t(column * 4 + row)] = value;
        }
    }
    return result;
}

inline Vec4 transform(const Mat4& matrix, Vec4 vector) {
    return {
        matrix.values[0] * vector.x + matrix.values[4] * vector.y + matrix.values[8] * vector.z + matrix.values[12] * vector.w,
        matrix.values[1] * vector.x + matrix.values[5] * vector.y + matrix.values[9] * vector.z + matrix.values[13] * vector.w,
        matrix.values[2] * vector.x + matrix.values[6] * vector.y + matrix.values[10] * vector.z + matrix.values[14] * vector.w,
        matrix.values[3] * vector.x + matrix.values[7] * vector.y + matrix.values[11] * vector.z + matrix.values[15] * vector.w,
    };
}

inline Mat4 rotationXMatrix(float angle) {
    const float cosine = std::cos(angle);
    const float sine = std::sin(angle);
    Mat4 result = identityMatrix();
    result.values[5] = cosine;
    result.values[6] = sine;
    result.values[9] = -sine;
    result.values[10] = cosine;
    return result;
}

inline Mat4 rotationYMatrix(float angle) {
    const float cosine = std::cos(angle);
    const float sine = std::sin(angle);
    Mat4 result = identityMatrix();
    result.values[0] = cosine;
    result.values[2] = -sine;
    result.values[8] = sine;
    result.values[10] = cosine;
    return result;
}

inline Mat4 translationMatrix(float x, float y, float z) {
    Mat4 result = identityMatrix();
    result.values[12] = x;
    result.values[13] = y;
    result.values[14] = z;
    return result;
}

inline Mat4 perspectiveMatrix(float verticalFovRadians, float aspect, float nearPlane, float farPlane) {
    Mat4 result{};
    const float focalScale = 1.0F / std::tan(verticalFovRadians * 0.5F);
    result.values[0] = focalScale / aspect;
    result.values[5] = focalScale;
    result.values[10] = (farPlane + nearPlane) / (nearPlane - farPlane);
    result.values[11] = -1.0F;
    result.values[14] = (2.0F * farPlane * nearPlane) / (nearPlane - farPlane);
    return result;
}

struct ScreenVertex {
    float x{};
    float y{};
    float depth{};
    float clipW{};
};

struct Framebuffer {
    int width{1};
    int height{1};
    std::vector<std::uint8_t> rgba{0U, 0U, 0U, 0U};
    std::vector<float> depth{1.0F};

    void resize(int nextWidth, int nextHeight) {
        width = std::max(1, nextWidth);
        height = std::max(1, nextHeight);
        rgba.resize(std::size_t(width) * std::size_t(height) * 4U);
        depth.resize(std::size_t(width) * std::size_t(height));
        clear();
    }

    void clear() {
        for (std::size_t pixel = 0; pixel < depth.size(); ++pixel) {
            const std::size_t offset = pixel * 4U;
            rgba[offset] = 13U;
            rgba[offset + 1U] = 21U;
            rgba[offset + 2U] = 38U;
            rgba[offset + 3U] = 255U;
        }
        std::fill(depth.begin(), depth.end(), 1.0F);
    }
};

#endif
} // namespace lab
