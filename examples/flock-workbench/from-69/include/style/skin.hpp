#pragma once
#include "editor.hpp"
#include "markup/tool.hpp"

namespace tiny {
inline SDL_Color rgba(RGB c) {
    return {Uint8(c.r), Uint8(c.g), Uint8(c.b), 255};
}

inline RGB lighter(RGB c, unsigned amount) {
    return {std::min(255u, c.r + amount), std::min(255u, c.g + amount), std::min(255u, c.b + amount)};
}

#if LAB_CHECKPOINT >= 6903
// [snippet custom-paint]
inline void paintStyled(SDL_Renderer* r, const Desk& d, const lab::WidgetView& item, const Computed& c) {
    const auto box = item.bounds;
    const auto& node = *item.node;
    const auto clip = item.clip;
    const int x = int(std::ceil(clip.x)), y = int(std::ceil(clip.y));
    const SDL_Rect window{x, y, int(std::floor(clip.x + clip.width)) - x, int(std::floor(clip.y + clip.height)) - y};
    lab::require(SDL_SetRenderClipRect(r, &window));
    auto fill = [r](lab::Rect b, RGB color) {
        lab::fill(r, b, Uint8(color.r), Uint8(color.g), Uint8(color.b));
    };
    RGB paper = c.paint.paper;
    if (d.ui.hot == node.id)
        paper = lighter(paper, 10);
    if (d.ui.active == node.id)
        paper = lighter(paper, 18);
    const double border = c.box.border;
    fill(box, c.paint.edge);
    fill({box.x + border, box.y + border, std::max(0.0, box.width - 2 * border), std::max(0.0, box.height - 2 * border)}, paper);
    const auto content = lab::contentBox(box, c.box);
    if (d.page.values.contains(node.id)) {
        const auto& range = *d.page.document.elements.at(d.page.elements.at(node.id)).range;
        const double fraction = std::clamp((rangeValue(d, node.id) - range.low) / (range.high - range.low), 0.0, 1.0);
        const auto track = std::max(0.0, box.width - 12);
        const auto mid = box.y + box.height / 2;
        fill({box.x + 6, mid - 2, track, 4}, c.paint.edge);
        fill({box.x + 6, mid - 2, fraction * track, 4}, c.paint.ink);
        fill({box.x + 3 + fraction * track, mid - 9, 6, 18}, c.paint.ink);
    } else if (node.kind != lab::Kind::Panel) {
        std::string label = node.text;
        if (node.action == lab::Action::Pause && d.model.paused)
            label = "Resume";
        if (node.action == lab::Action::Observe && d.model.colony.showNeighbors)
            label = "[x] " + node.text;
#if LAB_CHECKPOINT >= 7100
        if (node.action == lab::Action::Observe && !d.model.colony.showNeighbors)
            label = "[ ] " + node.text;
#endif
        if (node.binding == lab::Binding::Radius)
            label = node.text + "  " + decimal(d.model.colony.params.radius) + " px";
        if (node.binding == lab::Binding::Separation)
            label = node.text + "  " + decimal(d.model.colony.params.separationWeight);
        if (node.binding == lab::Binding::Time)
            label = "Tick " + std::to_string(d.model.ticks);
        caption(r, float(content.x), float(box.y + box.height / 2 - 4), label, rgba(c.paint.ink));
    }
    if (d.ui.focus == node.id) {
        const SDL_FRect edge{float(box.x + 2), float(box.y + 2), float(std::max(0.0, box.width - 4)), float(std::max(0.0, box.height - 4))};
        bench::ink(r, {255, 202, 111, 255});
        SDL_RenderRect(r, &edge);
    }
}

// [/snippet custom-paint]
#endif

struct CssTool : HtmlTool {
    Palette palette;
    std::string cssFile = "style.css";
    std::size_t property = 0;

    void loadStyle() {
        reloadCss(*this, palette, assets / cssFile);
    }

    void start() {
        chapter = "05   /   Style from a sheet";
        HtmlTool::start();
        palette.defaults = page.layout.scene.styles;
#if LAB_CHECKPOINT >= 6901
        loadStyle();
#endif
    }

    void keyboard(SDL_Keycode k, bool shift, bool repeat) {
#if LAB_CHECKPOINT >= 6901
        if (!repeat && (k == SDLK_F5 || k == SDLK_1 || k == SDLK_2 || k == SDLK_3)) {
            if (k == SDLK_1)
                cssFile = "style.css";
            if (k == SDLK_2)
                cssFile = "field.css";
            if (k == SDLK_3)
                cssFile = "broken.css";
            loadStyle();
            return;
        }
#endif
        if (k == SDLK_1 || k == SDLK_2 || k == SDLK_3 || k == SDLK_F5)
            return;
        if (k == SDLK_P && !repeat) {
            ++property;
            return;
        }
        HtmlTool::keyboard(k, shift, repeat);
    }

    void render(SDL_Renderer* r) {
#if LAB_CHECKPOINT >= 6903
        drawDesk(r, *this, chapter, [&](SDL_Renderer* target, const lab::WidgetView& v) {
            const auto it = palette.computed.find(v.node->id);
            if (it == palette.computed.end())
                lab::drawWidget(target, v, model, ui);
            else
                paintStyled(target, *this, v, it->second);
        });
#else
        drawDesk(r, *this, chapter);
#endif
#if LAB_CHECKPOINT >= 6905
        if (inspect && observed < page.handles.size() && !palette.computed.empty()) {
            const auto& c = palette.computed.at(page.handles[observed]);
            bench::box(r, {30, 172, 442, 74}, {42, 49, 56, 255});
            std::string matches = "Rules matched:";
            for (const auto n : c.matches)
                matches += " " + std::to_string(n + 1);
            caption(r, 40, 183, matches, {204, 225, 219, 255});
            if (!c.winner.empty()) {
                auto it = c.winner.begin();
                std::advance(it, property % c.winner.size());
                const auto& pick = it->second;
                const auto& sel = palette.sheet.rules[pick.rule].selector;
                std::string from = sel.name;
                if (sel.prefix)
                    from = std::string(1, sel.prefix) + from;
                caption(r, 40, 203, it->first + ": " + pick.declaration.value + "  <-  " + from, {255, 205, 128, 255});
                caption(r, 40, 222, "Rule " + std::to_string(pick.rule + 1) + "    P: next property", {180, 207, 195, 255});
            }
        }
#endif
        caption(r, 24, 69, "1/2 themes   3 invalid   F5 reload   I inspector   [ ] node   P property", {185, 206, 202, 255});
    }

    void choose(std::string_view take) {
        if (take == "field")
            keyboard(SDLK_2, false, false);
        if (take == "bad")
            keyboard(SDLK_3, false, false);
        if (take == "inspector") {
            inspect = true;
            observed = 3;
        }
    }
};
} // namespace tiny
