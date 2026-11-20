#pragma once
#include "events/tool.hpp"
#include "session.hpp"

namespace ink {
struct ScriptTool : tiny::EventTool {
    Session script;
    std::string selected = "flight.tiny";
    bool diagnostics = false;

    void loadScript() {
        lab::cancel(ui);
        gesture = {};
        ink::reload(script, *this, assets / selected);
    }

    void start() {
        EventTool::start();
        chapter = "08   /   Programmable flight desk";
#if LAB_CHECKPOINT >= 7201
        loadScript();
#endif
#if LAB_CHECKPOINT >= 7205
        command = [this](tiny::Desk& desk, const std::string& event, double value) {
            invoke(script, desk, event, value);
        };
        tiny::connect(*this, bus, command);
#endif
    }

    void keyboard(SDL_Keycode k, bool shift, bool repeat) {
        if (!repeat && k == SDLK_F9) {
            lab::setPaused(model, !model.paused);
            return;
        }
        if (!repeat && k == SDLK_L) {
            diagnostics = !diagnostics;
            return;
        }
#if LAB_CHECKPOINT >= 7201
        if (!repeat && k == SDLK_F5) {
            loadScript();
            return;
        }
#endif
#if LAB_CHECKPOINT >= 7206
        if (!repeat && (k == SDLK_3 || k == SDLK_4 || k == SDLK_5)) {
            if (k == SDLK_3)
                selected = "broken.tiny";
            if (k == SDLK_4)
                selected = "bad-host.tiny";
            if (k == SDLK_5)
                selected = "recursive.tiny";
            loadScript();
            return;
        }
#endif
#if LAB_CHECKPOINT >= 7207
        if (!repeat && (k == SDLK_1 || k == SDLK_2)) {
            selected = "flight.tiny";
            if (k == SDLK_2)
                selected = "close-study.tiny";
            loadScript();
            return;
        }
#endif
        if (k == SDLK_1 || k == SDLK_2 || k == SDLK_3 || k == SDLK_4 || k == SDLK_5 || k == SDLK_F5)
            return;
        if (k == SDLK_F4 && !repeat) {
            openPanel();
            return;
        }
        EventTool::keyboard(k, shift, repeat);
    }

    void render(SDL_Renderer* r) {
        EventTool::render(r);
        bench::box(r, {20, 65, 590, 19}, {18, 32, 38, 255});
        tiny::caption(r, 24, 69, "1/2 scripts   3/4/5 errors   F5 reload   F9 pause   L runtime", {185, 206, 202, 255});
        if (!diagnostics)
            return;
        bench::box(r, {32, 97, 438, 65}, {31, 53, 62, 255});
        tiny::caption(r, 42, 107, "TinyScript / " + script.filename + "    Edition " + std::to_string(script.edition), {159, 231, 200, 255});
        tiny::caption(r, 42, 128, "Globals " + std::to_string(script.variables.size()) + "    Last valid handler: " + std::to_string(script.steps) + " steps", {235, 211, 158, 255});
    }

    void choose(std::string_view take) {
        if (take == "close")
            keyboard(SDLK_2, false, false);
        if (take == "bad")
            keyboard(SDLK_3, false, false);
        if (take == "recursive")
            keyboard(SDLK_5, false, false);
#if LAB_CHECKPOINT >= 7205
        if (take == "direct" || take == "close") {
            lab::setPaused(model, true);
            const auto slider = lab::locate(page.layout.scene.tree, tiny::elementById(page, "radius"));
            if (slider) {
                const lab::Point mid{slider->bounds.x + slider->bounds.width / 2, slider->bounds.y + 8};
                down(mid);
                up(mid);
            }
        }
        if (take == "recursive") {
            const auto pause = lab::locate(page.layout.scene.tree, tiny::elementById(page, "pause"));
            if (pause) {
                const lab::Point pt{pause->bounds.x + 8, pause->bounds.y + 8};
                down(pt);
                up(pt);
            }
        }
#endif
        if (take == "runtime")
            diagnostics = true;
    }
};
} // namespace ink
