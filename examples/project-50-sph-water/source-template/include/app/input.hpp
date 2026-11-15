#pragma once
#include "draw.hpp"

namespace tank {
inline void release(App& app) {
    app.dragging = false;
    app.slider = -1;
    SDL_CaptureMouse(false);
}

inline void action(App& app, Action id) {
    if (id == Action::Reset) {
        release(app);
        app.rebuild();
    }
    if (id == Action::Debug)
        app.debug = !app.debug;
    if (id == Action::Scene) {
        release(app);
        app.preset = static_cast<water::Preset>((static_cast<int>(app.preset) + 1) % 4);
        app.rebuild();
    }
#if LAB_CHECKPOINT >= 2
    if (id == Action::Step) {
        app.pause();
        app.oneStep();
        app.requestInspection();
    }
#endif
#if LAB_CHECKPOINT >= 8
    if (id == Action::Pause && app.error.empty()) {
        app.paused = !app.paused;
        app.accumulator = 0;
    }
#endif
#if LAB_CHECKPOINT >= 9
    if (id == Action::Count) {
        release(app);
        if (app.requested == 1000)
            app.requested = 5000;
        else if (app.requested == 5000)
            app.requested = 10000;
        else
            app.requested = 1000;
        app.rebuild();
    }
    if (id == Action::View) {
        app.view = static_cast<View>((static_cast<int>(app.view) + 1) % 5);
        app.dirty = true;
    }
#endif
#if LAB_CHECKPOINT >= 10
    if (id == Action::Pour)
        app.pouring = !app.pouring;
    if (id == Action::Tool) {
        int tool = static_cast<int>(app.tool) + 1;
#if LAB_CHECKPOINT < 11
        if (tool == 1)
            tool = 2;
#endif
        app.tool = static_cast<Tool>(tool % 3);
    }
#endif
#if LAB_CHECKPOINT >= 11
    if (id == Action::Paddle) {
        app.pause();
        app.state.paddle.enabled = !app.state.paddle.enabled;
        app.requestInspection();
    }
#endif
#if LAB_CHECKPOINT >= 12
    if (id == Action::Verify) {
        app.pause();
        app.report = "FAIL";
        if (water::reference().passed)
            app.report = "PASS";
    }
#endif
}

inline void parameter(App& app, int index, float x) {
    app.pause();
    const double t = std::clamp((x - 956) / 300.0, 0.0, 1.0);
#if LAB_CHECKPOINT >= 5
    if (index == 0)
        app.settings.soundSpeed = 12 + 28 * t;
#endif
#if LAB_CHECKPOINT >= 6
    if (index == 1)
        app.settings.alpha = t;
#endif
#if LAB_CHECKPOINT >= 2
    if (index == 2)
        app.settings.gravity = 12 * t;
#endif
    static_cast<void>(index);
    static_cast<void>(t);
    app.requestInspection();
}

inline void key(App& app, SDL_Keycode code) {
    if (code == SDLK_ESCAPE)
        app.running = false;
    if (code == SDLK_SPACE)
        action(app, Action::Pause);
    if (code == SDLK_N)
        action(app, Action::Step);
    if (code == SDLK_R)
        action(app, Action::Reset);
    if (code == SDLK_P)
        action(app, Action::Scene);
    if (code == SDLK_G)
        action(app, Action::Count);
    if (code == SDLK_L)
        action(app, Action::View);
    if (code == SDLK_M)
        action(app, Action::Tool);
    if (code == SDLK_E)
        action(app, Action::Pour);
    if (code == SDLK_O)
        action(app, Action::Paddle);
    if (code == SDLK_V)
        action(app, Action::Verify);
    if (code == SDLK_F1)
        action(app, Action::Debug);
#if LAB_CHECKPOINT >= 5
    if (code == SDLK_C) {
        app.pause();
        app.settings.soundSpeed += 4;
        if (app.settings.soundSpeed > 40)
            app.settings.soundSpeed = 12;
        app.requestInspection();
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (code == SDLK_Q) {
        app.pause();
        app.settings.alpha += 0.1;
        if (app.settings.alpha > 1)
            app.settings.alpha = 0;
        app.requestInspection();
    }
#endif
#if LAB_CHECKPOINT >= 2
    if (code == SDLK_B) {
        app.pause();
        app.settings.gravity += 2;
        if (app.settings.gravity > 12)
            app.settings.gravity = 0;
        app.requestInspection();
    }
#endif
    double dx = 0;
    double dy = 0;
    if (code == SDLK_LEFT)
        dx = -2 * water::spacing;
    if (code == SDLK_RIGHT)
        dx = 2 * water::spacing;
    if (code == SDLK_UP)
        dy = 2 * water::spacing;
    if (code == SDLK_DOWN)
        dy = -2 * water::spacing;
    if (app.tool == Tool::Inspect && (dx != 0 || dy != 0) && !app.state.particles.empty()) {
        int delta = -1;
        if (dx + dy > 0) {
            delta = 1;
        }
        const int selected = std::clamp(static_cast<int>(app.selected) + delta, 0, static_cast<int>(app.state.particles.size()) - 1);
        app.selected = static_cast<std::size_t>(selected);
        app.debug = true;
        app.dirty = true;
        return;
    }
#if LAB_CHECKPOINT >= 11
    if (app.tool == Tool::Paddle) {
        water::targetPaddle(app.state, app.state.paddle.targetX + dx, app.state.paddle.targetY + dy);
        app.dirty = true;
        return;
    }
#endif
    app.nozzle.x = std::clamp(app.nozzle.x + dx, water::spacing, water::width - water::spacing);
    app.nozzle.y = std::clamp(app.nozzle.y + dy, water::spacing, water::height - water::spacing);
#if LAB_CHECKPOINT >= 10
    if (code == SDLK_RETURN && app.tool == Tool::Pour) {
        water::emitBurst(app.state, app.nozzle);
        app.requestInspection();
    }
#endif
}

// Input đổi tool/target; chỉ physics step mới di chuyển vật cản.
inline void handle(App& app, SDL_Renderer* renderer, const SDL_Event& event) {
    if (event.type == SDL_EVENT_QUIT)
        app.running = false;
    if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST || event.type == SDL_EVENT_WINDOW_MINIMIZED) {
        app.pause();
        app.pouring = false;
        release(app);
    }
    if (event.type == SDL_EVENT_KEY_DOWN && !event.key.repeat && (event.key.mod & (SDL_KMOD_CTRL | SDL_KMOD_ALT | SDL_KMOD_GUI)) == 0)
        key(app, event.key.key);
    if (event.type == SDL_EVENT_MOUSE_BUTTON_UP)
        release(app);
    const bool down = event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT;
    if (!down && event.type != SDL_EVENT_MOUSE_MOTION)
        return;
    float windowX = event.motion.x;
    float windowY = event.motion.y;
    if (down) {
        windowX = event.button.x;
        windowY = event.button.y;
    }
    float x = 0;
    float y = 0;
    if (!SDL_RenderCoordinatesFromWindow(renderer, windowX, windowY, &x, &y))
        return;
    if (down) {
        for (const auto& button : buttons()) {
            if (contains(button.bounds, x, y)) {
                action(app, button.action);
                return;
            }
        }
        if (x >= 944 && x <= 1268 && y >= 347 && y <= 469) {
            const int index = static_cast<int>((y - 347) / 48);
            if (index >= 0 && index <= 2) {
                app.slider = index;
                SDL_CaptureMouse(true);
                parameter(app, index, x);
                return;
            }
        }
    }
    if (app.slider >= 0) {
        parameter(app, app.slider, x);
        return;
    }
    water::Vec2 point;
    if (!fromScreen(x, y, point))
        return;
    if (down) {
        app.dragging = true;
        SDL_CaptureMouse(true);
    }
    if (!app.dragging)
        return;
    if (app.tool == Tool::Inspect) {
        double best = water::width * water::width;
        for (std::size_t i = 0; i < app.state.particles.size(); ++i) {
            const auto& p = app.state.particles[i];
            const double distance = std::hypot(point.x - p.x, point.y - p.y);
            if (distance < best) {
                best = distance;
                app.selected = i;
            }
        }
        app.debug = true;
    }
#if LAB_CHECKPOINT >= 10
    if (app.tool == Tool::Pour) {
        app.nozzle = point;
        if (down)
            water::emitBurst(app.state, app.nozzle);
        app.requestInspection();
    }
#endif
#if LAB_CHECKPOINT >= 11
    if (app.tool == Tool::Paddle)
        water::targetPaddle(app.state, point.x, point.y);
#endif
    app.dirty = true;
}
} // namespace tank
