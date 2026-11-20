#pragma once
#include "view.hpp"

namespace lab {
// Model và input sống độc lập với Style, số đo và Rect do layout tạo.
struct App {
    LayoutState layout;
    Model model;
    Ui ui;
    bool boxes = false;
#if LAB_CHECKPOINT >= 7
    std::string message = "Layout cached until inputs change";
#elif LAB_CHECKPOINT >= 4
    std::string message = "Measure then arrange";
#elif LAB_CHECKPOINT >= 3
    std::string message = "Measured, positions still manual";
#else
    std::string message = "Manual coordinates";
#endif
};

inline void suspend(App& app) {
    cancel(app.ui);
    setPaused(app.model, true);
}

#if LAB_CHECKPOINT >= 1
// Theo dõi builder -> world bounds trước khi thay cách tính tọa độ.
// [snippet world-observer]
inline std::string describePause(const LayoutState& state) {
    const auto view = locate(state.scene.tree, state.scene.pause);
    if (!view)
        return "Pause is clipped or hidden";
    return "Pause world=(" + std::to_string(int(view->bounds.x)) + "," + std::to_string(int(view->bounds.y)) + ") size=" + std::to_string(int(view->bounds.width)) + "x" + std::to_string(int(view->bounds.height));
}
// [/snippet world-observer]
#endif

inline void draw(SDL_Renderer* renderer, App& app) {
    ensureLayout(app.layout, app.ui);
    drawScene(renderer, app.model);
    const Tree& tree = app.layout.scene.tree;
    for (const WidgetView& view : paintList(tree))
        drawWidget(renderer, view, app.model, app.ui);
    require(SDL_SetRenderClipRect(renderer, nullptr));
#if LAB_CHECKPOINT >= 2
    if (app.boxes) {
        const auto view = locate(tree, app.layout.scene.pause);
        if (view) {
            const BoxStyle& style = app.layout.scene.styles.at(view->node->id);
            const Rect r = view->bounds;
            const Rect content = contentBox(r, style);
            require(SDL_SetRenderDrawColor(renderer, 89, 225, 190, 255));
            const SDL_FRect inner{float(content.x), float(content.y), float(content.width), float(content.height)};
            require(SDL_RenderRect(renderer, &inner));
            require(SDL_SetRenderDrawColor(renderer, 255, 190, 104, 255));
            const SDL_FRect outer{float(r.x - style.margin.left), float(r.y - style.margin.top), float(r.width + style.margin.left + style.margin.right), float(r.height + style.margin.top + style.margin.bottom)};
            require(SDL_RenderRect(renderer, &outer));
            SDL_FRect border{float(r.x), float(r.y), float(r.width), float(r.height)};
            bench::ink(renderer, {88,169,236,255}); SDL_RenderRect(renderer, &border);
            SDL_FRect padding{float(r.x+style.border), float(r.y+style.border), float(r.width-2*style.border), float(r.height-2*style.border)};
            bench::ink(renderer, {190,157,230,255}); SDL_RenderRect(renderer, &padding);
        }
    }
#endif
    text(renderer, 24, 510, "B boxes  |  [ ] gap  |  - = padding  |  H hide Reset  |  A D labels  |  Shift+arrows width");
#if LAB_CHECKPOINT >= 2
    if (app.boxes) {
        bench::box(renderer, {30,96,392,88}, {25,49,55,255});
        text(renderer, 40, 105, "Amber margin  /  blue border");
        text(renderer, 40, 123, "Violet padding edge  /  mint content");
        text(renderer, 40, 144, app.message);
#if LAB_CHECKPOINT >= 3
        const auto& size = app.layout.sizes.at(tree.root->id);
        text(renderer, 40, 163, "Root: natural " + std::to_string(int(size.naturalHeight)) + " / fixed " + std::to_string(int(size.height)) + "    passes " + std::to_string(app.layout.passes));
#endif
    }
#endif
}
} // namespace lab
