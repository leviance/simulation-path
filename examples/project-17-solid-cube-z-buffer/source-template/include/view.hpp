#pragma once
#include "scene.hpp"

namespace lab {
// Buffers được cấp phát một lần; resize window chỉ thay letterbox.
struct RenderTargets {
    Framebuffer image{};
    DepthBuffer depth{Framebuffer::width, Framebuffer::height};
    PixelProbe probe{};

    RenderTargets() {
        probe.traces.reserve(12);
    }
};

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

inline void drawWorldGrid(Framebuffer& image, const Scene& scene) {
    const auto line = [&](Vec3 a, Vec3 b) {
        a.x -= scene.camera.x;
        a.z -= scene.camera.z;
        b.x -= scene.camera.x;
        b.z -= scene.camera.z;
        const auto p = projectVertex(a, Framebuffer::width, viewportHeight(scene));
        const auto q = projectVertex(b, Framebuffer::width, viewportHeight(scene));
        if (p.valid && q.valid) {
            screenLine(image, {p.x, p.y}, {q.x, q.y}, viewportHeight(scene), kGrid);
        }
    };
    for (int x = -6; x <= 6; ++x) {
        line({double(x), -1.9, 2.0}, {double(x), -1.9, 9.0});
    }
    for (int z = 2; z <= 9; ++z) {
        line({-6.0, -1.9, double(z)}, {6.0, -1.9, double(z)});
    }
}

inline RenderStats renderScene(RenderTargets& targets, const Scene& scene) {
    targets.image.clear(kBackground);
    targets.probe.x = scene.inspectX;
    targets.probe.y = scene.inspectY;
    targets.probe.traces.clear();
#if LAB_CHECKPOINT >= 3
    targets.depth.clear();
#endif
#if LAB_CHECKPOINT >= 9
    drawWorldGrid(targets.image, scene);
#endif
    RenderStats stats{};
#if LAB_CHECKPOINT >= 1
    const CubeMesh mesh = makeCubeMesh();
    stats = renderCube(mesh, Framebuffer::width, viewportHeight(scene), scene.angleX, scene.angleY, scene.reverseOrder, scene.depthEnabled, targets.image.pixels, targets.depth, scene.cullEnabled, scene.camera, &targets.probe);
#endif
#if LAB_CHECKPOINT >= 7
    if (scene.debug && scene.depthView) {
        for (std::size_t i = 0; i < targets.image.pixels.size(); ++i) {
            const auto shade = depthShade(targets.depth.values()[i]);
            targets.image.pixels[i] = packColor({shade, shade, shade, 255});
        }
    }
    if (scene.debug) {
        screenLine(targets.image, {double(scene.inspectX - 4), double(scene.inspectY)}, {double(scene.inspectX + 4), double(scene.inspectY)}, viewportHeight(scene), kWhite);
        screenLine(targets.image, {double(scene.inspectX), double(scene.inspectY - 4)}, {double(scene.inspectX), double(scene.inspectY + 4)}, viewportHeight(scene), kWhite);
    }
#endif
    return stats;
}
} // namespace lab
