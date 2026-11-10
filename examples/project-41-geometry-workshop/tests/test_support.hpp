#pragma once

#include "parametric_mesh.hpp"

namespace geometry_tests {

// Throwing keeps validation active when Release defines NDEBUG.
inline void require(bool passed, const char* message) {
    if (!passed)
        throw std::runtime_error(message);
}

inline geometry::Vec3 unpack(const std::array<float, 3>& vector) {
    return {vector[0], vector[1], vector[2]};
}

inline void requireNear(geometry::Vec3 actual, geometry::Vec3 expected, double tolerance, const char* message) {
    require(geometry::length(actual - expected) <= tolerance, message);
}

inline geometry::Mesh buildMesh(const geometry::SurfaceSettings& settings) {
    geometry::MeshBuild build(settings);
    for (int row = 0; row <= settings.uSegments; row += geometry::maxRowsPerBatch)
        build.advance();
    return build.takeMesh();
}

} // namespace geometry_tests
