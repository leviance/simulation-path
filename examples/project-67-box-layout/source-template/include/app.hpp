#pragma once
#include "view.hpp"

namespace lab {
// Model và input sống độc lập với Style, số đo và Rect do layout tạo.
struct App {
    LayoutState layout;
    Model model;
    Ui ui;
    bool boxes = true;
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
inline std::string describePause(const LayoutState& state) {
    const auto view = locate(state.scene.tree, state.scene.pause);
    if (!view)
        return "Pause is clipped or hidden";
    return "Pause world=(" + std::to_string(int(view->bounds.x)) + "," + std::to_string(int(view->bounds.y)) + ") size=" + std::to_string(int(view->bounds.width)) + "x" + std::to_string(int(view->bounds.height));
}
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
        }
    }
#endif
    text(renderer, 48, 478, "Tab focus | Enter/Space click | Arrows slider | T rebuild");
#if LAB_CHECKPOINT >= 9
    text(renderer, 48, 496, "[ ] gap | H Reset | A/D labels | Shift+arrows width | O | F1");
#elif LAB_CHECKPOINT >= 8
    text(renderer, 48, 496, "[ ] gap | H Reset | A/D labels | Shift+arrows width | O overflow");
#elif LAB_CHECKPOINT >= 7
    text(renderer, 48, 496, "[ ] gap | H Reset | A/D labels | Shift+arrows width");
#elif LAB_CHECKPOINT >= 6
    text(renderer, 48, 496, "[ ] gap | H hide Reset | A/D labels | B boxes");
#elif LAB_CHECKPOINT >= 4
    text(renderer, 48, 496, "[ ] gap | B boxes");
#elif LAB_CHECKPOINT >= 2
    text(renderer, 48, 496, "B boxes; positions remain manual");
#endif
    text(renderer, 48, 72, "layout passes=" + std::to_string(app.layout.passes));
    text(renderer, 48, 92, app.message);
#if LAB_CHECKPOINT >= 1
    text(renderer, 48, 112, describePause(app.layout));
#endif
    require(SDL_RenderPresent(renderer));
}
} // namespace lab
