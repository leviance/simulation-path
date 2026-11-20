#pragma once
#include "interact.hpp"
#include "view.hpp"
#include <iomanip>
#include <sstream>

namespace tiny {
inline void caption(SDL_Renderer* r, float x, float y, const std::string& text, SDL_Color color) {
    bench::text(r, x, y, text.c_str(), color);
}

inline std::string decimal(double value) {
    std::ostringstream text;
    text << std::fixed << std::setprecision(1) << value;
    return text.str();
}

using WidgetPainter = std::function<void(SDL_Renderer*, const lab::WidgetView&)>;

inline void drawDesk(SDL_Renderer* r, Desk& d, const std::string& chapter, const WidgetPainter& painter = {}) {
    auto& page = d.page;
    lab::ensureLayout(page.layout, d.ui);
    lab::require(SDL_SetRenderClipRect(r, nullptr));
    bench::ink(r, {18, 32, 38, 255});
    lab::require(SDL_RenderClear(r));
    caption(r, 24, 25, "FIELD NOTES    /    FLOCK OBSERVATORY", {143, 229, 191, 255});
    caption(r, 24, 52, chapter, {230, 239, 237, 255});
    bench::drawColony(r, d.model.colony, d.model.colony.showNeighbors, d.model.ticks);
    const auto views = lab::paintList(page.layout.scene.tree);
    for (const auto& item : views) {
        if (painter) {
            painter(r, item);
            continue;
        }
        lab::drawWidget(r, item, d.model, d.ui);
#if LAB_CHECKPOINT >= 6804
        const auto& node = *item.node;
        if (!page.elements.contains(node.id))
            continue;
        if (page.values.contains(node.id)) {
            const auto& range = *page.document.elements[page.elements.at(node.id)].range;
            const auto b = item.bounds;
            const double t = std::clamp((rangeValue(d, node.id) - range.low) / (range.high - range.low), 0.0, 1.0);
            lab::fill(r, b, 30, 60, 66);
            lab::fill(r, {b.x + 5, b.y + b.height / 2 - 2, b.width - 10, 4}, 79, 107, 111);
            lab::fill(r, {b.x + 5, b.y + b.height / 2 - 2, t * (b.width - 10), 4}, 94, 200, 171);
            lab::fill(r, {b.x + 2 + t * (b.width - 10), b.y + 3, 6, b.height - 6}, 218, 248, 231);
            if (d.ui.focus == node.id) {
                const SDL_FRect outline{float(b.x + 1), float(b.y + 1), float(b.width - 2), float(b.height - 2)};
                bench::ink(r, {252, 207, 118, 255});
                SDL_RenderRect(r, &outline);
            }
        }
#endif
    }
    lab::require(SDL_SetRenderClipRect(r, nullptr));
#if LAB_CHECKPOINT >= 6805
    // [snippet element-inspector]
    if (d.inspect && !page.handles.empty()) {
        d.observed %= page.handles.size();
        const auto& e = page.document.elements[d.observed];
        const auto id = page.handles[d.observed];
        const auto item = lab::locate(page.layout.scene.tree, id);
        bench::box(r, {30, 94, 410, 76}, {29, 52, 57, 255});
        caption(r, 42, 105, "SOURCE   <" + e.tag + "> #" + e.id + "    Widget " + std::to_string(id), {158, 235, 196, 255});
        std::string depth = "root";
        if (e.parent >= 0)
            depth = "parent #" + page.document.elements[static_cast<std::size_t>(e.parent)].id;
        caption(r, 42, 126, depth + "   |   byte " + std::to_string(e.offset), {217, 229, 225, 255});
        if (item) {
            const auto b = item->bounds;
            caption(r, 42, 146, "bounds " + decimal(b.x) + ", " + decimal(b.y) + "   " + decimal(b.width) + " x " + decimal(b.height), {249, 205, 119, 255});
            const SDL_FRect edge{float(b.x), float(b.y), float(b.width), float(b.height)};
            bench::ink(r, {249, 205, 119, 255});
            SDL_RenderRect(r, &edge);
        }
    }
    // [/snippet element-inspector]
#endif
    bench::box(r, {24, 498, 548, 36}, {27, 49, 54, 255});
    SDL_Color accent{157, 218, 187, 255};
    if (d.error)
        accent = {255, 164, 140, 255};
    caption(r, 32, 505, d.status.substr(0, 66), accent);
    if (d.status.size() > 66)
        caption(r, 32, 519, d.status.substr(66, 66), accent);
}
} // namespace tiny
