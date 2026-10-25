#pragma once
// Gesture chỉ giữ preview. Document chỉ thay đổi khi thao tác được xác nhận.
#include "benchmark.hpp"
#include "document.hpp"

namespace maplab {
enum class Tool {
    Pan,
    Select,
    Move,
    Add
};

struct Gesture {
    Tool tool = Tool::Pan;
    Point startScreen{};
    Point startWorld{};
    Point currentWorld{};
    Camera camera{};
    Point offset{};
    std::optional<Box> bounds;
    std::unordered_set<std::uint32_t> previousSelection;
    bool additive{};
};

struct Scene {
    Document document{0};
    std::size_t initialCount = 100000;
    std::uint32_t seed = 1;
    Layout layout = Layout::Districts;
    Camera camera{};
    Point size{960, 600};
    Tool tool = Tool::Pan;
    Kind kind = Kind::House;
    bool debug = false;
    std::optional<Gesture> gesture;
    Query visible{};
    std::optional<Query> preview;
    std::size_t drawn{};
    ValidationJob validation{};
    BenchmarkJob benchmark{};

    Scene() {
#if LAB_CHECKPOINT >= 3
        tool = Tool::Select;
#endif
    }
};

inline void refreshScene(Scene& scene) {
    if ((scene.validation.tree && scene.validation.revision != scene.document.tree.revision) || (scene.benchmark.tree && scene.benchmark.revision != scene.document.tree.revision)) {
        scene.validation = {};
        scene.benchmark = {};
    }
    const Box view = viewport(scene.camera, scene.size);
#if LAB_CHECKPOINT >= 6
    scene.visible = scene.document.query(view);
#else
    scene.visible = queryBrute(scene.document.tree, view);
#endif
    // Chỉ sort phục vụ paint order, nằm ngoài timing của query.
    std::sort(scene.visible.ids.begin(), scene.visible.ids.end());
    scene.preview.reset();
#if LAB_CHECKPOINT >= 8
    if (scene.gesture && scene.gesture->tool == Tool::Move) {
        const Point inverse{-scene.gesture->offset.x, -scene.gesture->offset.y};
        Query preview = scene.document.query(translate(view, inverse));
        std::vector<std::uint32_t> selected;
        for (std::uint32_t id : preview.ids) {
            if (scene.document.selection.contains(id)) {
                selected.push_back(id);
            }
        }
        std::sort(selected.begin(), selected.end());
        preview.ids = std::move(selected);
        scene.preview = std::move(preview);
    }
#endif
}

inline void cancelGesture(Scene& scene, bool restore = true) {
    if (scene.gesture && scene.gesture->tool == Tool::Move && restore) {
        scene.document.selection = scene.gesture->previousSelection;
    }
    scene.gesture.reset();
    scene.preview.reset();
}

inline void resetScene(Scene& scene) {
    cancelGesture(scene);
    scene.validation = {};
    scene.benchmark = {};
    scene.document = Document(scene.initialCount, scene.seed, scene.layout);
    scene.camera = initialCamera(scene.initialCount, scene.layout);
    refreshScene(scene);
}

inline void stopWork(Scene& scene) {
    cancelGesture(scene);
    scene.validation.active = false;
    scene.benchmark.active = false;
}

inline bool workActive(const Scene& scene) {
    return scene.validation.active || scene.benchmark.active;
}

inline void advanceWork(Scene& scene) {
#if LAB_CHECKPOINT >= 9
    if (scene.validation.active) {
        tickValidation(scene.validation);
        return;
    }
#endif
#if LAB_CHECKPOINT >= 10
    if (scene.benchmark.active) {
        tickBenchmark(scene.benchmark);
    }
#endif
#if LAB_CHECKPOINT < 9
    static_cast<void>(scene);
#endif
}

#if LAB_CHECKPOINT >= 2
inline void beginGesture(Scene& scene, Point screen, bool additive) {
    if (scene.gesture) {
        return;
    }
    const auto world = screenToWorld(screen, scene.camera, scene.size);
    Gesture gesture{};
    gesture.tool = scene.tool;
    gesture.startScreen = screen;
    gesture.startWorld = world;
    gesture.currentWorld = world;
    gesture.camera = scene.camera;
    gesture.additive = additive;
#if LAB_CHECKPOINT >= 8
    if (scene.tool == Tool::Move) {
        gesture.previousSelection = scene.document.selection;
        const auto hit = scene.document.topmost(world);
        if (!hit) {
            return;
        }
        if (!scene.document.selection.contains(*hit)) {
            scene.document.selection.clear();
            scene.document.selection.insert(*hit);
        }
        gesture.bounds = scene.document.selectionBounds();
    }
#endif
    scene.gesture = std::move(gesture);
    refreshScene(scene);
}

// [snippet:moveGesture]
inline void moveGesture(Scene& scene, Point screen) {
    if (!scene.gesture) {
        return;
    }
    auto& gesture = *scene.gesture;
    if (gesture.tool == Tool::Pan) {
        scene.camera = gesture.camera;
        scene.camera.x -= (screen.x - gesture.startScreen.x) / gesture.camera.zoom;
        scene.camera.y -= (screen.y - gesture.startScreen.y) / gesture.camera.zoom;
    }
    const auto world = screenToWorld(screen, scene.camera, scene.size);
    gesture.currentWorld = world;
    gesture.offset = {world.x - gesture.startWorld.x, world.y - gesture.startWorld.y};
    refreshScene(scene);
}

// [/snippet:moveGesture]

// [snippet:endGesture]
inline void endGesture(Scene& scene, Point screen) {
    if (!scene.gesture) {
        return;
    }
    moveGesture(scene, screen);
#if LAB_CHECKPOINT >= 3
    const auto& gesture = *scene.gesture;
#endif
#if LAB_CHECKPOINT >= 3
    if (gesture.tool == Tool::Select) {
        const auto distance = std::hypot(screen.x - gesture.startScreen.x, screen.y - gesture.startScreen.y);
        if (distance <= 3) {
            scene.document.pick(gesture.currentWorld, gesture.additive);
        } else {
            scene.document.selectRegion(gesture.startWorld, gesture.currentWorld, gesture.additive);
        }
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (gesture.tool == Tool::Add) {
        scene.document.addObject(gesture.currentWorld, scene.kind);
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (gesture.tool == Tool::Move) {
        scene.document.moveSelection(gesture.offset);
    }
#endif
    cancelGesture(scene, false);
    refreshScene(scene);
}

// [/snippet:endGesture]
#endif
} // namespace maplab
