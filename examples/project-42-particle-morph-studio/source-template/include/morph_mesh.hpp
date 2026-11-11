#pragma once

#include "morph_math.hpp"
#include <string_view>
#include <vector>

namespace morph {

enum class Shape { sphere,
                   torus,
                   knot };
struct Mesh {
    std::vector<Vec3> vertices;
    std::vector<std::array<std::uint32_t, 3>> triangles;
};

inline std::string_view shapeName(Shape shape) {
    if (shape == Shape::sphere)
        return "SPHERE";
    if (shape == Shape::torus)
        return "TORUS";
    return "KNOT";
}

inline Vec3 knotCenter(double u) {
    const double ring = 1.35 + 0.48 * std::cos(3.0 * u);
    return {ring * std::cos(2.0 * u), 0.48 * std::sin(3.0 * u), ring * std::sin(2.0 * u)};
}

// Supplied mesh scaffold: move a section by parallel transport, without a quaternion dependency.
inline Vec3 transport(Vec3 normal, Vec3 oldTangent, Vec3 tangent) {
    const Vec3 axis = cross(oldTangent, tangent);
    const double sine = length(axis);
    const double cosine = std::clamp(dot(oldTangent, tangent), -1.0, 1.0);
    if (sine > 1e-10) {
        const Vec3 k = axis * (1.0 / sine);
        normal = normal * cosine + cross(k, normal) * sine + k * (dot(k, normal) * (1.0 - cosine));
    }
    return unit(normal - tangent * dot(normal, tangent));
}

inline Mesh makeMesh(Shape shape, int uSegments = 64, int vSegments = 32) {
    if (uSegments < 8 || uSegments > 128 || vSegments < 8 || vSegments > 64)
        throw std::invalid_argument("Built-in mesh subdivisions are outside the supplied scaffold range");
    Mesh mesh;
    const int columns = vSegments + 1;
    std::vector<Vec3> tangents(static_cast<std::size_t>(uSegments + 1));
    std::vector<Vec3> normals(tangents.size());
    if (shape == Shape::knot) {
        constexpr double epsilon = 1e-5;
        for (int row = 0; row <= uSegments; ++row) {
            const double u = tau * static_cast<double>(row) / uSegments;
            tangents[row] = unit(knotCenter(u + epsilon) - knotCenter(u - epsilon));
        }
        normals[0] = unit(cross(tangents[0], {0.0, 1.0, 0.0}));
        for (int row = 1; row <= uSegments; ++row)
            normals[row] = transport(normals[row - 1], tangents[row - 1], tangents[row]);
        const double residual = std::atan2(dot(tangents[0], cross(normals[uSegments], normals[0])), dot(normals[uSegments], normals[0]));
        for (int row = 1; row <= uSegments; ++row) {
            const double angle = residual * static_cast<double>(row) / uSegments;
            normals[row] = normals[row] * std::cos(angle) + cross(tangents[row], normals[row]) * std::sin(angle);
        }
    }
    for (int row = 0; row <= uSegments; ++row) {
        const double u = tau * static_cast<double>(row) / uSegments;
        for (int column = 0; column <= vSegments; ++column) {
            const double v = tau * static_cast<double>(column) / vSegments;
            Vec3 point{};
            if (shape == Shape::sphere) {
                const double latitude = std::numbers::pi_v<double> * static_cast<double>(column) / vSegments;
                point = {1.65 * std::sin(latitude) * std::cos(u), 1.65 * std::cos(latitude), 1.65 * std::sin(latitude) * std::sin(u)};
            } else if (shape == Shape::torus) {
                const double radius = 1.35 + 0.48 * std::cos(v);
                point = {radius * std::cos(u), 0.48 * std::sin(v), radius * std::sin(u)};
            } else {
                const Vec3 binormal = cross(tangents[row], normals[row]);
                point = knotCenter(u) + normals[row] * (0.20 * std::cos(v)) + binormal * (0.20 * std::sin(v));
            }
            // Duplicate seam positions exactly; zero-area pole triangles are rejected by the distribution.
            if (row == uSegments)
                point = mesh.vertices[static_cast<std::size_t>(column)];
            if (shape != Shape::sphere && column == vSegments)
                point = mesh.vertices[static_cast<std::size_t>(row * columns)];
            mesh.vertices.push_back(point);
        }
    }
    for (int row = 0; row < uSegments; ++row) {
        for (int column = 0; column < vSegments; ++column) {
            const auto a = static_cast<std::uint32_t>(row * columns + column);
            const auto b = static_cast<std::uint32_t>(a + columns);
            mesh.triangles.push_back({a, b, a + 1U});
            mesh.triangles.push_back({a + 1U, b, b + 1U});
        }
    }
    return mesh;
}

} // namespace morph
