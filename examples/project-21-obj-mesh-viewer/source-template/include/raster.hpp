#pragma once
#include "mesh.hpp"
#include "shading.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 6
// Coverage dùng pixel center và quy tắc top-left, không để hai triangle tranh cạnh.
struct Barycentric {
    double a{};
    double b{};
    double c{};
};

struct ScreenTriangle {
    ScreenVertex a{};
    ScreenVertex b{};
    ScreenVertex c{};
    Color color{};
    std::size_t sourceFace{};
};

inline double orient2D(const ScreenVertex& a, const ScreenVertex& b, double x, double y) {
    return (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
}

inline bool isTopLeftEdge(const ScreenVertex& a, const ScreenVertex& b) {
    const double deltaX = b.x - a.x;
    const double deltaY = b.y - a.y;
    return deltaY < -1e-9 || (std::abs(deltaY) <= 1e-9 && deltaX > 1e-9);
}

inline bool acceptsEdge(double value, bool topLeft) {
    if (value > 1e-9) {
        return true;
    }
    if (value < -1e-9) {
        return false;
    }
    return topLeft;
}

inline ScreenTriangle normalizeScreenWinding(ScreenTriangle triangle) {
    if (orient2D(triangle.a, triangle.b, triangle.c.x, triangle.c.y) < 0.0) {
        std::swap(triangle.b, triangle.c);
    }
    return triangle;
}

template <typename ShadeFragment>
inline std::size_t rasterizeTriangle(
    ScreenTriangle source,
    int width,
    int height,
    ShadeFragment shadeFragment
) {
    const ScreenTriangle triangle = normalizeScreenWinding(source);
    const double area = orient2D(triangle.a, triangle.b, triangle.c.x, triangle.c.y);
    if (area <= 1e-9 || width <= 0 || height <= 0) {
        return 0;
    }
    const int minX = std::clamp(
        int(std::floor(std::min({triangle.a.x, triangle.b.x, triangle.c.x}))),
        0,
        width - 1
    );
    const int minY = std::clamp(
        int(std::floor(std::min({triangle.a.y, triangle.b.y, triangle.c.y}))),
        0,
        height - 1
    );
    const int maxX = std::clamp(
        int(std::ceil(std::max({triangle.a.x, triangle.b.x, triangle.c.x}))) - 1,
        0,
        width - 1
    );
    const int maxY = std::clamp(
        int(std::ceil(std::max({triangle.a.y, triangle.b.y, triangle.c.y}))) - 1,
        0,
        height - 1
    );

    std::size_t covered = 0;
    for (int y = minY; y <= maxY; ++y) {
        for (int x = minX; x <= maxX; ++x) {
            const double sampleX = double(x) + 0.5;
            const double sampleY = double(y) + 0.5;
            const double edgeAB = orient2D(triangle.a, triangle.b, sampleX, sampleY);
            const double edgeBC = orient2D(triangle.b, triangle.c, sampleX, sampleY);
            const double edgeCA = orient2D(triangle.c, triangle.a, sampleX, sampleY);
            const bool inside = acceptsEdge(edgeAB, isTopLeftEdge(triangle.a, triangle.b)) &&
                acceptsEdge(edgeBC, isTopLeftEdge(triangle.b, triangle.c)) &&
                acceptsEdge(edgeCA, isTopLeftEdge(triangle.c, triangle.a));
            if (!inside) {
                continue;
            }
            shadeFragment(
                x,
                y,
                Barycentric{edgeBC / area, edgeCA / area, edgeAB / area},
                triangle
            );
            ++covered;
        }
    }
    return covered;
}

struct PainterStats {
    std::size_t rasterizedTriangles{};
    std::size_t coveredFragments{};
    std::size_t degenerateTriangles{};
};

inline PainterStats renderPainterMesh(
    const ObjMesh& mesh,
    int width,
    int height,
    double angleX,
    double angleY,
    double distance,
    bool cullBackfaces,
    std::vector<std::uint32_t>& colors
) {
    PainterStats stats{};
    const Color base{92, 190, 246, 255};
    const Vec3 lightDirection{-0.45, -0.75, -1.0};
    for (const ObjTriangle& source : mesh.triangles) {
        const Vec3 a = toCameraPoint(mesh.positions[source.indices[0]], angleX, angleY, distance);
        const Vec3 b = toCameraPoint(mesh.positions[source.indices[1]], angleX, angleY, distance);
        const Vec3 c = toCameraPoint(mesh.positions[source.indices[2]], angleX, angleY, distance);
        const std::optional<Vec3> normal = faceNormal(a, b, c);
        if (!normal) {
            ++stats.degenerateTriangles;
            continue;
        }
        if (cullBackfaces && !isFrontFacing(*normal, a, b, c)) {
            continue;
        }
        const std::optional<ScreenVertex> screenA = projectVertex(a, width, height);
        const std::optional<ScreenVertex> screenB = projectVertex(b, width, height);
        const std::optional<ScreenVertex> screenC = projectVertex(c, width, height);
        if (!screenA || !screenB || !screenC) {
            continue;
        }
        const Color color = shadeColor(base, lambertIntensity(*normal, lightDirection));
        ++stats.rasterizedTriangles;
        stats.coveredFragments += rasterizeTriangle(
            {*screenA, *screenB, *screenC, color, source.sourceFace},
            width,
            height,
            [&](int x, int y, Barycentric, const ScreenTriangle& triangle) {
                const std::size_t index = std::size_t(y) * std::size_t(width) + std::size_t(x);
                colors[index] = packColor(triangle.color);
            }
        );
    }
    return stats;
}
#endif

} // namespace lab
