#pragma once
// Mỗi visible point được chiếu thật; không lấy mẫu trước khi đo query/culling.
#include "framebuffer.hpp"
#include "survey/scene.hpp"

namespace survey {
inline std::uint32_t pointColor(Vec3 p, bool selected, double depth) {
    if (selected) {
        return 0xf3c763ffU;
    }
    const double height = std::clamp(p.y / 8.0, 0.0, 1.0);
    const double cue = std::clamp(1.0 - depth / 150.0, 0.3, 1.0);
    const auto red = std::uint32_t((65 + 170 * height) * cue);
    const auto green = std::uint32_t((185 - 65 * height) * cue);
    const auto blue = std::uint32_t((210 - 100 * height) * cue);
    return (red << 24) | (green << 16) | (blue << 8) | 255U;
}

// [snippet:renderPoints]
inline void renderPoints(Scene& scene, Framebuffer& image) {
    const auto start = Clock::now();
    image.clear();
    const Lens lens = makeLens(scene.camera, image.width, image.height);
    std::vector<bool> selected(scene.points.size(), false);
    for (auto index : scene.selected.indices) {
        selected[index] = true;
    }
    scene.drawn = 0;
    for (auto index : scene.visible.indices) {
        const Point& point = scene.points[index];
        const Projection projected = project(point.position, lens);
        if (!projected.visible) {
            continue;
        }
        ++scene.drawn;
        const auto color = pointColor(point.position, selected[index], projected.depth);
        const int x = std::clamp(int(projected.x), 0, image.width - 1);
        const int y = std::clamp(int(projected.y), 0, image.height - 1);
        image.plot(x, y, projected.depth, point.id, color);
        if (selected[index]) {
            image.plot(x + 1, y, projected.depth, point.id, color);
            image.plot(x, y + 1, projected.depth, point.id, color);
        }
    }
    scene.renderMilliseconds = elapsedMs(start);
}

// [/snippet:renderPoints]

inline void renderOverlay(const Scene& scene, Framebuffer& image) {
    const Lens lens = makeLens(scene.camera, image.width, image.height);
    if (scene.selectionEnabled) {
        if (scene.region.shape == Shape::Box) {
            wireBox(image, lens, around(scene.region.center, scene.region.half), 0xf3c763ffU);
        } else {
            for (int axis = 0; axis < 3; ++axis) {
                for (int step = 0; step < 64; ++step) {
                    const double a = double(step) * 6.283185307179586 / 64;
                    const double b = double(step + 1) * 6.283185307179586 / 64;
                    Vec3 first{std::cos(a), std::sin(a), 0};
                    Vec3 second{std::cos(b), std::sin(b), 0};
                    if (axis == 1) {
                        first = {first.x, 0, first.y};
                        second = {second.x, 0, second.y};
                    }
                    if (axis == 2) {
                        first = {0, first.x, first.y};
                        second = {0, second.x, second.y};
                    }
                    segment(image, lens, scene.region.center + first * scene.region.radius, scene.region.center + second * scene.region.radius, 0xf3c763ffU);
                }
            }
        }
    }
    if (scene.debug) {
        std::size_t drawn = 0;
        for (auto index : scene.visible.visited) {
            if (++drawn > 2048) {
                break;
            }
            wireBox(image, lens, scene.tree.nodes[index].bounds, 0x46706dffU);
        }
        for (auto index : scene.visible.pruned) {
            if (++drawn > 2048) {
                break;
            }
            wireBox(image, lens, scene.tree.nodes[index].bounds, 0x884750ffU);
        }
    }
}
} // namespace survey
