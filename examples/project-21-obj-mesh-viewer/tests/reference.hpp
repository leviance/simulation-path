#pragma once
#include "lab.hpp"

namespace reference {
// Đối chứng ray–triangle: không gọi projection, barycentric raster hoặc depth interpolation.
inline std::optional<double> rayHit(lab::Vec3 direction, lab::Vec3 a, lab::Vec3 b, lab::Vec3 c) {
    const auto edge1 = b - a;
    const auto edge2 = c - a;
    const auto h = lab::cross(direction, edge2);
    const double determinant = lab::dot(edge1, h);
    if (std::abs(determinant) < 1e-10) {
        return std::nullopt;
    }
    const auto s = lab::Vec3{} - a;
    const double u = lab::dot(s, h) / determinant;
    const auto q = lab::cross(s, edge1);
    const double v = lab::dot(direction, q) / determinant;
    const double t = lab::dot(edge2, q) / determinant;
    if (u < 0.0 || v < 0.0 || u + v > 1.0 || t < 0.7 || t > 20.0) {
        return std::nullopt;
    }
    return t;
}

inline std::size_t depthMismatches(const lab::ObjMesh& mesh, const lab::RenderOptions& options) {
    constexpr int width = 47;
    constexpr int height = 31;
    lab::DepthBuffer depths(width, height);
    std::vector<std::uint32_t> colors{};
    lab::renderObjMesh(mesh, width, height, options, colors, depths);
    std::vector<lab::Vec3> positions{};
    const lab::OrbitCamera camera{options.cameraYaw, options.cameraPitch, options.distance};
    for (const auto position : mesh.positions) {
        positions.push_back(lab::worldToCamera(lab::rotateModelPoint(position, options.angleX, options.angleY), camera));
    }
    std::size_t mismatches = 0;
    for (int y = 0; y < height; ++y) {
        for (int x = 0; x < width; ++x) {
            // z=1 để tham số ray t cũng chính là camera-space depth.
            const lab::Vec3 ray{(2.0 * (double(x) + 0.5) / width - 1.0) * double(width) / height * std::tan(3.141592653589793 / 6.0), (1.0 - 2.0 * (double(y) + 0.5) / height) * std::tan(3.141592653589793 / 6.0), 1.0};
            double nearest = 20.0;
            for (const auto& triangle : mesh.triangles) {
                const auto hit = rayHit(ray, positions[triangle.indices[0]], positions[triangle.indices[1]], positions[triangle.indices[2]]);
                if (hit) {
                    nearest = std::min(nearest, *hit);
                }
            }
            const double expectedDepth = 20.0 / 19.3 - 14.0 / (19.3 * nearest);
            if (std::abs(expectedDepth - depths.values[depths.index(x, y)]) > 1e-8) {
                ++mismatches;
            }
        }
    }
    return mismatches;
}
} // namespace reference
