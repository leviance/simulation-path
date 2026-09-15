#ifndef LAB_CHECKPOINT
#define LAB_CHECKPOINT 6
#endif
#if LAB_CHECKPOINT >= 1
#include "lab.hpp"
#endif
#include <SDL3/SDL.h>
#if LAB_CHECKPOINT >= 5
#include <algorithm>
#endif
#if LAB_CHECKPOINT >= 1
#include <cmath>
#endif
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <vector>

namespace {
constexpr int kCanvasWidth = 960;
constexpr int kCanvasHeight = 540;
#if LAB_CHECKPOINT >= 5
constexpr int kMinimumRadius = 2;
constexpr int kMaximumRadius = 64;
#endif
std::uint32_t rgba(std::uint8_t red, std::uint8_t green, std::uint8_t blue, std::uint8_t alpha = 255) {
    return (std::uint32_t(red) << 24) | (std::uint32_t(green) << 16) | (std::uint32_t(blue) << 8) | alpha;
}
#if LAB_CHECKPOINT >= 1
void putPixel(std::vector<std::uint32_t>& pixels, int x, int y, std::uint32_t color) {
    if (x < 0 || y < 0 || x >= kCanvasWidth || y >= kCanvasHeight) {
        return;
    }
    pixels[std::size_t(y) * kCanvasWidth + std::size_t(x)] = color;
}
#endif
#if LAB_CHECKPOINT >= 1
void stampPoint(std::vector<std::uint32_t>& pixels, lab::Point point, std::uint32_t color) {
    putPixel(pixels, int(std::lround(point.x)), int(std::lround(point.y)), color);
}
#endif
#if LAB_CHECKPOINT >= 2
void stampCircle(std::vector<std::uint32_t>& pixels, lab::Point center, int radius, std::uint32_t color) {
    const int centerX = int(std::lround(center.x));
    const int centerY = int(std::lround(center.y));
    for (int dy = -radius; dy <= radius; ++dy) {
        for (int dx = -radius; dx <= radius; ++dx) {
            if (dx * dx + dy * dy <= radius * radius) {
                putPixel(pixels, centerX + dx, centerY + dy, color);
            }
        }
    }
}
#endif
} // namespace

int main() {
    // Setup: tạo SDL resources trước khi cấp phát canvas ở phía CPU.
    if (!SDL_Init(SDL_INIT_VIDEO)) {
        std::cerr << "SDL_Init failed: " << SDL_GetError() << '\n';
        return EXIT_FAILURE;
    }
    SDL_Window* window = SDL_CreateWindow("Project 03 - Mini Paint", kCanvasWidth, kCanvasHeight, 0);
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
    SDL_Texture* texture = SDL_CreateTexture(renderer, SDL_PIXELFORMAT_RGBA8888, SDL_TEXTUREACCESS_STREAMING, kCanvasWidth, kCanvasHeight);
    if (!texture) {
        std::cerr << "Texture creation failed: " << SDL_GetError() << '\n';
        SDL_DestroyRenderer(renderer);
        SDL_DestroyWindow(window);
        SDL_Quit();
        return EXIT_FAILURE;
    }
    const std::uint32_t background = rgba(17, 24, 43);
    std::vector<std::uint32_t> pixels(std::size_t(kCanvasWidth) * std::size_t(kCanvasHeight), background);

    // State của một stroke phải được giữ lại giữa nhiều mouse event.
    bool running = true;
    bool failed = false;
#if LAB_CHECKPOINT >= 1
    bool drawing = false;
    lab::Point previous{};
    std::uint32_t color = rgba(83, 240, 174);
#if LAB_CHECKPOINT >= 2
    int radius = 12;
#endif
#endif

    // Event loop cập nhật canvas; phần render chỉ trình bày pixels hiện tại.
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
#if LAB_CHECKPOINT >= 5
                if (!event.key.repeat && event.key.key == SDLK_C) {
                    std::fill(pixels.begin(), pixels.end(), background);
                }
                if (!event.key.repeat && event.key.key == SDLK_1) {
                    color = rgba(83, 240, 174);
                }
                if (!event.key.repeat && event.key.key == SDLK_2) {
                    color = rgba(49, 87, 228);
                }
                if (!event.key.repeat && event.key.key == SDLK_LEFTBRACKET) {
                    radius = std::max(kMinimumRadius, radius - 2);
                }
                if (!event.key.repeat && event.key.key == SDLK_RIGHTBRACKET) {
                    radius = std::min(kMaximumRadius, radius + 2);
                }
#endif
            }
#if LAB_CHECKPOINT >= 1
            if (event.type == SDL_EVENT_MOUSE_BUTTON_DOWN && event.button.button == SDL_BUTTON_LEFT) {
                drawing = true;
                previous = {event.button.x, event.button.y};
#if LAB_CHECKPOINT >= 2
                stampCircle(pixels, previous, radius, color);
#else
                stampPoint(pixels, previous, color);
#endif
                if (!SDL_CaptureMouse(true)) {
                    std::cerr << "Mouse capture failed: " << SDL_GetError() << '\n';
                }
            }
            if (event.type == SDL_EVENT_MOUSE_BUTTON_UP && event.button.button == SDL_BUTTON_LEFT) {
                drawing = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_WINDOW_FOCUS_LOST) {
                drawing = false;
                SDL_CaptureMouse(false);
            }
            if (event.type == SDL_EVENT_MOUSE_MOTION && drawing) {
                const lab::Point current{event.motion.x, event.motion.y};
#if LAB_CHECKPOINT >= 4
                const double spacing = double(radius) * 0.8;
                for (lab::Point point : lab::sampleStroke(previous, current, spacing)) {
                    stampCircle(pixels, point, radius, color);
                }
#else
#if LAB_CHECKPOINT >= 3
// Checkpoint 03 intentionally exposes gaps between mouse samples.
#endif
#if LAB_CHECKPOINT >= 2
                stampCircle(pixels, current, radius, color);
#else
                stampPoint(pixels, current, color);
#endif
#endif
                previous = current;
            }
#endif
        }
        if (!running) {
            break;
        }
        if (!SDL_UpdateTexture(texture, nullptr, pixels.data(), kCanvasWidth * int(sizeof(std::uint32_t)))) {
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
        SDL_Delay(1);
    }

    // Texture phụ thuộc renderer, renderer phụ thuộc window.
    SDL_DestroyTexture(texture);
    SDL_DestroyRenderer(renderer);
    SDL_DestroyWindow(window);
    SDL_Quit();
    if (failed) {
        return EXIT_FAILURE;
    }
    return EXIT_SUCCESS;
}
