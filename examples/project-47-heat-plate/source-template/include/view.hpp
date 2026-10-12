#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 8
#endif
#include "field.hpp"
#include <SDL3/SDL.h>

namespace heat {
inline SDL_Color colorFor(double temperature) {
    // Clamp chỉ dành cho màu, không ghi ngược vào Field.
    if (!std::isfinite(temperature)) {
        return {255, 0, 255, 255};
    }
    const double t = std::clamp(temperature, 0.0, 1.0);
    return {
        static_cast<Uint8>(std::lround(20 + 235 * t)),
        static_cast<Uint8>(std::lround(35 + 175 * t)),
        static_cast<Uint8>(std::lround(90 - 50 * t)),
        255};
}

#if LAB_CHECKPOINT >= 1
inline bool drawField(SDL_Renderer* renderer, const Field& field) {
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            const SDL_Color color = colorFor(field.current[field.index(x, y)]);
            if (!SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a)) {
                return false;
            }
            const SDL_FRect cell{static_cast<float>(x), static_cast<float>(y), 1.0F, 1.0F};
            if (!SDL_RenderFillRect(renderer, &cell)) {
                return false;
            }
        }
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 2
inline bool mouseCell(SDL_Renderer* renderer, const Field& field, float mouseX, float mouseY, int& x, int& y) {
    float logicalX = 0;
    float logicalY = 0;
    if (!SDL_RenderCoordinatesFromWindow(renderer, mouseX, mouseY, &logicalX, &logicalY)) {
        return false;
    }
    if (!std::isfinite(logicalX) || !std::isfinite(logicalY) || logicalX < 0 || logicalY < 0 || logicalX >= field.width || logicalY >= field.height) {
        return false;
    }
    x = static_cast<int>(std::floor(logicalX));
    y = static_cast<int>(std::floor(logicalY));
    return true;
}
#endif
} // namespace heat
