#pragma once
#include "world.hpp"

namespace voxel {
// Kiểm buffer thực sự được renderer đọc; không gọi appendQuad để tạo đáp án.
inline int verifyTriangles(const World& world) {
    int triangles = 0;

    for (const auto& [key, entry] : world.chunks) {
        (void)key;
        if (entry.mesh.size() != entry.quads.size() * 2) {
            throw std::runtime_error("triangle count mismatch");
        }

        for (std::size_t i = 0; i < entry.quads.size(); ++i) {
            const Rectangle& q = entry.quads[i];

            const auto point = [&q](double u, double v) -> Vec3 {
                if (q.face < 2) {
                    return {static_cast<double>(q.plane), u, v};
                }
                if (q.face < 4) {
                    return {v, static_cast<double>(q.plane), u};
                }
                return {u, v, static_cast<double>(q.plane)};
            };

            const std::array<Vec3, 4> corners{{point(q.u, q.v), point(q.u + q.width, q.v), point(q.u + q.width, q.v + q.height), point(q.u, q.v + q.height)}};
            std::array<int, 6> order{{0, 1, 2, 0, 2, 3}};
            if (q.face % 2 != 0) {
                order = {{0, 3, 2, 0, 2, 1}};
            }

            const Color color = faceColor(q.material, q.face);
            for (int t = 0; t < 2; ++t) {
                const Triangle& actual = entry.mesh[i * 2 + t];
                if (actual.color.r != color.r || actual.color.g != color.g || actual.color.b != color.b || actual.color.a != color.a) {
                    throw std::runtime_error("triangle color mismatch");
                }

                for (int vertex = 0; vertex < 3; ++vertex) {
                    const Vec3 expected = corners[order[t * 3 + vertex]];
                    const Vec3 p = actual.points[vertex];
                    if (!std::isfinite(p.x) || !std::isfinite(p.y) || !std::isfinite(p.z) || p.x != expected.x || p.y != expected.y || p.z != expected.z) {
                        throw std::runtime_error("triangle geometry or winding mismatch");
                    }
                }
            }
        }
        triangles += static_cast<int>(entry.mesh.size());
    }

    return triangles;
}
} // namespace voxel
