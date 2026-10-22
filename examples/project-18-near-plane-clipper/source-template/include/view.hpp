#pragma once
#include "framebuffer.hpp"
#include "scene.hpp"

namespace lab {
constexpr std::uint32_t kFanColor = 0x936CDCFFu;

// Số liệu là output thật của pipeline; profile chỉ là một overlay ZX.
struct FrameStats {
    Triangle3 source{};
    ClipResult clip{};
    std::size_t candidates{};
    std::size_t covered{};
    std::size_t renderedTriangles{};
    bool discarded{};
};

inline std::uint8_t toByte(double value) {
    if (!std::isfinite(value)) {
        return 0;
    }
    return static_cast<std::uint8_t>(std::lround(std::clamp(value, 0.0, 255.0)));
}

inline std::uint32_t packColor(Color c) {
    return (std::uint32_t(toByte(c.red)) << 24U) | (std::uint32_t(toByte(c.green)) << 16U) | (std::uint32_t(toByte(c.blue)) << 8U) | 255U;
}

inline bool clipLine(Vec2& a, Vec2& b, int width, int height) {
    if (!std::isfinite(a.x) || !std::isfinite(a.y) || !std::isfinite(b.x) || !std::isfinite(b.y) || width <= 0 || height <= 0) {
        return false;
    }
    const Vec2 delta{b.x - a.x, b.y - a.y};
    double first = 0.0;
    double last = 1.0;
    const auto boundary = [&](double direction, double distance) {
        if (direction == 0.0) {
            return distance >= 0.0;
        }
        const double fraction = distance / direction;
        if (direction < 0.0) {
            first = std::max(first, fraction);
        } else {
            last = std::min(last, fraction);
        }
        return first <= last;
    };
    if (!boundary(-delta.x, a.x) || !boundary(delta.x, width - 1.0 - a.x) || !boundary(-delta.y, a.y) || !boundary(delta.y, height - 1.0 - a.y)) {
        return false;
    }
    b = {a.x + last * delta.x, a.y + last * delta.y};
    a = {a.x + first * delta.x, a.y + first * delta.y};
    return true;
}

inline void screenLine(Framebuffer& image, Vec2 a, Vec2 b, int height, std::uint32_t color) {
    if (clipLine(a, b, Framebuffer::width, height)) {
        drawLine(image, static_cast<int>(std::lround(a.x)), static_cast<int>(std::lround(a.y)), static_cast<int>(std::lround(b.x)), static_cast<int>(std::lround(b.y)), color);
    }
}

inline Vec2 profilePoint(const ClipVertex& vertex) {
    return {770.0 + (vertex.position.z + 5.0) * 300.0 / 13.0, 784.0 - (vertex.position.x + 2.5) * 140.0 / 5.0};
}

inline void drawProfile(Framebuffer& image, const FrameStats& stats, const Scene& scene) {
    const auto line = [&](const ClipVertex& a, const ClipVertex& b, std::uint32_t color) {
        screenLine(image, profilePoint(a), profilePoint(b), 800, color);
    };
    const ClipVertex low{{-2.5, 0.0, scene.nearPlane}, {}}, high{{2.5, 0.0, scene.nearPlane}, {}};
    line(low, high, kMarker);
    for (int i = 0; i < 3; ++i) {
        line(vertexAt(stats.source, i), vertexAt(stats.source, (i + 1) % 3), kGhost);
    }
    for (int i = 0; i < 3; ++i) {
        const auto v = vertexAt(stats.source, i);
        const auto p = profilePoint(v);
        if (std::isfinite(p.x) && std::isfinite(p.y) && p.x >= 770.0 && p.x <= 1070.0 && p.y >= 644.0 && p.y <= 784.0) {
            disc(image, static_cast<int>(p.x), static_cast<int>(p.y), 4, packColor(v.color));
        }
    }
#if LAB_CHECKPOINT >= 3
    for (int i = 0; i < 3; ++i) {
        const auto a = vertexAt(stats.source, i), b = vertexAt(stats.source, (i + 1) % 3);
        if (isInsideNearPlane(a, scene.nearPlane) != isInsideNearPlane(b, scene.nearPlane)) {
            const auto p = intersectNearPlane(a, b, scene.nearPlane);
            if (p) {
                const auto q = profilePoint(*p);
                if (q.x >= 770 && q.x <= 1070 && q.y >= 644 && q.y <= 784) {
                    disc(image, static_cast<int>(q.x), static_cast<int>(q.y), 3, kWhite);
                }
            }
        }
    }
#endif
#if LAB_CHECKPOINT >= 4
    const auto& polygon = stats.clip.polygon;
    for (std::size_t i = 0; i < polygon.count; ++i) {
        line(polygon.vertices[i], polygon.vertices[(i + 1) % polygon.count], kShape);
    }
#endif
#if LAB_CHECKPOINT >= 5
    if (stats.clip.polygon.count == 4) {
        line(stats.clip.polygon.vertices[0], stats.clip.polygon.vertices[2], kFanColor);
    }
#endif
}

#if LAB_CHECKPOINT >= 8
inline void drawWorldGrid(Framebuffer& image, const Scene& scene) {
    const auto line = [&](Vec3 a, Vec3 b) {
        ClipVertex p{{a.x - scene.camera.x, a.y - scene.camera.y, a.z - scene.camera.z}, {}}, q{{b.x - scene.camera.x, b.y - scene.camera.y, b.z - scene.camera.z}, {}};
        const bool inP = isInsideNearPlane(p, scene.nearPlane), inQ = isInsideNearPlane(q, scene.nearPlane);
        if (!inP && !inQ) {
            return;
        }
        if (inP != inQ) {
            const auto hit = intersectNearPlane(p, q, scene.nearPlane);
            if (!hit) {
                return;
            }
            if (!inP) {
                p = *hit;
            } else {
                q = *hit;
            }
        }
        const Viewport viewport{0, 0, Framebuffer::width, viewportHeight(scene)};
        const auto x = projectVertex(p, 1.0471975511965976, viewport, scene.nearPlane), y = projectVertex(q, 1.0471975511965976, viewport, scene.nearPlane);
        if (x && y) {
            screenLine(image, x->position, y->position, viewport.height, kGrid);
        }
    };
    for (int x = -6; x <= 6; ++x) {
        line({double(x), -1.8, 2.0}, {double(x), -1.8, 9.0});
    }
    for (int z = 2; z <= 9; ++z) {
        line({-6.0, -1.8, double(z)}, {6.0, -1.8, double(z)});
    }
}
#endif

inline FrameStats renderScene(Framebuffer& image, const Scene& scene) {
    image.clear(kBackground);
    FrameStats stats{};
#if LAB_CHECKPOINT >= 8
    drawWorldGrid(image, scene);
#endif
#if LAB_CHECKPOINT >= 1
    stats.source = cameraTriangle(scene);
#if LAB_CHECKPOINT >= 6
    stats.clip = clipForRender(stats.source, scene.nearPlane);
#else
#if LAB_CHECKPOINT >= 2
    stats.clip.inputCounts = classifyTriangle(stats.source, scene.nearPlane);
#endif
#if LAB_CHECKPOINT >= 4
    stats.clip.polygon = clipTriangleToNearPlane(stats.source, scene.nearPlane);
#endif
#if LAB_CHECKPOINT >= 5
    stats.clip.batch = triangulateFan(stats.clip.polygon);
#endif
#endif
    TriangleBatch renderBatch{};
#if LAB_CHECKPOINT >= 6
    if (scene.clipping) {
        renderBatch = stats.clip.batch;
    }
#endif
    if (!scene.clipping) {
        const auto& t = stats.source;
        if (t.a.position.z >= scene.nearPlane && t.b.position.z >= scene.nearPlane && t.c.position.z >= scene.nearPlane) {
            renderBatch.triangles[0] = t;
            renderBatch.count = 1;
        } else {
            stats.discarded = true;
        }
    }
    const Viewport viewport{0, 0, Framebuffer::width, viewportHeight(scene)};
    for (std::size_t i = 0; i < renderBatch.count; ++i) {
        const auto projected = projectTriangle(renderBatch.triangles[i], 1.0471975511965976, viewport, scene.nearPlane);
        if (!projected) {
            continue;
        }
        ++stats.renderedTriangles;
        const auto raster = rasterizeScreenTriangle(*projected, viewport.width, viewport.height, [&](int x, int y, Color color) {
            image.putPixel(x, y, packColor(color));
        });
        stats.candidates += raster.candidateCount;
        stats.covered += raster.coveredCount;
    }
    if (scene.debug) {
        drawProfile(image, stats, scene);
    }
#endif
    (void)scene;
    return stats;
}
} // namespace lab
