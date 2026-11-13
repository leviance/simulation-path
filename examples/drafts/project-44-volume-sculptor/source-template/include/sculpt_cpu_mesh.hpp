#pragma once

#include "sculpt_topology.hpp"

namespace sculpt {

struct CpuMesh {
    std::vector<SurfaceVertex> vertices;
    std::uint64_t activeCells{};
    std::uint64_t degenerateTriangles{};
    std::uint64_t normalFallbacks{};
};

inline CpuMesh extractCpu(const ScalarGrid& grid, float isovalue, std::size_t capacity = 4194304) {
    if (grid.spec().samples > 64)
        throw std::invalid_argument("CPU extraction is only the <=64^3 teaching/reference path");
    const int cells = grid.spec().samples - 1;
    std::vector<std::uint32_t> counts(grid.spec().cellCount());
    std::size_t required = 0, cell = 0;
    CpuMesh result;
    for (int z = 0; z < cells; ++z)
        for (int y = 0; y < cells; ++y)
            for (int x = 0; x < cells; ++x) {
                const auto triangles = polygonizeCell(grid, x, y, z, isovalue);
                counts[cell++] = triangles.count * 3;
                required += triangles.count * 3;
                result.degenerateTriangles += triangles.degenerate;
                if (triangles.count > 0)
                    ++result.activeCells;
            }
    if (required > capacity)
        throw std::overflow_error("Mesh exceeds capacity; keep the previous mesh instead of truncating");
    result.vertices.reserve(required);
    cell = 0;
    for (int z = 0; z < cells; ++z)
        for (int y = 0; y < cells; ++y)
            for (int x = 0; x < cells; ++x) {
                const auto triangles = polygonizeCell(grid, x, y, z, isovalue);
                if (triangles.count * 3 != counts[cell++])
                    throw std::runtime_error("Count and emit do not describe the same field snapshot");
                for (std::uint32_t triangle = 0; triangle < triangles.count; ++triangle) {
                    const auto& vertices = triangles.triangles[triangle].vertices;
                    const Vec3 faceNormal = normalized(cross(vertices[1].point - vertices[0].point, vertices[2].point - vertices[0].point));
                    for (const auto& vertex : vertices) {
                        Vec3 normal = grid.gradient(vertex.point);
                        if (length(normal) <= 1e-10F) {
                            normal = faceNormal;
                            ++result.normalFallbacks;
                        } else
                            normal = normalized(normal);
                        result.vertices.push_back({{vertex.point.x, vertex.point.y, vertex.point.z, 1}, {normal.x, normal.y, normal.z, 0}});
                    }
                }
            }
    if (result.vertices.size() != required)
        throw std::runtime_error("Mesh emit did not fill the exact counted vertex range");
    return result;
}

} // namespace sculpt
