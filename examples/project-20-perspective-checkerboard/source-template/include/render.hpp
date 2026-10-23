#pragma once
#include "clip.hpp"
#include "framebuffer.hpp"
#include "interpolation.hpp"
#include "reference.hpp"

namespace lab {
// Nối geometry → clip → projection → coverage → UV → sampler, không để SDL vẽ hộ.
struct PixelInspection {
    bool covered{false};
    Vec2 affineUv{};
    Vec2 referenceUv{};
    Vec2 correctedUv{};
    double denominator{};
    std::array<double, 3> weights{};
    std::array<int, 2> texel{};
};

struct RenderStats {
    std::size_t covered{};
    std::size_t triangles{};
    double maximumError{};
    PixelInspection inspection;
};

#if LAB_CHECKPOINT >= 3
template <class WritePixel>
inline void renderTexturedTriangle(const TexturedTriangle& input, Viewport viewport, const Scene& scene, bool corrected, const Texture2D& texture, RenderStats& stats, WritePixel write) {
    std::vector<TexturedVertex> polygon(input.begin(), input.end());
#if LAB_CHECKPOINT >= 7
    polygon = clipTriangleToNearPlane(input, 1);
#endif
    for (std::size_t i = 1; i + 1 < polygon.size(); ++i) {
        const auto a = projectVertex(polygon[0], viewport);
        const auto b = projectVertex(polygon[i], viewport);
        const auto c = projectVertex(polygon[i + 1], viewport);
        if (!a || !b || !c) {
            continue;
        }
        ++stats.triangles;
        rasterizeTriangle(ScreenTriangle{*a, *b, *c}, viewport, [&](const ScreenTriangle& triangle, RasterSample sample) {
            const Vec2 affineUv = interpolateAffineUv(triangle, sample.barycentric);
            Vec2 selectedUv = affineUv;
#if LAB_CHECKPOINT >= 6
            const auto perspectiveUv = interpolatePerspectiveUv(triangle, sample.barycentric);
            if (!perspectiveUv) {
                return;
            }
            if (corrected) {
                selectedUv = *perspectiveUv;
            }
#else
                (void)corrected;
#endif
            write(sample, selectedUv, sampleNearest(texture, selectedUv, scene.address));
            ++stats.covered;
#if LAB_CHECKPOINT >= 4
            const auto reference = referenceUvFromRay(scene, {sample.x + 0.5, sample.y + 0.5}, viewport);
            if (reference) {
                stats.maximumError = std::max(stats.maximumError, uvDistance(affineUv, *reference));
            }
            const int selectedX = viewport.left + int(std::floor(scene.sample.x * viewport.width));
            const int selectedY = viewport.top + int(std::floor(scene.sample.y * viewport.height));
            if (sample.x == selectedX && sample.y == selectedY && reference) {
                auto& inspection = stats.inspection;
                inspection.covered = true;
                inspection.affineUv = affineUv;
                inspection.referenceUv = *reference;
                inspection.weights = {sample.barycentric.a, sample.barycentric.b, sample.barycentric.c};
                inspection.texel = nearestTexelIndex(texture, selectedUv, scene.address);
#if LAB_CHECKPOINT >= 5
                inspection.denominator = reciprocalDepthDenominator(triangle, sample.barycentric);
#endif
#if LAB_CHECKPOINT >= 6
                inspection.correctedUv = *perspectiveUv;
#endif
            }
#endif
        });
    }
}
#endif

inline void drawGrid(Framebuffer& image, Viewport viewport) {
#if LAB_CHECKPOINT >= 1
    const auto line = [&](Vec3 a, Vec3 b) {
        const auto p = projectVertex({a, {}}, viewport);
        const auto q = projectVertex({b, {}}, viewport);
        if (p && q) {
            drawLine(image, p->position, q->position, {28, 39, 60}, viewport);
        }
    };
    for (int i = -6; i <= 6; ++i) {
        line({double(i), -1.5, 2}, {double(i), -1.5, 14});
    }
    for (int z = 2; z <= 14; z += 2) {
        line({-6, -1.5, double(z)}, {6, -1.5, double(z)});
    }
#else
    (void)image;
    (void)viewport;
#endif
}

inline RenderStats renderScene(Framebuffer& image, const Scene& scene) {
    std::fill(image.pixels.begin(), image.pixels.end(), packColor({9, 15, 29}));
    RenderStats stats;
    (void)scene;
#if LAB_CHECKPOINT >= 1
    const auto quad = makeQuad(scene.yaw, scene.pitch, scene.distance);
    const auto panels = viewports(scene, image.width, image.height);
    for (std::size_t panel = 0; panel < panels.size(); ++panel) {
        const Viewport viewport = panels[panel];
        drawGrid(image, viewport);
#if LAB_CHECKPOINT >= 3
        static const Texture2D checker = makeCheckerTexture();
        bool corrected = scene.corrected;
        if (scene.compare) {
            corrected = panel == 1;
        }
        for (std::size_t face = 0; face < quad.faces.size(); ++face) {
            renderTexturedTriangle(quadTriangle(quad, face), viewport, scene, corrected, checker, stats, [&](RasterSample sample, Vec2, Color color) {
                putPixel(image, sample.x, sample.y, color);
            });
        }
#endif
        if (scene.debug) {
            for (const auto& face : quad.faces) {
                for (std::size_t edge = 0; edge < face.size(); ++edge) {
                    const auto a = projectVertex(quad.vertices[face[edge]], viewport);
                    const auto b = projectVertex(quad.vertices[face[(edge + 1) % face.size()]], viewport);
                    if (a && b) {
                        drawLine(image, a->position, b->position, {60, 220, 170}, viewport);
                    }
                }
            }
        }
        if (scene.debug && stats.inspection.covered) {
            const double x = viewport.left + std::floor(scene.sample.x * viewport.width) + 0.5;
            const double y = viewport.top + std::floor(scene.sample.y * viewport.height) + 0.5;
            drawLine(image, {x - 5, y}, {x + 5, y}, {255, 110, 90}, viewport);
            drawLine(image, {x, y - 5}, {x, y + 5}, {255, 110, 90}, viewport);
        }
    }
#endif
#if LAB_CHECKPOINT == 2
    const auto checker = makeCheckerTexture();
    for (int y = 0; y < 160; ++y) {
        for (int x = 0; x < 160; ++x) {
            putPixel(image, image.width - 180 + x, 20 + y, sampleNearest(checker, {double(x) / 160, double(y) / 160}, scene.address));
        }
    }
    const auto selected = nearestTexelIndex(checker, scene.sampleUv, scene.address);
    const double markerX = image.width - 180 + (selected[0] + 0.5) * 160 / checker.width;
    const double markerY = 20 + (selected[1] + 0.5) * 160 / checker.height;
    drawLine(image, {markerX - 5, markerY}, {markerX + 5, markerY}, {255, 110, 90});
    drawLine(image, {markerX, markerY - 5}, {markerX, markerY + 5}, {255, 110, 90});
#endif
    return stats;
}
} // namespace lab
