#pragma once
#include "app.hpp"

namespace lab {
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

inline bool handle(SDL_Renderer* renderer, App& app, SDL_Event event) {
    if (event.type == SDL_EVENT_QUIT)
        return false;
    LayoutState& state = app.layout;
    if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED || event.type == SDL_EVENT_WINDOW_HIDDEN || event.type == SDL_EVENT_WINDOW_RESIZED) {
        suspend(app);
        SDL_CaptureMouse(false);
#if LAB_CHECKPOINT >= 7
        if (event.type == SDL_EVENT_WINDOW_RESIZED)
            setWidth(state, app.ui, std::clamp(event.window.data1 / 3.0, 220.0, 420.0));
#endif
    }
    // Sự kiện tiếp theo phải đọc Rect mới, không chờ tới draw cuối frame.
    ensureLayout(state, app.ui);
    require(SDL_ConvertEventToRenderCoordinates(renderer, &event));
    Tree& tree = state.scene.tree;
    if (event.type == SDL_EVENT_MOUSE_MOTION)
        pointerMove(tree, app.model, app.ui, {event.motion.x, event.motion.y});
    if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
        pointerDown(tree, app.model, app.ui, {event.button.x, event.button.y});
        if (app.ui.active != 0 && !SDL_CaptureMouse(true)) {
            cancel(app.ui);
            app.message = "Capture unavailable; gesture cancelled";
        }
    }
    if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
        pointerUp(tree, app.model, app.ui, {event.button.x, event.button.y});
        SDL_CaptureMouse(false);
    }
    if (event.type == SDL_EVENT_KEY_DOWN) {
        const bool resizeKey = (event.key.mod & SDL_KMOD_SHIFT) != 0 && (event.key.key == SDLK_LEFT || event.key.key == SDLK_RIGHT);
        bool consumed = false;
        if (!resizeKey)
            consumed = keyDown(tree, app.model, app.ui, translateKey(event.key.key), (event.key.mod & SDL_KMOD_SHIFT) != 0, event.key.repeat);
        if (event.key.key == SDLK_SPACE && !consumed && !event.key.repeat && app.ui.active == 0)
            setPaused(app.model, !app.model.paused);
        if (event.key.key == SDLK_N && !event.key.repeat && app.model.paused && app.ui.active == 0)
            stepPhysics(app.model);
        if (event.key.key == SDLK_R && !event.key.repeat) {
            cancel(app.ui);
            resetSimulation(app.model);
        }
#if LAB_CHECKPOINT >= 2
        if (event.key.key == SDLK_B && !event.key.repeat)
            app.boxes = !app.boxes;
#endif
#if LAB_CHECKPOINT >= 4
        if (!event.key.repeat && (event.key.key == SDLK_LEFTBRACKET || event.key.key == SDLK_RIGHTBRACKET)) {
            const BoxStyle style = state.scene.styles.at(1);
            double gap = style.gap + 2;
            if (event.key.key == SDLK_LEFTBRACKET)
                gap = style.gap - 2;
            setSpacing(state, app.ui, std::clamp(gap, 0.0, 32.0), style.padding.left);
        }
#endif
#if LAB_CHECKPOINT >= 6
        if (!event.key.repeat) {
            if (event.key.key == SDLK_H)
                toggleReset(state, app.ui);
            if (event.key.key == SDLK_A)
                appendLabel(state, app.ui);
            if (event.key.key == SDLK_D)
                removeLabel(state, app.ui);
        }
#endif
#if LAB_CHECKPOINT >= 7
        if (resizeKey) {
            double width = state.width + 20;
            if (event.key.key == SDLK_LEFT)
                width = state.width - 20;
            setWidth(state, app.ui, std::clamp(width, 220.0, 420.0));
        }
#endif
#if LAB_CHECKPOINT >= 8
        if (event.key.key == SDLK_O && !event.key.repeat)
            setOverflow(state, app.ui, !state.overflow);
#endif
        if (event.key.key == SDLK_T && !event.key.repeat) {
            suspend(app);
            app.ui = {};
            app.layout = LayoutState{};
        }
        ensureLayout(state, app.ui);
#if LAB_CHECKPOINT >= 9
        if (event.key.key == SDLK_F1 && !event.key.repeat)
            app.message = "PASS visible=" + std::to_string(auditLayout(state));
#endif
    }
    if (app.ui.active == 0)
        SDL_CaptureMouse(false);
    return true;
}
} // namespace lab
