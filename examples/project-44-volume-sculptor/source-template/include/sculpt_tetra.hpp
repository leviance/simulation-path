#pragma once

#include "sculpt_topology.hpp"

namespace sculpt {

// snippet:sculpt-first-tetra
inline std::array<Corner, 4> teachingTetra() {
    // The coordinates describe one tetra. Only its four stored scalar values will change.
    return {{{0, {-0.85F, -0.65F, -0.55F}, -1}, {1, {0.85F, -0.65F, -0.55F}, 1}, {2, {0, 0.85F, -0.55F}, 1}, {3, {0, 0, 0.9F}, 1}}};
}

// end-snippet:sculpt-first-tetra

// snippet:sculpt-first-surface
inline std::vector<SurfaceVertex> tetraSurface(const std::array<Corner, 4>& corners, float isovalue) {
    CellTriangles surface;
    polygonizeTetra(corners, isovalue, 1, surface);
    std::vector<SurfaceVertex> vertices;
    for (std::uint32_t triangle = 0; triangle < surface.count; ++triangle) {
        const auto& edges = surface.triangles[triangle].vertices;
        const Vec3 faceNormal = normalized(cross(edges[1].point - edges[0].point, edges[2].point - edges[0].point));
        for (const auto& edge : edges) {
            const Vec3 point = edge.point;
            vertices.push_back({{point.x, point.y, point.z, 1}, {faceNormal.x, faceNormal.y, faceNormal.z, 0}});
        }
    }
    return vertices;
}

// end-snippet:sculpt-first-surface

} // namespace sculpt
