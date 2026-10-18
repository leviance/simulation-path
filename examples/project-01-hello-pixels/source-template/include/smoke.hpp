#pragma once

#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif

#if LAB_CHECKPOINT >= 6
#include "presentation.hpp"
#include <array>
#include <iostream>

namespace lab {

// Kiểm presentation thật trong cửa sổ ẩn; tự kết thúc sau 12 lần resize.
inline bool runSmoke(SDL_Window* window, SDL_Renderer* renderer) {
    Framebuffer framebuffer;
    SDL_Texture* texture = nullptr;
    const std::array<std::array<int, 2>, 4> sizes{{{320, 240}, {640, 360}, {257, 193}, {960, 540}}};
    bool success = true;

    for (int step = 0; step < 12; ++step) {
        const auto& size = sizes[static_cast<std::size_t>(step) % sizes.size()];
        if (!SDL_SetWindowSize(window, size[0], size[1])) {
            success = false;
            break;
        }
        SDL_PumpEvents();

        int width = 0;
        int height = 0;
        if (!SDL_GetRenderOutputSize(renderer, &width, &height) || !replaceFramebuffer(renderer, framebuffer, texture, width, height)) {
            success = false;
            break;
        }

        const int pattern = step % 4;
        if (pattern == 0) {
            framebuffer.clear(rgba(83, 240, 174));
        } else if (pattern == 1) {
            framebuffer.gradient();
        } else if (pattern == 2) {
            framebuffer.checker(17);
        } else {
            framebuffer.noise(17);
        }

        if (!uploadFramebuffer(texture, framebuffer) || !presentFramebuffer(renderer, texture)) {
            success = false;
            break;
        }
    }

    SDL_DestroyTexture(texture);
    if (success) {
        std::cout << "Project 01 SDL smoke: 12 resizes, all four scenes uploaded and presented\n";
    }
    return success;
}

} // namespace lab
#endif
