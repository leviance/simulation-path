#pragma once
#include "display.hpp"
#include "layout.hpp"
#include <SDL3/SDL.h>
#include <cstring>

namespace slices {
constexpr int viewWidth = 900;
constexpr int viewHeight = 660;

#if LAB_CHECKPOINT >= 1
// Write every byte of each locked row; pitch is not assumed to equal width*4.
inline bool upload(SDL_Texture* texture, const Image& image) {
    void* pixels = nullptr;
    int pitch = 0;
    if (!SDL_LockTexture(texture, nullptr, &pixels, &pitch))
        return false;
    for (int row = 0; row < Image::side; ++row) {
        auto* destination = static_cast<std::uint8_t*>(pixels) + row * pitch;
        const auto* source = image.rgba.data() + row * Image::side * 4;
        std::memcpy(destination, source, Image::side * 4);
    }
    SDL_UnlockTexture(texture);
    return true;
}

inline bool drawSlice(SDL_Renderer* renderer, SDL_Texture* texture, const Grid& grid, int view, [[maybe_unused]] Point cursor, bool threeViews, bool active) {
    const Rect rect = fitSlice(grid, view, panelRect(view, viewWidth, viewHeight, threeViews));
    const SDL_FRect destination{static_cast<float>(rect.x), static_cast<float>(rect.y), static_cast<float>(rect.width), static_cast<float>(rect.height)};
    if (!SDL_RenderTexture(renderer, texture, nullptr, &destination))
        return false;
    SDL_SetRenderDrawColor(renderer, 90, 100, 125, 255);
    if (active)
        SDL_SetRenderDrawColor(renderer, 100, 225, 180, 255);
    SDL_RenderRect(renderer, &destination);
#if LAB_CHECKPOINT >= 6
    const Axes axes = axesFor(view);
    const double u = (cursor[axes.horizontal] - lower(grid, axes.horizontal)) / (grid.count[axes.horizontal] * grid.spacing[axes.horizontal]);
    const double v = 1 - (cursor[axes.vertical] - lower(grid, axes.vertical)) / (grid.count[axes.vertical] * grid.spacing[axes.vertical]);
    const float x = static_cast<float>(rect.x + u * rect.width);
    const float y = static_cast<float>(rect.y + v * rect.height);
    SDL_SetRenderDrawColor(renderer, 100, 225, 180, 255);
    SDL_RenderLine(renderer, x, destination.y, x, destination.y + destination.h);
    SDL_RenderLine(renderer, destination.x, y, destination.x + destination.w, y);
#endif
    return true;
}
#endif
} // namespace slices
