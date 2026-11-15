#pragma once

#include "layout.hpp"
#include "pixels.hpp"
#include "sdl_resources.hpp"

namespace sand {

inline const char* materialName(Cell material) {
    if (material == Cell::Sand) {
        return "SAND";
    }
    if (material == Cell::Water) {
        return "WATER";
    }
    if (material == Cell::Wall) {
        return "WALL";
    }
    return "EMPTY";
}

inline const char* brushName(Cell material) {
    if (material == Cell::Empty) {
        return "ERASE";
    }
    return materialName(material);
}

inline void setColor(SDL_Renderer* renderer, const Rgba& color) {
    requireSdl(SDL_SetRenderDrawColor(renderer, color[0], color[1], color[2], color[3]), "draw color");
}

#if LAB_CHECKPOINT >= 1
inline void drawGrid(SDL_Renderer* renderer, const Grid& grid) {
    for (int y = 0; y < grid.height; ++y) {
        for (int x = 0; x < grid.width; ++x) {
            const Cell material = grid.at(x, y);
            if (material == Cell::Empty) {
                continue;
            }
            setColor(renderer, colorFor(material));
            const SDL_FRect rectangle{static_cast<float>(x), static_cast<float>(y), 1.0F, 1.0F};
            requireSdl(SDL_RenderFillRect(renderer, &rectangle), "draw cell");
        }
    }
}
#endif

#if LAB_CHECKPOINT >= 2
inline bool mouseCell(SDL_Renderer* renderer, const Grid& grid, float windowX, float windowY, int& x, int& y, bool showcase = false) {
    float logicalX = 0;
    float logicalY = 0;
    if (!SDL_RenderCoordinatesFromWindow(renderer, windowX, windowY, &logicalX, &logicalY)) {
        return false;
    }
    return logicalCell(grid, logicalX, logicalY, x, y, showcase);
}
#endif

#if LAB_CHECKPOINT >= 7
inline void createGridTexture(SdlResources& sdl, const Grid& grid) {
    sdl.texture = SDL_CreateTexture(sdl.renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, grid.width, grid.height);
    requireSdl(sdl.texture != nullptr, "create grid texture");
    requireSdl(SDL_SetTextureScaleMode(sdl.texture, SDL_SCALEMODE_NEAREST), "nearest cell scaling");
}

inline void uploadGrid(SDL_Texture* texture, const Grid& grid, bool plain) {
    void* pixels = nullptr;
    int pitch = 0;
    requireSdl(SDL_LockTexture(texture, nullptr, &pixels, &pitch), "lock grid texture");
    const std::size_t rowBytes = static_cast<std::size_t>(grid.width) * 4;
    if (!pixels || pitch < 0 || static_cast<std::size_t>(pitch) < rowBytes) {
        SDL_UnlockTexture(texture);
        throw std::runtime_error("Texture pitch is smaller than a full RGBA row");
    }
    for (int y = 0; y < grid.height; ++y) {
        auto* row = static_cast<std::uint8_t*>(pixels) + static_cast<std::size_t>(y) * static_cast<std::size_t>(pitch);
        writeRgbaRow(grid, y, row, plain);
    }
    SDL_UnlockTexture(texture);
}

inline void drawTexture(SDL_Renderer* renderer, SDL_Texture* texture, const Grid& grid, bool showcase) {
    const Rect view = sceneRect(grid, showcase);
    const SDL_FRect rectangle{view.x, view.y, view.width, view.height};
    requireSdl(SDL_RenderTexture(renderer, texture, nullptr, &rectangle), "draw grid texture");
    setColor(renderer, {65, 82, 109, 255});
    requireSdl(SDL_RenderRect(renderer, &rectangle), "draw scene border");
}
#endif

} // namespace sand
