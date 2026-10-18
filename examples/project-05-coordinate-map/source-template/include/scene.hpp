#pragma once
#include "lab.hpp"
#include <vector>

namespace lab {
// Tất cả điểm được lưu bằng world coordinate, không lưu vị trí sau khi chiếu.
struct Scene {
#if LAB_CHECKPOINT >= 1
    Camera2D camera;
    std::vector<Vec2> points{{2.0, 1.0}};
#endif
#if LAB_CHECKPOINT >= 3
    Vec2 cursorScreen{480.0, 270.0};
#endif
#if LAB_CHECKPOINT >= 4
    bool panning{};
    Vec2 previousScreen{};
#endif
#if LAB_CHECKPOINT >= 6
    int selected{-1};
    bool draggingPoint{};
    Vec2 grabOffset{};
#endif
};

#if LAB_CHECKPOINT >= 4
inline void cancelDrag(Scene& scene) {
    scene.panning = false;
#if LAB_CHECKPOINT >= 6
    scene.draggingPoint = false;
#endif
}

#endif
#if LAB_CHECKPOINT >= 6
// Bán kính chọn tính bằng pixel nên không bị nhỏ lại khi zoom ra xa.
inline int hitPoint(const Scene& scene, Vec2 screen) {
    for (int index = static_cast<int>(scene.points.size()) - 1; index >= 0; --index) {
        if (distance(scene.camera.worldToScreen(scene.points[index]), screen) <= 10.0) {
            return index;
        }
    }
    return -1;
}

inline void beginPointDrag(Scene& scene, Vec2 screen) {
    cancelDrag(scene);
    if (!finite(screen)) {
        return;
    }
    scene.selected = hitPoint(scene, screen);
    const Vec2 world = scene.camera.screenToWorld(screen);
    if (scene.selected < 0) {
        if (scene.points.size() >= 256) {
            return;
        }
        scene.points.push_back(world);
        scene.selected = static_cast<int>(scene.points.size()) - 1;
    }
    const Vec2 point = scene.points[scene.selected];
    scene.grabOffset = {point.x - world.x, point.y - world.y};
    scene.draggingPoint = true;
}

inline void movePoint(Scene& scene, Vec2 screen) {
    if (!scene.draggingPoint || scene.selected < 0 || !finite(screen)) {
        return;
    }
    const Vec2 world = scene.camera.screenToWorld(screen);
    scene.points[scene.selected] = {world.x + scene.grabOffset.x, world.y + scene.grabOffset.y};
}

inline void eraseSelected(Scene& scene) {
    cancelDrag(scene);
    if (scene.selected >= 0) {
        scene.points.erase(scene.points.begin() + scene.selected);
        scene.selected = -1;
    }
}
#endif
} // namespace lab
