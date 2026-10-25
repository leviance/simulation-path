#pragma once
// Các phím gọi cùng API của editor, không sửa trực tiếp box và bỏ quên index.
#include "editor/scene.hpp"
#include <SDL3/SDL.h>

namespace maplab {
inline const char* toolName(Tool tool) {
    if (tool == Tool::Select)
        return "Select";
    if (tool == Tool::Move)
        return "Move group";
    if (tool == Tool::Add)
        return "Add";
    return "Pan";
}

inline void applyKey(Scene& scene, SDL_Keycode key, bool shift) {
    stopWork(scene);
    if (key == SDLK_R) {
        resetScene(scene);
    }
    if (key == SDLK_P) {
        ++scene.seed;
        resetScene(scene);
    }
    if (key == SDLK_F2) {
        scene.initialCount = 100000;
        if (scene.document.tree.objects.size() == 100000) {
            scene.initialCount = 10000;
        }
        resetScene(scene);
    }
    if (key == SDLK_L) {
        if (scene.layout == Layout::Districts)
            scene.layout = Layout::Clustered;
        else if (scene.layout == Layout::Clustered)
            scene.layout = Layout::Large;
        else
            scene.layout = Layout::Districts;
        resetScene(scene);
    }
#if LAB_CHECKPOINT >= 2
    if (key == SDLK_2)
        scene.tool = Tool::Pan;
    if (key == SDLK_HOME)
        scene.camera = initialCamera(scene.initialCount, scene.layout);
    if (key == SDLK_PLUS || key == SDLK_EQUALS)
        zoomAt(scene.camera, {scene.size.x / 2, scene.size.y / 2}, scene.size, scene.camera.zoom * 1.25);
    if (key == SDLK_MINUS)
        zoomAt(scene.camera, {scene.size.x / 2, scene.size.y / 2}, scene.size, scene.camera.zoom * 0.8);
    Point direction{};
    if (key == SDLK_LEFT)
        direction.x = -1;
    if (key == SDLK_RIGHT)
        direction.x = 1;
    if (key == SDLK_UP)
        direction.y = -1;
    if (key == SDLK_DOWN)
        direction.y = 1;
    if (direction.x != 0 || direction.y != 0) {
#if LAB_CHECKPOINT >= 7
        if (shift)
            scene.document.moveSelection({direction.x * 8, direction.y * 8});
        else {
#endif
            scene.camera.x += direction.x * 64 / scene.camera.zoom;
            scene.camera.y += direction.y * 64 / scene.camera.zoom;
#if LAB_CHECKPOINT >= 7
        }
#endif
    }
#endif
#if LAB_CHECKPOINT < 7
    static_cast<void>(shift);
#endif
#if LAB_CHECKPOINT >= 3
    if (key == SDLK_1)
        scene.tool = Tool::Select;
    if (key == SDLK_C) {
        const Box view = viewport(scene.camera, scene.size);
        scene.document.selectRegion({view.x, view.y}, {right(view), bottom(view)});
    }
#endif
#if LAB_CHECKPOINT >= 4
    if (key == SDLK_F)
        scene.debug = !scene.debug;
    if (key == SDLK_LEFTBRACKET)
        scene.document.rebuild(std::max(std::size_t{4}, scene.document.tree.config.capacity / 2));
    if (key == SDLK_RIGHTBRACKET)
        scene.document.rebuild(std::min(std::size_t{64}, scene.document.tree.config.capacity * 2));
#endif
#if LAB_CHECKPOINT >= 6
    if (key == SDLK_M) {
        scene.document.useTree = !scene.document.useTree;
        scene.document.lastQuery.reset();
    }
#endif
#if LAB_CHECKPOINT >= 7
    if (key == SDLK_4)
        scene.tool = Tool::Add;
    if (key == SDLK_DELETE || key == SDLK_BACKSPACE)
        scene.document.deleteSelection();
    if (key == SDLK_A)
        scene.document.addObject({scene.camera.x, scene.camera.y}, scene.kind);
    if (key == SDLK_T) {
        if (scene.kind == Kind::House)
            scene.kind = Kind::Tree;
        else if (scene.kind == Kind::Tree)
            scene.kind = Kind::Park;
        else
            scene.kind = Kind::House;
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (key == SDLK_3)
        scene.tool = Tool::Move;
#endif
#if LAB_CHECKPOINT >= 9
    if (key == SDLK_V) {
        scene.validation = createValidation(scene.document.tree, viewport(scene.camera, scene.size));
        if (scene.document.selectionBox) {
            scene.validation.boxes.push_back(*scene.document.selectionBox);
        }
    }
#endif
#if LAB_CHECKPOINT >= 10
    if (key == SDLK_B)
        scene.benchmark = createBenchmark(scene.document.tree, viewport(scene.camera, scene.size));
#endif
    refreshScene(scene);
}
} // namespace maplab
