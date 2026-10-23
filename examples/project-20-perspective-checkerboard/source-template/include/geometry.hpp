#pragma once
#include <algorithm>
#include <array>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <optional>
#include <vector>

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif

namespace lab {
struct Vec2 {
    double x{};
    double y{};
};

struct Vec3 {
    double x{};
    double y{};
    double z{};
};

struct Color {
    double red{};
    double green{};
    double blue{};
};

struct Viewport {
    int left{};
    int top{};
    int width{};
    int height{};
};

inline bool isFinite(Vec2 p) {
    return std::isfinite(p.x) && std::isfinite(p.y);
}

inline bool isFinite(Vec3 p) {
    return std::isfinite(p.x) && std::isfinite(p.y) && std::isfinite(p.z);
}

inline Vec3 rotateX(Vec3 p, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {p.x, cosine * p.y - sine * p.z, sine * p.y + cosine * p.z};
}

inline Vec3 rotateY(Vec3 p, double angle) {
    const double cosine = std::cos(angle);
    const double sine = std::sin(angle);
    return {cosine * p.x + sine * p.z, p.y, -sine * p.x + cosine * p.z};
}

#if LAB_CHECKPOINT >= 1
struct TexturedVertex {
    Vec3 position{};
    Vec2 uv{};
};

using TexturedTriangle = std::array<TexturedVertex, 3>;

struct TexturedQuad {
    std::array<TexturedVertex, 4> vertices{};
    std::array<std::array<std::size_t, 3>, 2> faces{{{0, 2, 1}, {0, 3, 2}}};
};

// Chỉ quay và tịnh tiến: chiều dài cạnh không đổi khi tăng độ nghiêng.
inline TexturedQuad makeQuad(double yaw, double pitch, double distance) {
    TexturedQuad quad;
    quad.vertices[0] = {{-1.6, -1, 0}, {0, 1}};
    quad.vertices[1] = {{1.6, -1, 0}, {1, 1}};
    quad.vertices[2] = {{1.6, 1, 0}, {1, 0}};
    quad.vertices[3] = {{-1.6, 1, 0}, {0, 0}};
    for (auto& vertex : quad.vertices) {
        vertex.position = rotateY(rotateX(vertex.position, pitch), yaw);
        vertex.position.z += distance;
    }
    return quad;
}

inline TexturedTriangle quadTriangle(const TexturedQuad& quad, std::size_t face) {
    const auto& indices = quad.faces[face];
    return {quad.vertices[indices[0]], quad.vertices[indices[1]], quad.vertices[indices[2]]};
}

struct ScreenVertex {
    Vec2 position{};
    Vec2 uv{};
#if LAB_CHECKPOINT >= 5
    double oneOverZ{};
    double uOverZ{};
    double vOverZ{};
#endif
};

using ScreenTriangle = std::array<ScreenVertex, 3>;

inline std::optional<ScreenVertex> projectVertex(const TexturedVertex& vertex, Viewport viewport, double nearPlane = 1) {
    if (!isFinite(vertex.position) || !isFinite(vertex.uv) || vertex.position.z < nearPlane || nearPlane <= 0 || !std::isfinite(nearPlane) || viewport.width <= 0 || viewport.height <= 0) {
        return std::nullopt;
    }
    const double focalPixels = double(viewport.height) * 0.5 / std::tan(3.141592653589793 / 6.0);
    ScreenVertex output;
    output.position = {viewport.left + viewport.width * 0.5 + focalPixels * vertex.position.x / vertex.position.z, viewport.top + viewport.height * 0.5 - focalPixels * vertex.position.y / vertex.position.z};
    output.uv = vertex.uv;
#if LAB_CHECKPOINT >= 5
    output.oneOverZ = 1.0 / vertex.position.z;
    output.uOverZ = vertex.uv.x * output.oneOverZ;
    output.vOverZ = vertex.uv.y * output.oneOverZ;
#endif
    if (!isFinite(output.position)) {
        return std::nullopt;
    }
    return output;
}
#endif
} // namespace lab
