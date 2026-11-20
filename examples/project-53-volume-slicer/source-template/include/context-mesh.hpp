#pragma once
#include "sampling.hpp"
#include <algorithm>
#include <vector>

namespace slice53 {
#if LAB_CHECKPOINT >= 6
// Supplied context geometry, not a second representation used by the inspector.
// A coarse isosurface makes the specimen readable; every slice still samples the full volume.
constexpr double contextIso = 0.12;
constexpr std::size_t maxContextTriangles = 240000;
struct Vertex {
    Vec3 point, normal;
    double material = -1; // negative on the neutral analytic fixtures
};
using Triangle = std::array<Vertex, 3>;
using Mesh = std::vector<Triangle>;

inline Vec3 surfaceNormal(const Volume& volume, Vec3 point) {
    Vec3 gradient;
    for (int axis = 0; axis < 3; ++axis) {
        const double h = 2 * volume.grid().spacing[axis];
        Vec3 before = point;
        Vec3 after = point;
        before[axis] -= h;
        after[axis] += h;
        gradient[axis] = (sampleLinear(volume, before).value_or(0) - sampleLinear(volume, after).value_or(0)) / (2 * h);
    }
    return unit(gradient);
}

inline void meshTetrahedron(const Volume& volume, const std::array<Vec3, 4>& points, const std::array<double, 4>& scalar, Mesh& mesh, bool showMinerals) {
    constexpr std::array<std::array<int, 2>, 6> edges{{{0, 1}, {0, 2}, {0, 3}, {1, 2}, {1, 3}, {2, 3}}};
    std::vector<Vertex> polygon;
    for (const auto& edge : edges) {
        const int a = edge[0];
        const int b = edge[1];
        if ((scalar[a] < contextIso) == (scalar[b] < contextIso)) continue;
        const double t = (contextIso - scalar[a]) / (scalar[b] - scalar[a]);
        const Vec3 point = volume.grid().clamp(lerp(points[a], points[b], t));
        const Vec3 normal = surfaceNormal(volume, point);
        double material = -1;
        // The interface has one iso value. The solid endpoint of this crossing
        // contains the measured material, even at the sharp tip of a crystal.
        if (showMinerals) material = std::max(scalar[a], scalar[b]);
        polygon.push_back({point, normal, material});
    }
    if (polygon.size() < 3) return;
    Vec3 centre;
    Vec3 normal;
    for (const Vertex& vertex : polygon) {
        centre = centre + vertex.point;
        normal = normal + vertex.normal;
    }
    centre = centre / static_cast<double>(polygon.size());
    normal = unit(normal);
    const Vec3 u = unit(polygon.front().point - centre);
    const Vec3 v = cross(normal, u);
    std::sort(polygon.begin(), polygon.end(), [&](const Vertex& a, const Vertex& b) {
        const Vec3 pa = a.point - centre;
        const Vec3 pb = b.point - centre;
        return std::atan2(dot(pa, v), dot(pa, u)) < std::atan2(dot(pb, v), dot(pb, u));
    });
    for (std::size_t i = 1; i + 1 < polygon.size(); ++i) {
        if (mesh.size() >= maxContextTriangles) throw std::runtime_error("Context triangle budget exceeded");
        Triangle triangle{polygon[0], polygon[i], polygon[i + 1]};
        if (length(cross(triangle[1].point - triangle[0].point, triangle[2].point - triangle[0].point)) > 1e-9)
            mesh.push_back(triangle);
    }
}

// [snippet context-build]
inline Mesh buildContextMesh(const Volume& volume, bool showMinerals = false) {
    // Two-voxel stride is explicitly a presentation approximation, never a measurement.
    std::array<std::vector<int>, 3> coordinates;
    for (int axis = 0; axis < 3; ++axis) {
        coordinates[axis].push_back(-1);
        for (int i = 0; i < volume.grid().size[axis]; i += 2) coordinates[axis].push_back(i);
        if (coordinates[axis].back() != volume.grid().size[axis] - 1)
            coordinates[axis].push_back(volume.grid().size[axis] - 1);
        coordinates[axis].push_back(volume.grid().size[axis]);
    }
    constexpr std::array<std::array<int, 3>, 8> corners{{{0, 0, 0}, {1, 0, 0}, {1, 1, 0}, {0, 1, 0}, {0, 0, 1}, {1, 0, 1}, {1, 1, 1}, {0, 1, 1}}};
    constexpr std::array<std::array<int, 4>, 6> tetrahedra{{{0, 1, 2, 6}, {0, 2, 3, 6}, {0, 3, 7, 6}, {0, 7, 4, 6}, {0, 4, 5, 6}, {0, 5, 1, 6}}};
    Mesh mesh;
    for (std::size_t z = 0; z + 1 < coordinates[2].size(); ++z) {
        for (std::size_t y = 0; y + 1 < coordinates[1].size(); ++y) {
            for (std::size_t x = 0; x + 1 < coordinates[0].size(); ++x) {
                std::array<Vec3, 8> points;
                std::array<double, 8> scalar{};
                for (std::size_t corner = 0; corner < corners.size(); ++corner) {
                    const int ix = coordinates[0][x + corners[corner][0]];
                    const int iy = coordinates[1][y + corners[corner][1]];
                    const int iz = coordinates[2][z + corners[corner][2]];
                    points[corner] = volume.grid().centre(ix, iy, iz);
                    if (ix >= 0 && iy >= 0 && iz >= 0 && ix < volume.grid().size[0] && iy < volume.grid().size[1] && iz < volume.grid().size[2])
                        scalar[corner] = volume.at(ix, iy, iz);
                }
                const auto limits = std::minmax_element(scalar.begin(), scalar.end());
                if (*limits.second < contextIso || *limits.first >= contextIso) continue;
                for (const auto& tetrahedron : tetrahedra) {
                    std::array<Vec3, 4> positions;
                    std::array<double, 4> values;
                    for (int vertex = 0; vertex < 4; ++vertex) {
                        positions[vertex] = points[tetrahedron[vertex]];
                        values[vertex] = scalar[tetrahedron[vertex]];
                    }
                    meshTetrahedron(volume, positions, values, mesh, showMinerals);
                }
            }
        }
    }
    return mesh;
}
// [/snippet context-build]

inline std::vector<Vertex> clipPolygon(const std::vector<Vertex>& input, int axis, double plane, bool keepLower) {
    std::vector<Vertex> output;
    if (input.empty()) return output;
    Vertex before = input.back();
    double dBefore = before.point[axis] - plane;
    if (!keepLower) dBefore = -dBefore;
    for (Vertex after : input) {
        double dAfter = after.point[axis] - plane;
        if (!keepLower) dAfter = -dAfter;
        if ((dBefore <= 0) != (dAfter <= 0)) {
            const double t = dBefore / (dBefore - dAfter);
            output.push_back({lerp(before.point, after.point, t), unit(lerp(before.normal, after.normal, t)), lerp(before.material, after.material, t)});
        }
        if (dAfter <= 0) output.push_back(after);
        before = after;
        dBefore = dAfter;
    }
    return output;
}
#endif
} // namespace slice53
