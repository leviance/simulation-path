#pragma once
#include "layout.hpp"
#include <SDL3/SDL.h>
#include <cstdint>
#include <cstring>
#include <string>

namespace slice53 {
// Initialize explicitly so the destructor also runs after a partially failed open().
struct Platform {
    SDL_Window* window = nullptr;
    SDL_Renderer* renderer = nullptr;
    SDL_Texture* scene = nullptr;
    std::array<SDL_Texture*, 3> slices{};

    ~Platform() {
        for (SDL_Texture* texture : slices) SDL_DestroyTexture(texture);
        SDL_DestroyTexture(scene);
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
    }

    // [snippet open-window]
    void open(bool hidden) {
        if (!SDL_Init(SDL_INIT_VIDEO)) throw std::runtime_error(SDL_GetError());
        SDL_WindowFlags flags = SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY;
        if (hidden) flags |= SDL_WINDOW_HIDDEN;
        window = SDL_CreateWindow("Project 53 | Scalar Slice Workbench", logicalWidth, logicalHeight, flags);
        if (!window) throw std::runtime_error(SDL_GetError());
        renderer = SDL_CreateRenderer(window, nullptr);
        if (!renderer) throw std::runtime_error(SDL_GetError());
        if (!SDL_SetRenderLogicalPresentation(renderer, logicalWidth, logicalHeight, SDL_LOGICAL_PRESENTATION_LETTERBOX))
            throw std::runtime_error(SDL_GetError());
        SDL_SetRenderVSync(renderer, 1);
        scene = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, 820, 620);
        if (!scene) throw std::runtime_error(SDL_GetError());
        for (SDL_Texture*& texture : slices) {
            texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA32, SDL_TEXTUREACCESS_STREAMING, 256, 256);
            if (!texture) throw std::runtime_error(SDL_GetError());
            SDL_SetTextureScaleMode(texture, SDL_SCALEMODE_NEAREST);
        }
    }
    // [/snippet open-window]

    // [snippet upload-texture]
    void upload(SDL_Texture* texture, const std::uint32_t* rgba, int width, int height) {
        void* pixels = nullptr;
        int pitch = 0;
        if (!SDL_LockTexture(texture, nullptr, &pixels, &pitch)) throw std::runtime_error(SDL_GetError());
        const int rowBytes = width * 4;
        if (pitch < rowBytes) {
            SDL_UnlockTexture(texture);
            throw std::runtime_error("Texture pitch smaller than a pixel row");
        }
        auto* destination = static_cast<std::uint8_t*>(pixels);
        for (int row = 0; row < height; ++row)
            std::memcpy(destination + row * pitch, rgba + row * width, static_cast<std::size_t>(rowBytes));
        SDL_UnlockTexture(texture);
    }
    // [/snippet upload-texture]

    void capture(const std::string& filename) {
        SDL_Surface* surface = SDL_RenderReadPixels(renderer, nullptr);
        if (!surface) throw std::runtime_error(SDL_GetError());
        bool saved = false;
        if (filename.ends_with(".bmp") || filename.ends_with(".BMP"))
            saved = SDL_SaveBMP(surface, filename.c_str());
        else
            saved = SDL_SavePNG(surface, filename.c_str());
        SDL_DestroySurface(surface);
        if (!saved) throw std::runtime_error(SDL_GetError());
    }
};
} // namespace slice53
