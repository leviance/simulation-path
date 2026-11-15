#pragma once

#include "layout.hpp"
#include "pixels.hpp"
#include "sdl_resources.hpp"

namespace heat {

inline void setColor(SDL_Renderer* renderer, Rgba color) {
    requireSdl(SDL_SetRenderDrawColor(renderer, color.r, color.g, color.b, color.a), "set draw color");
}

inline void setPresentation(SDL_Renderer* renderer, const Field& field, bool showcase) {
    int width = 1200;
    int height = 860;
    if (showcase) {
        width = field.width;
        height = field.height;
    }
    requireSdl(SDL_SetRenderLogicalPresentation(renderer, width, height, SDL_LOGICAL_PRESENTATION_LETTERBOX), "logical presentation");
}

inline bool mouseCell(SDL_Renderer* renderer, const Field& field, float windowX, float windowY, int& x, int& y, bool showcase) {
    float logicalX = 0;
    float logicalY = 0;
    if (!SDL_RenderCoordinatesFromWindow(renderer, windowX, windowY, &logicalX, &logicalY)) {
        return false;
    }
    return logicalCell(field, logicalX, logicalY, x, y, showcase);
}

#if LAB_CHECKPOINT >= 1
// [snippet draw-grid]
inline void drawGrid(SDL_Renderer* renderer, const Field& field) {
    const Rect view = sceneRect(field, false);
    const float cellWidth = view.width / field.width;
    const float cellHeight = view.height / field.height;
    for (int y = 0; y < field.height; ++y) {
        for (int x = 0; x < field.width; ++x) {
            setColor(renderer, heatColor(field.current[field.index(x, y)]));
            const SDL_FRect rectangle{view.x + x * cellWidth, view.y + y * cellHeight, cellWidth, cellHeight};
            requireSdl(SDL_RenderFillRect(renderer, &rectangle), "draw temperature cell");
        }
    }
}

// [/snippet draw-grid]
#endif

#if LAB_CHECKPOINT >= 7
// [snippet create-texture]
inline void createTexture(SdlResources& sdl) {
    // Reserve capacity cho cả ba preset: đổi độ phân giải không cấp lại GPU resource.
    SDL_Texture* candidate = SDL_CreateTexture(sdl.renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, 256, 256);
    requireSdl(candidate != nullptr, "create temperature texture");
    if (!SDL_SetTextureScaleMode(candidate, SDL_SCALEMODE_NEAREST)) {
        SDL_DestroyTexture(candidate);
        throw std::runtime_error(std::string("nearest sampling: ") + SDL_GetError());
    }
    if (sdl.texture) {
        SDL_DestroyTexture(sdl.texture);
    }
    sdl.texture = candidate;
}

// [/snippet create-texture]

// [snippet upload-grid]
inline void uploadGrid(SDL_Texture* texture, const Field& field, bool experiment, bool showPins) {
    if (field.width > 256 || field.height > 256) {
        throw std::invalid_argument("Viewer texture capacity is 256x256; CPU field limit is separate");
    }
    void* pixels = nullptr;
    int pitch = 0;
    const SDL_Rect region{0, 0, field.width, field.height};
    requireSdl(SDL_LockTexture(texture, &region, &pixels, &pitch), "lock temperature texture region");
    const std::size_t rowBytes = static_cast<std::size_t>(field.width) * 4;
    if (pitch < 0 || static_cast<std::size_t>(pitch) < rowBytes) {
        SDL_UnlockTexture(texture);
        throw std::runtime_error("Texture pitch is shorter than a complete RGBA row");
    }
    auto* bytes = static_cast<std::uint8_t*>(pixels);
    for (int y = 0; y < field.height; ++y) {
        encodeRow(field, y, bytes + static_cast<std::size_t>(y) * static_cast<std::size_t>(pitch), experiment, showPins);
    }
    SDL_UnlockTexture(texture);
}

// [/snippet upload-grid]

// [snippet draw-texture]
inline void drawTexture(SDL_Renderer* renderer, SDL_Texture* texture, const Field& field, bool showcase) {
    const Rect view = sceneRect(field, showcase);
    const SDL_FRect source{0, 0, static_cast<float>(field.width), static_cast<float>(field.height)};
    const SDL_FRect rectangle{view.x, view.y, view.width, view.height};
    requireSdl(SDL_RenderTexture(renderer, texture, &source, &rectangle), "draw temperature texture");
}

// [/snippet draw-texture]
#endif

} // namespace heat
