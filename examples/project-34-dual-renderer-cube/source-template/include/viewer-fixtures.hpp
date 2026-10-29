#pragma once
#include "viewer-mesh.hpp"
#include "viewer-scene.hpp"

namespace lab {
// Mesh nhỏ với winding/near-plane biết trước giúp kiểm convention độc lập OBJ.
#if LAB_CHECKPOINT >= 3
inline void appendViewerFixtureTriangle(ViewerMesh& mesh, Vec3 a, Vec3 b, Vec3 c) {
    const auto normal = unitVector(crossVector(subtractVector(b, a), subtractVector(c, a)));
    for (const auto point : {a, b, c}) {
        mesh.indices.push_back(static_cast<std::uint32_t>(mesh.vertices.size()));
        mesh.vertices.push_back({point.x, point.y, point.z, normal.x, normal.y, normal.z});
    }
}

inline ViewerMesh viewerVisibilityFixture() {
    ViewerMesh mesh{};
    mesh.name = "front-CCW-and-back-CW";
    appendViewerFixtureTriangle(mesh, {-1, -0.7F, 0}, {-0.1F, -0.7F, 0}, {-0.55F, 0.7F, 0});
    appendViewerFixtureTriangle(mesh, {0.1F, -0.7F, 0}, {0.55F, 0.7F, 0}, {1, -0.7F, 0});
    return mesh;
}

inline ViewerMesh viewerNearFixture() {
    ViewerMesh mesh{};
    mesh.name = "triangle-crossing-near-and-eye";
    appendViewerFixtureTriangle(mesh, {-1, -0.7F, 0}, {1, -0.7F, 0}, {0, 0.9F, 1.8F});
    return mesh;
}
#endif
} // namespace lab
