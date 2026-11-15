#pragma once

#include <SDL3/SDL.h>
#include <stdexcept>
#include <string>

namespace heat {

inline void requireSdl(bool passed, const char* operation) {
    if (!passed) {
        throw std::runtime_error(std::string(operation) + ": " + SDL_GetError());
    }
}

// Khung SDL cung cấp sẵn: giải phóng cả khi một bước giữa chừng ném exception.
struct SdlResources {
    bool initialized = false;
    SDL_Window* window = nullptr;
    SDL_Renderer* renderer = nullptr;
    SDL_Texture* texture = nullptr;

    // Một owner duy nhất; bản sao nông của các con trỏ sẽ giải phóng hai lần.
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

} // namespace heat
