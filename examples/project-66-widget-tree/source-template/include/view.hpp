#pragma once
#include "audit.hpp"
#include <SDL3/SDL.h>
#include <string>

namespace lab {
// Mọi lỗi SDL đi ra cùng đường cleanup trong main; không tiếp tục vẽ trên state lỗi.
inline void require(bool ok) {
    if (!ok)
        throw std::runtime_error(SDL_GetError());
}

inline void fill(SDL_Renderer* renderer, Rect r, Uint8 red, Uint8 green, Uint8 blue) {
    require(SDL_SetRenderDrawColor(renderer, red, green, blue, 255));
    const SDL_FRect rect{float(r.x), float(r.y), float(r.width), float(r.height)};
    require(SDL_RenderFillRect(renderer, &rect));
}

inline void text(SDL_Renderer* renderer, double x, double y, const std::string& label) {
    require(SDL_SetRenderDrawColor(renderer, 229, 237, 248, 255));
    require(SDL_RenderDebugText(renderer, float(x), float(y), label.c_str()));
}

#if LAB_CHECKPOINT >= 1
inline void drawWidget(SDL_Renderer* renderer, const WidgetView& view, const Model& model, const Ui& ui) {
    const Widget& node = *view.node;
    const Rect r = view.bounds;
#if LAB_CHECKPOINT >= 3
    const SDL_Rect clip{int(std::ceil(view.clip.x)), int(std::ceil(view.clip.y)), int(std::floor(view.clip.x + view.clip.width) - std::ceil(view.clip.x)), int(std::floor(view.clip.y + view.clip.height) - std::ceil(view.clip.y))};
    require(SDL_SetRenderClipRect(renderer, &clip));
#endif
    if (node.kind == Kind::Panel) {
        fill(renderer, r, 25, 35, 54);
    }
    if (node.kind == Kind::Button) {
        fill(renderer, r, 48, 63, 87);
        if (ui.hot == node.id && view.enabled)
            fill(renderer, r, 67, 87, 118);
        if (ui.active == node.id && ui.hot == node.id)
            fill(renderer, r, 33, 112, 104);
        if (!view.enabled)
            fill(renderer, r, 43, 45, 49);
    }
    std::string label = node.text;
    if (node.action == Action::Pause) {
        label = "Pause";
        if (model.paused)
            label = "Resume";
    }
    if (node.binding == Binding::Gravity)
        label = "g=" + std::to_string(int(model.gravity));
    if (node.binding == Binding::Time)
        label = "ticks=" + std::to_string(model.ticks);
    if (node.kind != Kind::Slider && node.kind != Kind::Panel)
        text(renderer, r.x + 4, r.y + 10, label);
#if LAB_CHECKPOINT >= 5
    if (node.kind == Kind::Slider) {
        fill(renderer, r, 38, 50, 72);
        fill(renderer, {r.x, r.y + 18, r.width, 4}, 111, 132, 164);
        fill(renderer, {r.x + model.gravity / 1200 * r.width - 4, r.y + 6, 8, 28}, 89, 225, 190);
    }
#endif
#if LAB_CHECKPOINT >= 6
    if (ui.focus == node.id) {
        require(SDL_SetRenderDrawColor(renderer, 255, 209, 102, 255));
        const SDL_FRect focus{float(r.x + 2), float(r.y + 2), float(r.width - 4), float(r.height - 4)};
        require(SDL_RenderRect(renderer, &focus));
    }
#endif
}
#endif

inline void drawScene(SDL_Renderer* renderer, const Model& model) {
    require(SDL_SetRenderClipRect(renderer, nullptr));
    require(SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255));
    require(SDL_RenderClear(renderer));
    fill(renderer, {24, 24, 616, 492}, 20, 29, 46);
    fill(renderer, {48, 460, 568, 2}, 100, 143, 137);
    for (int row = -14; row <= 14; ++row) {
        const double half = std::sqrt(196.0 - row * row);
        fill(renderer, {320 - half, model.y + row, 2 * half + 1, 1}, 255, 190, 104);
    }
    text(renderer, 48, 48, "Space play/pause | N step | R reset scene");
}
} // namespace lab
