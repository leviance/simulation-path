#pragma once
#include "model.hpp"

namespace voxel {
// The baseline already needs this helper to draw unit faces.
inline void appendQuad(Mesh& mesh, const Rectangle& r) {
    const int axis = r.face / 2;
    const int uAxis = (axis + 1) % 3;
    const int vAxis = (axis + 2) % 3;
    std::array<double, 3> p{};
    p[axis] = r.plane;
    p[uAxis] = r.u;
    p[vAxis] = r.v;
    std::array<std::array<double, 3>, 4> corners{{p, p, p, p}};
    corners[1][uAxis] += r.width;
    corners[2][uAxis] += r.width;
    corners[2][vAxis] += r.height;
    corners[3][vAxis] += r.height;

    std::array<int, 6> order{{0, 1, 2, 0, 2, 3}};
    if (r.face % 2 != 0) {
        order = {{0, 3, 2, 0, 2, 1}};
    }
    for (int t = 0; t < 2; ++t) {
        Triangle triangle{};
        triangle.color = faceColor(r.material, r.face);
        for (int vertex = 0; vertex < 3; ++vertex) {
            const auto& c = corners[order[t * 3 + vertex]];
            triangle.points[vertex] = {c[0], c[1], c[2]};
        }
        mesh.push_back(triangle);
    }
}
} // namespace voxel
