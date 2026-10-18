#pragma once
#include "framebuffer.hpp"
#include <SDL3/SDL.h>

namespace lab {
// Texture chỉ trình bày ảnh CPU; nearest giữ rõ ô pixel khi ảnh được phóng to.
inline SDL_Texture* createFramebufferTexture(SDL_Renderer* renderer) {
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, Framebuffer::width, Framebuffer::height);
    if (!texture) {
        return nullptr;
    }
    if (!SDL_SetTextureBlendMode(texture, SDL_BLENDMODE_NONE)) {
        SDL_DestroyTexture(texture);
        return nullptr;
    }
    if (!SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST)) {
        SDL_DestroyTexture(texture);
        return nullptr;
    }
    return texture;
}

inline bool uploadFramebuffer(SDL_Texture* texture, const Framebuffer& framebuffer) {
    const int pitch = Framebuffer::width * static_cast<int>(sizeof(std::uint32_t));
    return SDL_UpdateTexture(texture, nullptr, framebuffer.pixels.data(), pitch);
}

inline bool presentFramebuffer(SDL_Renderer* renderer, SDL_Texture* texture) {
    if (!SDL_RenderClear(renderer)) {
        return false;
    }
    if (!SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
        return false;
    }
    return SDL_RenderPresent(renderer);
}
} // namespace lab
