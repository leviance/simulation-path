#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT >= 2
#include "lab.hpp"
#endif
#include <SDL3/SDL.h>
#include <cstdlib>
#include <iostream>
#if LAB_CHECKPOINT >= 3
#include <cstdint>
#endif
#if LAB_CHECKPOINT >= 5
#include <algorithm>
#include <utility>
#endif
namespace {
constexpr int kInitialWidth = 960;
constexpr int kInitialHeight = 540;
#if LAB_CHECKPOINT >= 3
SDL_Texture* createFramebufferTexture(SDL_Renderer* renderer, int width, int height) {
    return SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, width, height);
}
#endif
#if LAB_CHECKPOINT >= 1
#if LAB_CHECKPOINT <= 2
bool runWindowCheckpoint(SDL_Renderer* renderer) {
    bool running = true;
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN && event.key.key == SDLK_ESCAPE) {
                running = false;
            }
        }
        if (!SDL_SetRenderDrawColor(renderer, 11, 16, 32, 255)) {
            return false;
        }
        if (!SDL_RenderClear(renderer)) {
            return false;
        }
        if (!SDL_RenderPresent(renderer)) {
            return false;
        }
    }
    return true;
}
#endif
#endif
} // namespace

int main() {
    // Khởi tạo SDL trước, sau đó tạo window và renderer theo đúng thứ tự phụ thuộc.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 01 - Hello Pixels", kInitialWidth, kInitialHeight, SDL_WINDOW_RESIZABLE | SDL_WINDOW_HIGH_PIXEL_DENSITY);
    if (!window) {
        std::cerr << "SDL_CreateWindow failed: " << SDL_GetError() << '\n';
        SDL_Quit();
        return EXIT_FAILURE;
    }
    SDL_Renderer* renderer = SDL_CreateRenderer(window, nullptr);
    if (!renderer) {
        std::cerr << "SDL_CreateRenderer failed: " << SDL_GetError() << '\n';
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
#if LAB_CHECKPOINT <= 2
#if LAB_CHECKPOINT == 2
    lab::Framebuffer framebuffer{kInitialWidth, kInitialHeight};
    SDL_SetWindowTitle(window, "Project 01 - Framebuffer owns 518,400 pixels");
#endif
#if LAB_CHECKPOINT >= 1
    const bool failed = !runWindowCheckpoint(renderer);
    if (failed) {
        std::cerr << "Render failed: " << SDL_GetError() << '\n';
    }
#endif
#else

    // Framebuffer và streaming texture luôn có cùng kích thước pixel.
    int framebufferWidth = kInitialWidth;
    int framebufferHeight = kInitialHeight;
    if (!SDL_GetWindowSizeInPixels(window, &framebufferWidth, &framebufferHeight)) {
        std::cerr << "SDL_GetWindowSizeInPixels failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    lab::Framebuffer framebuffer{framebufferWidth, framebufferHeight};
    SDL_Texture* texture = createFramebufferTexture(renderer, framebuffer.width, framebuffer.height);
    if (!texture) {
        std::cerr << "SDL_CreateTexture failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
#if LAB_CHECKPOINT >= 4
    int pattern = 0;
#endif

    // Event loop cập nhật trạng thái trước khi tạo và present frame mới.
    bool running = true;
    bool failed = false;
    while (running) {
        SDL_Event event{};
        while (SDL_PollEvent(&event)) {
            if (event.type == SDL_EVENT_QUIT) {
                running = false;
            }
            if (event.type == SDL_EVENT_KEY_DOWN) {
                if (event.key.key == SDLK_ESCAPE) {
                    running = false;
                }
#if LAB_CHECKPOINT >= 4
                if (event.key.key >= SDLK_1 && event.key.key <= SDLK_3) {
                    pattern = int(event.key.key - SDLK_1);
                }
#endif
            }
#if LAB_CHECKPOINT >= 5
            if (event.type == SDL_EVENT_WINDOW_PIXEL_SIZE_CHANGED) {
                const int newWidth = std::max(1, event.window.data1);
                const int newHeight = std::max(1, event.window.data2);
                lab::Framebuffer newFramebuffer{newWidth, newHeight};
                SDL_Texture* newTexture = createFramebufferTexture(renderer, newWidth, newHeight);
                if (!newTexture) {
                    std::cerr << "Recreate texture failed: " << SDL_GetError() << '\n';
                    failed = true;
                    running = false;
                    break;
                }
                framebuffer = std::move(newFramebuffer);
                SDL_DestroyTexture(texture);
                texture = newTexture;
            }
#endif
        }
        if (!running) {
            break;
        }
#if LAB_CHECKPOINT == 3
        framebuffer.clear(lab::rgba(11, 16, 32));
        const int centerX = framebuffer.width / 2;
        const int centerY = framebuffer.height / 2;
        for (int offset = -20; offset <= 20; ++offset) {
            framebuffer.putPixel(centerX + offset, centerY, lab::rgba(83, 240, 174));
            framebuffer.putPixel(centerX, centerY + offset, lab::rgba(83, 240, 174));
        }
#else
        if (pattern == 0) {
            framebuffer.gradient();
        } else if (pattern == 1) {
            framebuffer.checker();
        } else {
            framebuffer.noise();
        }
#endif
        const int pitch = framebuffer.width * int(sizeof(std::uint32_t));
        if (!SDL_UpdateTexture(texture, nullptr, framebuffer.pixels.data(), pitch)) {
            std::cerr << "SDL_UpdateTexture failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (!SDL_RenderClear(renderer)) {
            std::cerr << "SDL_RenderClear failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (!SDL_RenderTexture(renderer, texture, nullptr, nullptr)) {
            std::cerr << "SDL_RenderTexture failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
        if (!SDL_RenderPresent(renderer)) {
            std::cerr << "SDL_RenderPresent failed: " << SDL_GetError() << '\n';
            failed = true;
            break;
        }
    }

    // Giải phóng tài nguyên theo thứ tự ngược với lúc tạo.
    SDL_DestroyTexture(texture);
#endif

    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
#else
#include <cstdlib>

int main() {
    return EXIT_SUCCESS;
}
#endif
