#pragma once
#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 7
#endif
#include "grid.hpp"
#include <SDL3/SDL.h>
#include <cmath>

namespace sand {
inline const char* nameFor(Cell material) {
    if (material == Cell::Sand) {
        return "Sand";
    }
    if (material == Cell::Water) {
        return "Water";
    }
    if (material == Cell::Wall) {
        return "Wall";
    }
    return "Empty";
}

inline SDL_Color colorFor(Cell material) {
    if (material == Cell::Wall) {
        return {119, 132, 157, 255};
    }
    if (material == Cell::Sand) {
        return {229, 192, 123, 255};
    }
    if (material == Cell::Water) {
        return {97, 175, 239, 255};
    }
    return {11, 16, 32, 255};
}

#if LAB_CHECKPOINT >= 1
inline bool drawGrid(SDL_Renderer* renderer, const Grid& grid) {
    for (int y = 0; y < grid.height; ++y) {
        for (int x = 0; x < grid.width; ++x) {
            const Cell material = grid.at(x, y);
            if (material == Cell::Empty) {
                continue;
            }
            const SDL_Color color = colorFor(material);
            if (!SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a)) {
                return false;
            }
            const SDL_FRect rectangle{static_cast<float>(x), static_cast<float>(y), 1.0F, 1.0F};
            if (!SDL_RenderFillRect(renderer, &rectangle)) {
                return false;
            }
        }
    }
    return true;
}
#endif

#if LAB_CHECKPOINT >= 2
inline bool mouseCell(SDL_Renderer* renderer, const Grid& grid, float windowX, float windowY, int& x, int& y) {
    float logicalX = 0;
    float logicalY = 0;
    if (!SDL_RenderCoordinatesFromWindow(renderer, windowX, windowY, &logicalX, &logicalY)) {
        return false;
    }
    // Vùng letterbox nằm ngoài lưới; không clamp nó vào ô sát biên.
    if (!std::isfinite(logicalX) || !std::isfinite(logicalY)) {
        return false;
    }
    if (logicalX < 0 || logicalY < 0 || logicalX >= grid.width || logicalY >= grid.height) {
        return false;
    }
    x = static_cast<int>(std::floor(logicalX));
    y = static_cast<int>(std::floor(logicalY));
    return true;
}
#endif
} // namespace sand
