#pragma once
#include "view.hpp"

namespace lab {
// Model và Tree là hai owner khác nhau: Reset vật lý không dựng lại giao diện.
struct App {
    Model model;
    Ui ui;
    std::uint64_t frames = 0;
#if LAB_CHECKPOINT >= 1
    BuiltTree built = buildTree();
    int builds = 1;
    int preset = 0;
    int extraLabels = 0;
    std::string message = "Tree built once";
#endif
};

inline void suspend(App& app) {
    cancel(app.ui);
    setPaused(app.model, true);
    app.model.accumulator = 0;
}

#if LAB_CHECKPOINT >= 1
inline void rebuild(App& app, int preset) {
    suspend(app);
    app.ui = Ui{};
    app.built = buildTree(preset);
    app.preset = preset;
    app.extraLabels = 0;
    ++app.builds;
    app.message = "New tree; simulation parameters preserved";
}
#endif

inline void draw(SDL_Renderer* renderer, App& app) {
    drawScene(renderer, app.model);
#if LAB_CHECKPOINT >= 1
    const auto nodes = paintList(app.built.tree);
    for (const WidgetView& node : nodes)
        drawWidget(renderer, node, app.model, app.ui);
    require(SDL_SetRenderClipRect(renderer, nullptr));
    text(renderer, 48, 480, "nodes=" + std::to_string(app.built.tree.count) + " builds=" + std::to_string(app.builds) + " frame=" + std::to_string(app.frames));
    text(renderer, 48, 500, "hot/active/focus=" + std::to_string(app.ui.hot) + "/" + std::to_string(app.ui.active) + "/" + std::to_string(app.ui.focus));
    text(renderer, 24, 522, app.message);
#endif
    require(SDL_RenderPresent(renderer));
    ++app.frames;
}
} // namespace lab
