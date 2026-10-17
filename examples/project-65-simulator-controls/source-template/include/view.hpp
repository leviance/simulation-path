#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif

#include "controls.hpp"
#include <SDL3/SDL.h>
#include <cstdio>

namespace lab {

// Helpers chỉ chuyển dữ liệu hình học sang lời gọi SDL, không sửa Model/Ui.
inline void fill(SDL_Renderer* renderer, Rect rect, Uint8 red, Uint8 green, Uint8 blue) {
    const SDL_FRect target{float(rect.x), float(rect.y), float(rect.width), float(rect.height)};
    SDL_SetRenderDrawColor(renderer, red, green, blue, 255);
    SDL_RenderFillRect(renderer, &target);
}

#if LAB_CHECKPOINT >= 2
inline void drawButton(SDL_Renderer* renderer, const Ui& ui, Control id, Rect rect, const char* label) {
    fill(renderer, rect, 48, 63, 87);
    if (ui.hot == id) {
        fill(renderer, rect, 67, 87, 118);
    }
#if LAB_CHECKPOINT >= 3
    if (ui.active == id && ui.hot == id) {
        fill(renderer, rect, 33, 112, 104);
    }
#else
    (void)id;
#endif

    SDL_SetRenderDrawColor(renderer, 230, 237, 247, 255);
    SDL_RenderDebugText(renderer, float(rect.x + 16.0), float(rect.y + 18.0), label);
}
#endif

inline void draw(SDL_Renderer* renderer, const Model& model, const Ui& ui) {
    SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255);
    SDL_RenderClear(renderer);
    fill(renderer, {24.0, 24.0, 616.0, 492.0}, 20, 29, 46);
    fill(renderer, {48.0, floorY, 568.0, 2.0}, 100, 143, 137);

#if LAB_CHECKPOINT >= 1
    // Tô từng hàng ngang của hình tròn, không cần ảnh hoặc texture bên ngoài.
    for (int row = -14; row <= 14; ++row) {
        const double halfWidth = std::sqrt(ballRadius * ballRadius - double(row * row));
        fill(renderer, {320.0 - halfWidth, model.y + double(row), halfWidth * 2.0 + 1.0, 1.0}, 255, 190, 104);
    }
    SDL_SetRenderDrawColor(renderer, 225, 232, 244, 255);
    SDL_RenderDebugTextFormat(renderer, 48.0f, 486.0f, "y=%.2f v=%.2f ticks=%llu", model.y, model.velocity, static_cast<unsigned long long>(model.ticks));
#else
    (void)model;
    fill(renderer, {306.0, 76.0, 28.0, 28.0}, 255, 190, 104);
#endif

#if LAB_CHECKPOINT >= 2
    fill(renderer, panel, 25, 35, 54);
    SDL_SetRenderDrawColor(renderer, 225, 232, 244, 255);
    SDL_RenderDebugText(renderer, 688.0f, 48.0f, "SIMULATOR CONTROLS");
    const char* pauseLabel = "Pause";
    if (model.paused) {
        pauseLabel = "Resume";
    }
    drawButton(renderer, ui, Control::Pause, pauseButton, pauseLabel);
    drawButton(renderer, ui, Control::Reset, resetButton, "Reset scene");
#else
    (void)ui;
#endif

#if LAB_CHECKPOINT >= 4
    fill(renderer, gravitySlider, 38, 50, 72);
    const double knobX = gravitySlider.x + model.gravity / 1200.0 * gravitySlider.width;
    fill(renderer, {gravitySlider.x, 250.0, gravitySlider.width, 4.0}, 111, 132, 164);
    fill(renderer, {knobX - 5.0, 238.0, 10.0, 28.0}, 89, 225, 190);
    SDL_SetRenderDrawColor(renderer, 225, 232, 244, 255);
    SDL_RenderDebugTextFormat(renderer, 688.0f, 212.0f, "Gravity: %.0f px/s^2", model.gravity);
    SDL_RenderDebugText(renderer, 688.0f, 290.0f, "Range: 0 .. 1200");
#endif

#if LAB_CHECKPOINT >= 5
    Rect focused{};
    if (ui.focus == Control::Pause) {
        focused = pauseButton;
    }
    if (ui.focus == Control::Reset) {
        focused = resetButton;
    }
    if (ui.focus == Control::Gravity) {
        focused = gravitySlider;
    }
    if (ui.focus != Control::None) {
        const SDL_FRect border{float(focused.x - 3.0), float(focused.y - 3.0), float(focused.width + 6.0), float(focused.height + 6.0)};
        SDL_SetRenderDrawColor(renderer, 255, 209, 102, 255);
        SDL_RenderRect(renderer, &border);
    }
    SDL_SetRenderDrawColor(renderer, 225, 232, 244, 255);
    SDL_RenderDebugText(renderer, 688.0f, 340.0f, "Tab / Shift+Tab: focus");
    SDL_RenderDebugText(renderer, 688.0f, 360.0f, "Enter/Space: button");
    SDL_RenderDebugText(renderer, 688.0f, 380.0f, "Arrows/Home/End: slider");
    SDL_RenderDebugText(renderer, 688.0f, 400.0f, "N: one paused step");
#endif

#if LAB_CHECKPOINT >= 6
    SDL_RenderDebugTextFormat(renderer, 48.0f, 48.0f, "Scene presses: %d", model.scenePresses);
    SDL_RenderDebugText(renderer, 48.0f, 68.0f, "Click scene to move ball; UI must consume its clicks.");
#endif
}

} // namespace lab
