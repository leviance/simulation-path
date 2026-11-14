#pragma once

#include <SDL3/SDL.h>
#include <stdexcept>
#include <string>

namespace sand {

inline void requireSdl(bool success, const char* operation) {
    if (!success) {
        throw std::runtime_error(std::string(operation) + ": " + SDL_GetError());
    }
}

// Bộ khung được cung cấp: dọn đúng thứ tự cả khi một bước khởi tạo thất bại.
struct SdlResources {
    bool initialized = false;
    SDL_Window* window = nullptr;
    SDL_Renderer* renderer = nullptr;
    SDL_Texture* texture = nullptr;

    SdlResources() = default;
    SdlResources(const SdlResources&) = delete;
    SdlResources& operator=(const SdlResources&) = delete;

    ~SdlResources() {
        if (texture) {
            SDL_DestroyTexture(texture);
        }
        if (renderer) {
            SDL_DestroyRenderer(renderer);
        }
        if (window) {
            SDL_DestroyWindow(window);
        }
        if (initialized) {
            SDL_Quit();
        }
    }
};

} // namespace sand
