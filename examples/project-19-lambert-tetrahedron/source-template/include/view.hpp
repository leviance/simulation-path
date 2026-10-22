#pragma once
#include "render.hpp"

namespace lab {
// Clip đoạn thẳng vào viewport trước Bresenham: không lặp hàng triệu pixel ngoài màn hình.
inline void screenLine(Framebuffer& image, Vec2 a, Vec2 b, int viewHeight, std::uint32_t color) {
    const double dx = b.x - a.x, dy = b.y - a.y;
    double enter = 0.0, leave = 1.0;
    const auto clip = [&](double p, double q) {
        if (p == 0) {
            return q >= 0;
        }
        const double t = q / p;
        if (p < 0) {
            enter = std::max(enter, t);
        } else {
            leave = std::min(leave, t);
        }
        return enter <= leave;
    };
    if (!clip(-dx, a.x) || !clip(dx, image.width - 1 - a.x) || !clip(-dy, a.y) || !clip(dy, viewHeight - 1 - a.y)) {
        return;
    }
    const Vec2 first{a.x + enter * dx, a.y + enter * dy}, last{a.x + leave * dx, a.y + leave * dy};
    drawLine(image, int(std::lround(first.x)), int(std::lround(first.y)), int(std::lround(last.x)), int(std::lround(last.y)), color);
}

inline void worldLine(Framebuffer& image, const Scene& scene, Vec3 a, Vec3 b, std::uint32_t color) {
    a = worldToView(a, scene.camera);
    b = worldToView(b, scene.camera);
    if (a.z < 0.5 && b.z < 0.5) {
        return;
    }
    if ((a.z < 0.5) != (b.z < 0.5)) {
        const auto hit = intersectNearPlane(a, b, 0.5);
        if (!hit) {
            return;
        }
        if (a.z < 0.5) {
            a = *hit;
        } else {
            b = *hit;
        }
    }
    const int h = viewportHeight(scene, image.height);
    const auto p = projectVertex(a, image.width, h), q = projectVertex(b, image.width, h);
    if (p && q) {
        screenLine(image, {p->x, p->y}, {q->x, q->y}, h, color);
    }
}

inline void arrow(Framebuffer& image, const Scene& scene, Vec3 start, Vec3 end, std::uint32_t color) {
    worldLine(image, scene, start, end, color);
    const int h = viewportHeight(scene, image.height);
    const auto a = projectVertex(worldToView(start, scene.camera), image.width, h);
    const auto b = projectVertex(worldToView(end, scene.camera), image.width, h);
    if (!a || !b) {
        return;
    }
    const double dx = b->x - a->x, dy = b->y - a->y, size = std::hypot(dx, dy);
    if (size < 1) {
        return;
    }
    const double ux = dx / size, uy = dy / size;
    screenLine(image, {b->x, b->y}, {b->x - ux * 10 - uy * 5, b->y - uy * 10 + ux * 5}, h, color);
    screenLine(image, {b->x, b->y}, {b->x - ux * 10 + uy * 5, b->y - uy * 10 - ux * 5}, h, color);
}

inline FrameStats renderScene(Framebuffer& image, const Scene& scene) {
    image.clear();
    // Grid là depth cue, không phải texture hoặc bóng đổ.
    for (int i = -4; i <= 4; ++i) {
        worldLine(image, scene, {double(i), -1.45, -4}, {double(i), -1.45, 4}, 0x293853FFu);
        worldLine(image, scene, {-4, -1.45, double(i)}, {4, -1.45, double(i)}, 0x293853FFu);
    }
    FrameStats stats;
#if LAB_CHECKPOINT >= 1
    stats = renderCube(image, scene);
#endif
#if LAB_CHECKPOINT >= 2
    if (scene.debug && scene.normals) {
        const auto& selected = stats.faces[scene.selectedFace];
        const Vec3 center = faceCentroid(selected.world);
        arrow(image, scene, center, add(center, scale(selected.normal, 0.85)), 0xFFFFFFFFu);
#if LAB_CHECKPOINT >= 3
        const auto light = orbitLight(scene.lightAzimuth, scene.lightElevation);
        arrow(image, scene, center, add(center, scale(light.surfaceToLight, 1.5)), 0xFFDB6EFFu);
#endif
    }
#endif
#if LAB_CHECKPOINT >= 3
    // Dấu đèn là ký hiệu hướng trên một quỹ đạo, KHÔNG có distance attenuation.
    const Vec3 marker = scale(orbitLight(scene.lightAzimuth, scene.lightElevation).surfaceToLight, 2.2);
    worldLine(image, scene, add(marker, {-0.12, 0, 0}), add(marker, {0.12, 0, 0}), 0xFFDB6EFFu);
    worldLine(image, scene, add(marker, {0, -0.12, 0}), add(marker, {0, 0.12, 0}), 0xFFDB6EFFu);
#endif
    return stats;
}
} // namespace lab
