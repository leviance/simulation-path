#pragma once
#include "app.hpp"

namespace lab {
#if LAB_CHECKPOINT >= 6
inline Key translateKey(SDL_Keycode key) {
    if (key == SDLK_TAB)
        return Key::Tab;
    if (key == SDLK_RETURN)
        return Key::Enter;
    if (key == SDLK_SPACE)
        return Key::Space;
    if (key == SDLK_LEFT)
        return Key::Left;
    if (key == SDLK_RIGHT)
        return Key::Right;
    if (key == SDLK_HOME)
        return Key::Home;
    if (key == SDLK_END)
        return Key::End;
    if (key == SDLK_ESCAPE)
        return Key::Escape;
    return Key::Other;
}
#endif

// Hàm trả false khi cần đóng window. Capture chỉ tồn tại trong một gesture.
inline bool handle(SDL_Renderer* renderer, App& app, SDL_Event event) {
    if (event.type == SDL_EVENT_QUIT)
        return false;
    if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_RESIZED) {
        suspend(app);
        SDL_CaptureMouse(false);
    }
    require(SDL_ConvertEventToRenderCoordinates(renderer, &event));
#if LAB_CHECKPOINT >= 5
    if (event.type == SDL_EVENT_MOUSE_MOTION)
        pointerMove(app.built.tree, app.model, app.ui, {event.motion.x, event.motion.y});
    if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
        const Point p{event.button.x, event.button.y};
        const bool consumed = pointerDown(app.built.tree, app.model, app.ui, p);
        if (!consumed && contains({24, 24, 616, 492}, p)) {
            app.model.y = std::clamp(p.y, 48.0, 446.0);
            app.model.velocity = 0;
            app.model.accumulator = 0;
            ++app.model.scenePresses;
            ++app.model.clockRevision;
        }
        if (app.ui.active != 0 && !SDL_CaptureMouse(true)) {
            cancel(app.ui);
            app.message = "Capture unavailable; gesture cancelled";
        }
    }
    if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
        pointerUp(app.built.tree, app.model, app.ui, {event.button.x, event.button.y});
        SDL_CaptureMouse(false);
    }
#elif LAB_CHECKPOINT >= 4
    if (event.type == SDL_EVENT_MOUSE_MOTION)
        app.ui.hot = hitTest(app.built.tree, {event.motion.x, event.motion.y});
#endif
    if (event.type == SDL_EVENT_KEY_DOWN) {
        bool consumed = false;
#if LAB_CHECKPOINT >= 6
        const bool shiftArrow = (event.key.mod & SDL_KMOD_SHIFT) != 0 && (event.key.key == SDLK_LEFT || event.key.key == SDLK_RIGHT || event.key.key == SDLK_UP || event.key.key == SDLK_DOWN);
        if (!shiftArrow)
            consumed = keyDown(app.built.tree, app.model, app.ui, translateKey(event.key.key), (event.key.mod & SDL_KMOD_SHIFT) != 0, event.key.repeat);
#endif
        if (event.key.key == SDLK_ESCAPE) {
            cancel(app.ui);
            SDL_CaptureMouse(false);
            consumed = true;
        }
        if (event.key.key == SDLK_SPACE && !consumed && !event.key.repeat && app.ui.active == 0)
            setPaused(app.model, !app.model.paused);
        if (event.key.key == SDLK_N && !event.key.repeat && app.model.paused && app.ui.active == 0)
            stepPhysics(app.model);
        if (event.key.key == SDLK_R && !event.key.repeat) {
            cancel(app.ui);
            resetSimulation(app.model);
        }
#if LAB_CHECKPOINT >= 1
        if (event.key.key == SDLK_T && !event.key.repeat)
            rebuild(app, 0);
#endif
#if LAB_CHECKPOINT >= 2
        if (event.key.key == SDLK_P && !event.key.repeat) {
            int preset = (app.preset + 1) % 4;
#if LAB_CHECKPOINT < 4
            if (preset == 2)
                preset = 3;
#endif
#if LAB_CHECKPOINT < 3
            if (preset == 1)
                preset = 3;
#endif
            rebuild(app, preset);
        }
        if ((event.key.mod & SDL_KMOD_SHIFT) != 0) {
            double dx = 0, dy = 0;
            if (event.key.key == SDLK_LEFT)
                dx = -4;
            if (event.key.key == SDLK_RIGHT)
                dx = 4;
            if (event.key.key == SDLK_UP)
                dy = -4;
            if (event.key.key == SDLK_DOWN)
                dy = 4;
            if (dx != 0 || dy != 0) {
                cancel(app.ui);
                movePanel(app.built.tree, dx, dy);
            }
        }
#endif
#if LAB_CHECKPOINT >= 7
        if (!event.key.repeat) {
            Tree& tree = app.built.tree;
            Widget* group = find(*tree.root, app.built.group);
            if (event.key.key == SDLK_H && group)
                setVisible(tree, group->id, !group->visible, app.ui);
            if (event.key.key == SDLK_E && group)
                setEnabled(tree, group->id, !group->enabled, app.ui);
            if (event.key.key == SDLK_D)
                removeSubtree(tree, app.built.group, app.ui);
            if (event.key.key == SDLK_A && app.extraLabels < 4) {
                add(tree, tree.root->id, Kind::Label, {24, 310.0 + 20 * app.extraLabels, 224, 16}, "Added Label");
                ++app.extraLabels;
            }
        }
#endif
#if LAB_CHECKPOINT >= 8
        if (event.key.key == SDLK_F1 && !event.key.repeat) {
            app.message = "PASS nodes=" + std::to_string(audit(app.built.tree, app.ui));
        }
#endif
        if (app.ui.active == 0)
            SDL_CaptureMouse(false);
    }
    return true;
}
} // namespace lab
