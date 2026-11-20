#pragma once
#include "style/skin.hpp"
#include "workshop.hpp"

namespace tiny {
struct FlexTool : CssTool {
    FlexState flex;

    void prepare() {
#if LAB_CHECKPOINT >= 7002
        reflow(*this, flex.values);
#else
        lab::ensureLayout(page.layout, ui);
#endif
    }

    void start() {
        HtmlTool::start();
        palette.defaults = page.layout.scene.styles;
        chapter = "06   /   Workbench geometry";
        cssFile = "base.css";
#if LAB_CHECKPOINT >= 7001
        cssFile = "style.css";
#endif
        changeFlexSheet(*this, palette, flex, assets / cssFile);
    }

    void layoutWidth(double width) {
        lab::setWidth(page.layout, ui, width);
        prepare();
    }

    void keyboard(SDL_Keycode k, bool shift, bool repeat) {
        if (!repeat && (k == SDLK_F5 || k == SDLK_1 || k == SDLK_2 || k == SDLK_3)) {
            if (k == SDLK_1)
                cssFile = "style.css";
            if (k == SDLK_2)
                cssFile = "column.css";
            if (k == SDLK_3)
                cssFile = "base.css";
            changeFlexSheet(*this, palette, flex, assets / cssFile);
            return;
        }
        if (!repeat && k == SDLK_X) {
            flex.axes = !flex.axes;
            return;
        }
#if LAB_CHECKPOINT >= 7005
        if (!repeat && k == SDLK_H) {
            toggleControl(*this, "observe");
            prepare();
            return;
        }
#endif
#if LAB_CHECKPOINT >= 7006
        if (k == SDLK_4) {
            layoutWidth(220);
            return;
        }
        if (k == SDLK_5) {
            layoutWidth(320);
            return;
        }
        if (k == SDLK_6) {
            layoutWidth(420);
            return;
        }
#endif
        CssTool::keyboard(k, shift, repeat);
    }

    void render(SDL_Renderer* r) {
        prepare();
        CssTool::render(r);
        bench::box(r, {20, 65, 590, 19}, {18, 32, 38, 255});
        caption(r, 24, 69, "1 row  2 column  F5 reload  X axes  H hide  4/5/6 widths", {185, 206, 202, 255});
        if (!flex.axes)
            return;
        const auto toolbar = lab::locate(page.layout.scene.tree, flex.toolbar);
        if (!toolbar || !flex.values.contains(flex.toolbar))
            return;
        const auto b = toolbar->bounds;
        const auto axis = flex.values.at(flex.toolbar).axis;
        SDL_Color main{253, 187, 91, 255}, cross{119, 196, 230, 255};
        if (axis == Axis::Column)
            std::swap(main, cross);
        bench::ink(r, main);
        SDL_RenderLine(r, float(b.x), float(b.y + 2), float(b.x + b.width), float(b.y + 2));
        bench::ink(r, cross);
        SDL_RenderLine(r, float(b.x + 2), float(b.y), float(b.x + 2), float(b.y + b.height));
        for (const auto& child : toolbar->node->children) {
            const auto v = lab::locate(page.layout.scene.tree, child->id);
            if (!v)
                continue;
            const SDL_FRect outline{float(v->clip.x), float(v->clip.y), float(v->clip.width), float(v->clip.height)};
            bench::ink(r, {255, 209, 126, 255});
            SDL_RenderRect(r, &outline);
        }
        bench::box(r, {32, 98, 324, 37}, {35, 56, 64, 255});
        caption(r, 42, 109, "Amber: main axis    Blue: cross axis", {246, 223, 163, 255});
    }

    void choose(std::string_view take) {
        if (take == "column")
            keyboard(SDLK_2, false, false);
        if (take == "axes")
            flex.axes = true;
        if (take == "hidden")
            keyboard(SDLK_H, false, false);
        if (take == "narrow")
            layoutWidth(220);
        if (take == "wide")
            layoutWidth(420);
    }
};
} // namespace tiny
