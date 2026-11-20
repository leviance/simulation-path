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
    bool inspect = false;
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
    bench::text(renderer, 24, 512, "F2 inspector  /  Shift + arrows: move panel  /  P: presets", {160,185,184,255});
    if (app.inspect) {
        auto selected = locate(app.built.tree, app.ui.hot);
        if (!selected) selected = locate(app.built.tree, app.ui.focus);
        if (!selected) selected = locate(app.built.tree, app.built.pause);
        if (selected) {
            const auto& chosen = *selected;
            const auto rect = [](Rect r) { return std::to_string(int(r.x)) + "," + std::to_string(int(r.y)) + "  " +
                std::to_string(int(r.width)) + "x" + std::to_string(int(r.height)); };
            bench::box(renderer, {30, 96, 305, 97}, {25,49,55,255});
            text(renderer, 38, 104, "ID " + std::to_string(chosen.node->id) + " / " + app.message);
            text(renderer, 38, 125, "local  " + rect(chosen.node->local));
            text(renderer, 38, 145, "world  " + rect(chosen.bounds));
            text(renderer, 38, 165, "clip   " + rect(chosen.clip));
            const SDL_FRect border{float(chosen.clip.x), float(chosen.clip.y), float(chosen.clip.width), float(chosen.clip.height)};
            bench::ink(renderer, {253,193,97,255});
            SDL_RenderRect(renderer, &border);
        }
    }
#endif

    ++app.frames;
}
} // namespace lab
