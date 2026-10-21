#pragma once
#include "space.hpp"

namespace lab {
constexpr std::size_t kAllCandidates = std::numeric_limits<std::size_t>::max();

// Types có sẵn, nhưng các nhánh render chỉ gọi thuật toán đã học.
struct Scene {
    Triangle2 triangle{{550.0, 108.0}, {742.0, 492.0}, {358.0, 492.0}};
    Triangle2 second{};
    std::array<Vec3, 3> world{{{-1.4, 1.2, 4.0}, {1.6, -1.0, 5.5}, {-1.4, -1.0, 6.5}}};
    std::array<Color, 3> colors{{{255, 0, 0}, {0, 255, 0}, {0, 0, 255}}};
    Camera camera{};
    FillRule rule = FillRule::TopLeft;
    Vec2 sample{550.5, 300.5};
    std::size_t candidateLimit = kAllCandidates;
    int selected = 0;
    bool shared = false;
    bool debug = true;
    bool barycentricColor = true;
    bool paused = true;
#if LAB_CHECKPOINT >= 8
    bool worldMode = true;
#else
    bool worldMode = false;
#endif
};

inline int viewportHeight(const Scene& scene) {
    if (!scene.debug) {
        return 800;
    }
    return 600;
}

inline std::optional<Triangle2> screenTriangle(const Scene& scene) {
    if (scene.worldMode) {
        return projectTriangle(scene.world, scene.camera, 1100, viewportHeight(scene));
    }
    return scene.triangle;
}

inline void resetScan(Scene& scene) {
    scene.paused = true;
    scene.candidateLimit = kAllCandidates;
}

inline void applyPreset(Scene& scene, int preset) {
    scene = {};
    if (preset == 2) {
        std::swap(scene.triangle.b, scene.triangle.c);
        std::swap(scene.world[1], scene.world[2]);
        std::swap(scene.colors[1], scene.colors[2]);
    }
    if (preset == 3) {
        scene.triangle = {{350.0, 200.0}, {550.0, 300.0}, {750.0, 400.0}};
        scene.world = {{{-1.0, -1.0, 5.0}, {0.0, 0.0, 5.0}, {1.0, 1.0, 5.0}}};
    }
    if (preset == 4) {
        scene.worldMode = false;
        scene.triangle = {{-100.0, 180.0}, {700.0, -100.0}, {650.0, 560.0}};
    }
    if (preset == 5) {
        scene.worldMode = false;
        scene.shared = true;
        scene.triangle = {{350.0, 100.0}, {750.0, 100.0}, {350.0, 500.0}};
        scene.second = {{750.0, 100.0}, {750.0, 500.0}, {350.0, 500.0}};
    }
}

// Controller không phụ thuộc SDL: tests dùng đúng hit-test của ứng dụng.
struct DragState {
    int index = -1;
    Vec2 offset{};
    double depth{};
};
#if LAB_CHECKPOINT >= 1
inline Vec2& editableVertex(Triangle2& triangle, int index) {
    if (index == 0) {
        return triangle.a;
    }
    if (index == 1) {
        return triangle.b;
    }
    return triangle.c;
}

inline bool beginDrag(const Scene& scene, Vec2 mouse, DragState& drag) {
    const auto triangle = screenTriangle(scene);
    if (!triangle || !finite(mouse)) {
        return false;
    }
    for (int i = 0; i < 3; ++i) {
        const Vec2 point = vertexAt(*triangle, i);
        if (std::hypot(mouse.x - point.x, mouse.y - point.y) <= 18.0) {
            drag.index = i;
            drag.offset = {mouse.x - point.x, mouse.y - point.y};
            drag.depth = scene.world[static_cast<std::size_t>(i)].z - scene.camera.position.z;
            return true;
        }
    }
    return false;
}

inline void updateDrag(Scene& scene, const DragState& drag, Vec2 mouse) {
    if (drag.index < 0 || drag.index > 2 || !finite(mouse)) {
        return;
    }
    const Vec2 target{mouse.x - drag.offset.x, mouse.y - drag.offset.y};
    if (scene.worldMode) {
        const auto point = worldAtScreen(target, drag.depth, scene.camera, 1100, viewportHeight(scene));
        if (point) {
            scene.world[static_cast<std::size_t>(drag.index)] = {std::clamp(point->x, -6.0, 6.0), std::clamp(point->y, -4.0, 4.0), point->z};
        }
    } else {
        editableVertex(scene.triangle, drag.index) = {std::clamp(target.x, -200.0, 1300.0), std::clamp(target.y, -200.0, 1000.0)};
        scene.shared = false;
    }
    scene.selected = drag.index;
    resetScan(scene);
}
#endif
} // namespace lab
