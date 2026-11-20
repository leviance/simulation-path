#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include "controls.hpp"
#include "workbench/viewport.hpp"

namespace lab {
using bench::box;
using bench::ink;
using bench::text;
constexpr SDL_Color paper{225, 238, 230, 255}, mint{143, 229, 191, 255};
constexpr SDL_Color quiet{160, 185, 184, 255}, dark{17, 36, 41, 255};

#if LAB_CHECKPOINT >= 2
inline SDL_FRect asSDL(Rect r) {
    return {float(r.x), float(r.y), float(r.width), float(r.height)};
}

inline void drawButton(SDL_Renderer* r, const Ui& ui, Control id, const char* title) {
    const auto rect = asSDL(bounds(id));
    SDL_Color background{50, 78, 82, 255};
    if (ui.hot == id) background = {67, 102, 101, 255};
    if (ui.active == id) background = {25, 109, 95, 255};
    box(r, rect, background);
    text(r, rect.x + 12, rect.y + 16, title, paper);
}
#endif

#if LAB_CHECKPOINT >= 4
// [snippet paint-track]
inline void paintTrack(SDL_Renderer* r, const Ui& ui, Control id, double fraction, const char* label) {
    const SDL_FRect rect = asSDL(bounds(id));
    const float knob = rect.x + rect.w * float(fraction);
    text(r, rect.x, rect.y - 22, label, paper);
    box(r, {rect.x, rect.y + 13, rect.w, 4}, {68, 96, 99, 255});
    box(r, {rect.x, rect.y + 13, knob - rect.x, 4}, mint);
    SDL_Color handle = mint;
    if (ui.hot == id) handle = paper;
    if (ui.active == id) handle = {255, 195, 101, 255};
    box(r, {knob - 3, rect.y + 5, 6, 20}, handle);
}
// [/snippet paint-track]
#endif

inline void draw(SDL_Renderer* r, const Model& model, const Ui& ui) {
    ink(r, dark);
    SDL_RenderClear(r);
    text(r, 24, 24, "F I E L D   N O T E S      /      F L O C K   O B S E R V A T O R Y", mint);
    text(r, 24, 52, "01   /   Flight field", paper);
    bool overlay = false;
#if LAB_CHECKPOINT >= 3
    overlay = model.colony.showNeighbors;
#endif
    // [snippet paint-flock]
    bench::drawColony(r, model.colony, overlay, model.ticks);
    // [/snippet paint-flock]
#if LAB_CHECKPOINT >= 2
    box(r, asSDL(panel), {32, 54, 60, 255});
    text(r, 676, 46, "02   /   Flight desk", mint);
    text(r, 676, 74, "TRANSPORT", quiet);
    const char* pause = "Pause";
    if (model.paused) pause = "Resume";
    drawButton(r, ui, Control::Pause, pause);
    drawButton(r, ui, Control::Reset, "Reset preset");
    const char* check = "[ ] Neighbors";
#if LAB_CHECKPOINT >= 3
    if (overlay) check = "[x] Neighbors";
#endif
    drawButton(r, ui, Control::Observe, check);
#else
    (void)ui;
    text(r, 670, 60, "Flight desk / starter", mint);
    text(r, 670, 88, "No controls yet.", quiet);
#endif
#if LAB_CHECKPOINT >= 4
    char label[48];
    const auto& params = model.colony.params;
    std::snprintf(label, sizeof(label), "Sense radius     %5.1f px", params.radius);
    paintTrack(r, ui, Control::Radius, (params.radius - 20) / 120, label);
    std::snprintf(label, sizeof(label), "Separation       %5.2f  x", params.separationWeight);
    paintTrack(r, ui, Control::Separation, params.separationWeight / 5, label);
    text(r, 676, 407, "TEAL  neighbors", mint);
    text(r, 676, 429, "GOLD  tracked bird", {255, 197, 108, 255});
#endif
#if LAB_CHECKPOINT >= 5
    if (ui.focus != Control::None) {
        auto focus = asSDL(bounds(ui.focus));
        focus.x -= 3; focus.y -= 3; focus.w += 6; focus.h += 6;
        ink(r, {255, 198, 97, 255});
        SDL_RenderRect(r, &focus);
    }
    text(r, 676, 478, "Tab focus  /  Arrows tune", quiet);
#endif
    text(r, 24, 513, "SIMULATION PATH   /   P28 SPATIAL GRID   /   SEED 028", quiet);
}
} // namespace lab
