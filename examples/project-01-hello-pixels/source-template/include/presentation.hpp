#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 3
#include "lab.hpp"
#include <SDL3/SDL.h>
#if LAB_CHECKPOINT >= 5
#include <utility>
#endif

namespace lab {

inline SDL_Texture* createFramebufferTexture(SDL_Renderer* renderer, int width, int height) {
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, width, height);
    if (!texture) {
        return nullptr;
    }

    // Copy RGB trực tiếp. Project này lưu alpha nhưng chưa học pha trộn ảnh.
    if (!SDL_SetTextureBlendMode(texture, SDL_BLENDMODE_NONE)) {
        SDL_DestroyTexture(texture);
        return nullptr;
    }
    return texture;
}

inline bool uploadFramebuffer(SDL_Texture* texture, const Framebuffer& framebuffer) {
    const int pitch = framebuffer.width * static_cast<int>(sizeof(std::uint32_t));
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

#if LAB_CHECKPOINT >= 5
inline bool replaceFramebuffer(SDL_Renderer* renderer, Framebuffer& framebuffer, SDL_Texture*& texture, int width, int height) {
    Framebuffer replacement;
    if (!replacement.resize(width, height)) {
        SDL_SetError("Cannot allocate framebuffer (positive dimensions, maximum 16777216 pixels)");
        return false;
    }

    SDL_Texture* replacementTexture = createFramebufferTexture(renderer, width, height);
    if (!replacementTexture) {
        return false;
    }

    // Cặp mới đã sẵn sàng: thay cả hai, rồi mới hủy texture cũ.
    SDL_Texture* previousTexture = texture;
    framebuffer = std::move(replacement);
    texture = replacementTexture;
    SDL_DestroyTexture(previousTexture);
    return true;
}
#endif

} // namespace lab
#endif
