#pragma once

#include "sculpt_grid.hpp"
#include <compare>
#include <utility>

namespace sculpt {

// One globally consistent Freudenthal split. Neighboring cubes use the same face diagonals.
inline constexpr std::array<std::array<int, 3>, 8> cubeCorners{{
    {0, 0, 0}, {1, 0, 0}, {1, 1, 0}, {0, 1, 0},
    {0, 0, 1}, {1, 0, 1}, {1, 1, 1}, {0, 1, 1}}};
inline constexpr std::array<std::array<int, 4>, 6> cubeTetrahedra{{
    {0, 1, 2, 6}, {0, 2, 3, 6}, {0, 3, 7, 6},
    {0, 7, 4, 6}, {0, 4, 5, 6}, {0, 5, 1, 6}}};

struct Corner {
    std::uint64_t id{};
    Vec3 point;
    float value{};
};

struct EdgeKey {
    std::uint64_t low{}, high{};
    auto operator<=>(const EdgeKey&) const = default;
};

struct EdgePoint {
    Vec3 point;
    EdgeKey key;
};

struct SurfaceTriangle {
    std::array<EdgePoint, 3> vertices;
};

struct CellTriangles {
    std::array<SurfaceTriangle, 12> triangles;
    std::uint32_t count{};
    std::uint32_t degenerate{};
};

// snippet:sculpt-edge-interpolation
inline EdgePoint edgePoint(Corner a, Corner b, float isovalue) {
    if (b.id < a.id)
        std::swap(a, b);
    if (a.id == b.id || !finite(a.point) || !finite(b.point) || !std::isfinite(a.value) || !std::isfinite(b.value) || !std::isfinite(isovalue))
        throw std::invalid_argument("Edge interpolation needs distinct finite endpoints");
    if ((a.value < isovalue) == (b.value < isovalue))
        throw std::invalid_argument("This edge does not cross the requested isovalue");
    const float t = std::clamp((isovalue - a.value) / (b.value - a.value), 0.0F, 1.0F);
    if (!std::isfinite(t))
        throw std::runtime_error("Edge interpolation is not finite");
    return {a.point + (b.point - a.point) * t, {a.id, b.id}};
}
// end-snippet:sculpt-edge-interpolation

inline void appendTriangle(CellTriangles& output, EdgePoint a, EdgePoint b, EdgePoint c, Vec3 towardOutside, float spacing) {
    const Vec3 area = cross(b.point - a.point, c.point - a.point);
    const float minimumSquaredArea = std::max(1e-24F, spacing * spacing * spacing * spacing * 1e-16F);
    if (dot(area, area) <= minimumSquaredArea) {
        ++output.degenerate;
        return;
    }
    if (dot(area, towardOutside) < 0)
        std::swap(b, c);
    if (output.count >= output.triangles.size())
        throw std::overflow_error("A cube cannot emit more than twelve tetra triangles");
    output.triangles[output.count++] = {{{a, b, c}}};
}

inline void polygonizeTetra(const std::array<Corner, 4>& tetra, float isovalue, float spacing, CellTriangles& output) {
    if (!std::isfinite(isovalue) || !std::isfinite(spacing) || spacing <= 0)
        throw std::invalid_argument("Tetra extraction needs a finite isovalue and positive spacing");
    std::array<int, 4> inside{}, outside{};
    int insideCount = 0, outsideCount = 0;
    Vec3 insideSum{}, outsideSum{};
    for (int vertex = 0; vertex < 4; ++vertex) {
        if (!finite(tetra[vertex].point) || !std::isfinite(tetra[vertex].value))
            throw std::invalid_argument("A tetra contains invalid data");
        for (int previous = 0; previous < vertex; ++previous)
            if (tetra[previous].id == tetra[vertex].id)
                throw std::invalid_argument("A tetra repeats a sample ID");
        if (tetra[vertex].value < isovalue) {
            inside[insideCount++] = vertex;
            insideSum = insideSum + tetra[vertex].point;
        } else {
            outside[outsideCount++] = vertex;
            outsideSum = outsideSum + tetra[vertex].point;
        }
    }
    if (insideCount == 0 || insideCount == 4)
        return;
    const Vec3 towardOutside = outsideSum / static_cast<float>(outsideCount) - insideSum / static_cast<float>(insideCount);
    if (insideCount == 1) {
        const Corner center = tetra[inside[0]];
        appendTriangle(output, edgePoint(center, tetra[outside[0]], isovalue), edgePoint(center, tetra[outside[1]], isovalue), edgePoint(center, tetra[outside[2]], isovalue), towardOutside, spacing);
    } else if (insideCount == 3) {
        const Corner center = tetra[outside[0]];
        appendTriangle(output, edgePoint(center, tetra[inside[0]], isovalue), edgePoint(center, tetra[inside[1]], isovalue), edgePoint(center, tetra[inside[2]], isovalue), towardOutside, spacing);
    } else {
        const auto ac = edgePoint(tetra[inside[0]], tetra[outside[0]], isovalue);
        const auto ad = edgePoint(tetra[inside[0]], tetra[outside[1]], isovalue);
        const auto bc = edgePoint(tetra[inside[1]], tetra[outside[0]], isovalue);
        const auto bd = edgePoint(tetra[inside[1]], tetra[outside[1]], isovalue);
        appendTriangle(output, ac, ad, bd, towardOutside, spacing);
        appendTriangle(output, ac, bd, bc, towardOutside, spacing);
    }
}

inline CellTriangles polygonizeCell(const ScalarGrid& grid, int x, int y, int z, float isovalue) {
    if (!std::isfinite(isovalue) || std::abs(isovalue) > 1)
        throw std::invalid_argument("Isovalue is outside the finite fixture range");
    if (x < 0 || y < 0 || z < 0 || x >= grid.spec().samples - 1 || y >= grid.spec().samples - 1 || z >= grid.spec().samples - 1)
        throw std::out_of_range("Cell is outside the scalar grid");
    std::array<Corner, 8> corners;
    for (std::size_t index = 0; index < cubeCorners.size(); ++index) {
        const int sx = x + cubeCorners[index][0], sy = y + cubeCorners[index][1], sz = z + cubeCorners[index][2];
        corners[index] = {grid.spec().sampleIndex(sx, sy, sz), grid.spec().worldFromGrid({static_cast<float>(sx), static_cast<float>(sy), static_cast<float>(sz)}), grid.at(sx, sy, sz)};
    }
    CellTriangles result;
    for (const auto& indices : cubeTetrahedra) {
        const std::array<Corner, 4> tetra{corners[indices[0]], corners[indices[1]], corners[indices[2]], corners[indices[3]]};
        polygonizeTetra(tetra, isovalue, grid.spec().spacing(), result);
    }
    return result;
}

} // namespace sculpt
