#pragma once
#include "flex/tool.hpp"
#include "reload.hpp"

namespace tiny {
struct EventTool : FlexTool {
    Bus bus;
    Gesture gesture;
    Command command = hostCommand;
    std::string panel = "panel.html";
    bool trace = false;

    void openPanel() {
        reloadBound(*this, palette, flex, bus, assets / panel, assets / cssFile, command);
        gesture = {};
    }

    void start() {
        chapter = "07   /   Event desk";
        cssFile = "style.css";
        openPanel();
    }

    void down(lab::Point p) {
#if LAB_CHECKPOINT >= 7101
        if (begin(*this, bus, gesture, p))
            return;
        if (lab::contains({bench::mapX, bench::mapY, bench::mapW, bench::mapH}, p)) {
            model.colony.selectAt(bench::world(float(p.x), float(p.y)));
            ++model.scenePresses;
        }
#else
        HtmlTool::down(p);
#endif
    }

    void motion(lab::Point p) {
#if LAB_CHECKPOINT >= 7101
        slide(*this, bus, gesture, p);
#else
        HtmlTool::motion(p);
#endif
    }

    void up(lab::Point p) {
#if LAB_CHECKPOINT >= 7101
        end(*this, bus, gesture, p);
#else
        HtmlTool::up(p);
#endif
    }

    void keyboard(SDL_Keycode k, bool shift, bool repeat) {
        if (k == SDLK_E && !repeat) {
            trace = !trace;
            return;
        }
#if LAB_CHECKPOINT >= 7102
        if (k == SDLK_B && !repeat) {
            bus.stopAtGroup = !bus.stopAtGroup;
            return;
        }
#endif
#if LAB_CHECKPOINT >= 7105
        if (!repeat && (k == SDLK_1 || k == SDLK_2 || k == SDLK_3 || k == SDLK_F4)) {
            if (k == SDLK_1)
                panel = "panel.html";
            if (k == SDLK_2)
                panel = "survey.html";
            if (k == SDLK_3)
                panel = "unbound.html";
            openPanel();
            return;
        }
#endif
        if (k == SDLK_F5 && !repeat) {
            changeFlexSheet(*this, palette, flex, assets / cssFile);
            return;
        }
        if (k == SDLK_1 || k == SDLK_2 || k == SDLK_3 || k == SDLK_F4)
            return;
#if LAB_CHECKPOINT >= 7104
        if (navigate(*this, bus, navKey(k), shift, repeat))
            return;
        if (k == SDLK_SPACE && !repeat) {
            lab::setPaused(model, !model.paused);
            return;
        }
        if (navKey(k) != lab::Key::Other)
            return;
#elif LAB_CHECKPOINT >= 7101
        if (navKey(k) != lab::Key::Other) {
            if (k == SDLK_SPACE && !repeat && !ui.active)
                lab::setPaused(model, !model.paused);
            return;
        }
#endif
        FlexTool::keyboard(k, shift, repeat);
    }

    void render(SDL_Renderer* r) {
        FlexTool::render(r);
        bench::box(r, {20, 65, 591, 19}, {18, 32, 38, 255});
        caption(r, 24, 69, "E events   B stop at group   F4 HTML   F5 CSS   1/2 layouts   Tab focus", {185, 206, 202, 255});
        if (trace) {
            std::string route = "Path:";
            for (const auto& part : bus.route)
                route += "  #" + part;
            bench::box(r, {32, 98, 422, 61}, {34, 52, 60, 255});
            caption(r, 42, 109, route, {254, 211, 137, 255});
            caption(r, 42, 130, "Commands " + std::to_string(bus.commands) + "   Group " + std::to_string(bus.ancestorCalls) + "   Edition " + std::to_string(edition), {183, 225, 206, 255});
        }
    }

    void choose(std::string_view take) {
        if (take == "survey") {
            panel = "survey.html";
            openPanel();
        }
        if (take == "bad") {
            panel = "unbound.html";
            openPanel();
        }
        if (take == "trace" || take == "stopped") {
            trace = true;
            bus.stopAtGroup = take == "stopped";
            const auto view = lab::locate(page.layout.scene.tree, elementById(page, "pause"));
            if (view) {
                const lab::Point point{view->bounds.x + 12, view->bounds.y + 12};
                down(point);
                up(point);
            }
        }
        if (take == "radius") {
            const auto v = lab::locate(page.layout.scene.tree, elementById(page, "radius"));
            if (v) {
                down({v->bounds.x + 4, v->bounds.y + 8});
                up({v->bounds.x + v->bounds.width + 20, v->bounds.y + 8});
            }
        }
    }
};
} // namespace tiny
