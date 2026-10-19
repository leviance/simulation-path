#pragma once
#include "framebuffer.hpp"
#include "pipeline.hpp"

namespace lab {
inline void rasterSegment(Framebuffer& image, const ScreenSegment& segment, std::uint32_t color) {
    drawLine(image, static_cast<int>(std::lround(segment.from.x)), static_cast<int>(std::lround(segment.from.y)), static_cast<int>(std::lround(segment.to.x)), static_cast<int>(std::lround(segment.to.y)), color);
}

inline void line3D(Framebuffer& image, Vec3 a, Vec3 b, const Scene& scene, std::uint32_t color) {
    std::size_t unused = 0;
    const auto segment = projectSegment(projectVertex(a, scene), projectVertex(b, scene), scene, unused);
    if (segment) {
        rasterSegment(image, *segment, color);
    }
}

inline void drawDepthScene(Framebuffer& image, const Scene& scene) {
    for (int x = -6; x <= 6; ++x) {
        line3D(image, {static_cast<double>(x), -2.0, 1.0}, {static_cast<double>(x), -2.0, 15.0}, scene, kGrid);
    }
    for (int z = 1; z <= 15; ++z) {
        line3D(image, {-6.0, -2.0, static_cast<double>(z)}, {6.0, -2.0, static_cast<double>(z)}, scene, kGrid);
    }
    // Mốc ở các khoảng Z khác nhau vẫn còn khi ẩn overlay.
    for (int z = 4; z <= 12; z += 4) {
        line3D(image, {-4.0, -2.0, static_cast<double>(z)}, {-4.0, 2.0, static_cast<double>(z)}, scene, kGhost);
        line3D(image, {4.0, -2.0, static_cast<double>(z)}, {4.0, 2.0, static_cast<double>(z)}, scene, kGhost);
    }
    if (scene.debug) {
        const Vec3 origin{-3.0, -1.8, 6.0};
        line3D(image, origin, add(origin, {1.5, 0.0, 0.0}), scene, kAxisX);
        line3D(image, origin, add(origin, {0.0, 1.5, 0.0}), scene, kShape);
        line3D(image, origin, add(origin, {0.0, 0.0, 1.5}), scene, kAxisY);
    }
}
#if LAB_CHECKPOINT >= 6
inline std::uint32_t edgeColor(double depthFactor, bool depthCue) {
    if (!depthCue) {
        return 0x84A9FFFFu;
    }
    const double t = std::clamp(depthFactor, 0.0, 1.0);
    const auto r = static_cast<std::uint32_t>(54.0 + 114.0 * t);
    const auto g = static_cast<std::uint32_t>(72.0 + 164.0 * t);
    const auto b = static_cast<std::uint32_t>(112.0 + 143.0 * t);
    return (r << 24) | (g << 16) | (b << 8) | 255u;
}
#endif
struct RenderStats {
    std::size_t vertexProjections = 0;
    std::size_t edgeCount = 0;
    std::size_t extraProjections = 0;
};

inline RenderStats renderScene(Framebuffer& image, const Scene& scene) {
    RenderStats stats;
    image.clear(kBackground);
    drawDepthScene(image, scene);
#if LAB_CHECKPOINT >= 1
    const CubeVertices world = worldCube(scene);
    const ProjectedCube projected = projectCube(world, scene);
    stats.vertexProjections = projected.projectionCount;
#if LAB_CHECKPOINT >= 2
    const EdgeFrame frame = buildEdges(projected, scene);
    stats.edgeCount = frame.count;
    stats.extraProjections = frame.extraProjections;
    for (std::size_t i = 0; i < frame.count; ++i) {
        const RenderEdge& edge = frame.edges[i];
        std::uint32_t color = 0x84A9FFFFu;
#if LAB_CHECKPOINT >= 6
        color = edgeColor(edge.depthFactor, scene.depthCue);
#endif
        rasterSegment(image, edge.screen, color);
    }
#endif
    if (scene.debug) {
        for (const auto& vertex : projected.vertices) {
            if (vertex.status == ProjectionStatus::Visible && vertex.screen) {
                disc(image, static_cast<int>(std::lround(vertex.screen->x)), static_cast<int>(std::lround(vertex.screen->y)), 4, kWhite);
            }
        }
    }
#endif
    return stats;
}
} // namespace lab
